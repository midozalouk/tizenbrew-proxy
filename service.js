/**
 * TizenBrew Stream Proxy (Node.js)
 * - Custom Referer / Origin
 * - AVPlay Range support
 * - Watchdog safe
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 8888;

/* === DOMAIN HEADER CONFIG === */
const HEADER_CONFIG = {
    'merichunidya.com': {
        referer: 'https://vividmosaica.com/',
        origin: 'https://vividmosaica.com'
    },
    'vividmosaica.com': {
        referer: 'https://vividmosaica.com/',
        origin: 'https://vividmosaica.com'
    }
};

function getHeaders(targetUrl) {
    for (const d in HEADER_CONFIG) {
        if (targetUrl.includes(d)) return HEADER_CONFIG[d];
    }
    return {};
}

const server = http.createServer((req, res) => {

    /* === CORS === */
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', ts: Date.now() }));
    }

    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const target = parsed.searchParams.get('url');

    if (!target) {
        res.writeHead(400);
        return res.end('Missing url parameter');
    }

    let targetUrl;
    try {
        targetUrl = new URL(decodeURIComponent(target));
    } catch {
        res.writeHead(400);
        return res.end('Invalid URL');
    }

    const proto = targetUrl.protocol === 'https:' ? https : http;
    const hdr = getHeaders(targetUrl.href);

    const options = {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (SMART-TV; Tizen)',
            'Accept': '*/*',
            'Connection': 'close'
        },
        rejectUnauthorized: false
    };

    /* === AVPlay Range Support === */
    if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
    }

    if (hdr.referer) options.headers['Referer'] = hdr.referer;
    if (hdr.origin) options.headers['Origin'] = hdr.origin;

    const proxyReq = proto.request(options, proxyRes => {

        /* === Forward status & headers (important for 206) === */
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        if (req.method === 'HEAD') return res.end();

        proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
        res.writeHead(502);
        res.end('Proxy error: ' + err.message);
    });

    proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        res.writeHead(504);
        res.end('Timeout');
    });

    proxyReq.end();
});

server.listen(PORT, () => {
    console.log('====================================');
    console.log('TizenBrew Stream Proxy (Node)');
    console.log('Listening on port', PORT);
    console.log('====================================');
});
