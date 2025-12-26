/**
 * TizenBrew Stream Proxy Service
 * 
 * This service runs a local HTTP proxy server that adds custom headers
 * (Referer, Origin) to requests for streaming CDNs that require them.
 * 
 * Usage: The proxy runs on port 8888 on the TV's localhost.
 * In your app, use: http://localhost:8888/proxy?url=<encoded_url>
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8888;

// Header configurations for different CDN domains
const HEADER_CONFIG = {
    'merichunidya.com': {
        referer: 'https://vividmosaica.com/',
        origin: 'https://vividmosaica.com'
    },
    'vividmosaica.com': {
        referer: 'https://vividmosaica.com/',
        origin: 'https://vividmosaica.com'
    }
    // Add more domains as needed
};

/**
 * Get the headers to add for a given URL
 */
function getHeadersForUrl(targetUrl) {
    for (const domain in HEADER_CONFIG) {
        if (targetUrl.indexOf(domain) > -1) {
            return HEADER_CONFIG[domain];
        }
    }
    // Default headers
    return {
        referer: '',
        origin: ''
    };
}

/**
 * Check if URL is an M3U8 manifest
 */
function isM3u8(targetUrl) {
    return targetUrl.indexOf('.m3u8') > -1;
}

/**
 * Rewrite M3U8 content to proxy all segment URLs
 */
function rewriteM3u8(content, baseUrl) {
    var lines = content.split('\n');
    var newLines = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        // Skip empty lines
        if (!line) {
            newLines.push(line);
            continue;
        }

        // Handle EXT-X-KEY with URI
        if (line.indexOf('#EXT-X-KEY') === 0) {
            var uriMatch = line.match(/URI="([^"]+)"/);
            if (uriMatch) {
                try {
                    var keyUrl = new url.URL(uriMatch[1], baseUrl).href;
                    var proxiedKeyUrl = 'http://localhost:' + PORT + '/proxy?url=' + encodeURIComponent(keyUrl);
                    line = line.replace(uriMatch[0], 'URI="' + proxiedKeyUrl + '"');
                } catch (e) { }
            }
            newLines.push(line);
            continue;
        }

        // Handle EXT-X-MAP with URI
        if (line.indexOf('#EXT-X-MAP') === 0) {
            var mapMatch = line.match(/URI="([^"]+)"/);
            if (mapMatch) {
                try {
                    var mapUrl = new url.URL(mapMatch[1], baseUrl).href;
                    var proxiedMapUrl = 'http://localhost:' + PORT + '/proxy?url=' + encodeURIComponent(mapUrl);
                    line = line.replace(mapMatch[0], 'URI="' + proxiedMapUrl + '"');
                } catch (e) { }
            }
            newLines.push(line);
            continue;
        }

        // Handle other comment lines
        if (line.indexOf('#') === 0) {
            newLines.push(line);
            continue;
        }

        // Handle segment URLs (non-comment lines)
        try {
            var absoluteUrl = new url.URL(line, baseUrl).href;
            var proxiedUrl = 'http://localhost:' + PORT + '/proxy?url=' + encodeURIComponent(absoluteUrl);
            newLines.push(proxiedUrl);
        } catch (e) {
            // Not a valid URL, keep as is
            newLines.push(line);
        }
    }

    return newLines.join('\n');
}

/**
 * Create the proxy server
 */
var server = http.createServer(function (req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse request URL
    var reqUrl = url.parse(req.url, true);
    var targetUrl = reqUrl.query.url;

    if (!targetUrl) {
        res.writeHead(400);
        res.end('Missing url parameter. Usage: /proxy?url=<encoded_url>');
        return;
    }

    // Decode URL if needed
    try {
        targetUrl = decodeURIComponent(targetUrl);
    } catch (e) { }

    console.log('[PROXY] ' + req.method + ' ' + targetUrl.substring(0, 60) + '...');

    try {
        var parsed = url.parse(targetUrl);
        var protocol = parsed.protocol === 'https:' ? https : http;
        var headers = getHeadersForUrl(targetUrl);

        var options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.path,
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.5) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.5 TV Safari/538.1',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            rejectUnauthorized: false
        };

        // Add Referer and Origin if configured
        if (headers.referer) {
            options.headers['Referer'] = headers.referer;
        }
        if (headers.origin) {
            options.headers['Origin'] = headers.origin;
        }

        var proxyReq = protocol.request(options, function (proxyRes) {
            var status = proxyRes.statusCode;
            console.log('[PROXY] ' + (status === 200 ? '✓' : '✗') + ' ' + status);

            // For M3U8 files, buffer and rewrite
            if (isM3u8(targetUrl) && status === 200) {
                var body = '';
                proxyRes.on('data', function (chunk) {
                    body += chunk.toString();
                });
                proxyRes.on('end', function () {
                    var rewritten = rewriteM3u8(body, targetUrl);
                    console.log('[PROXY] Rewrote M3U8');

                    res.writeHead(status, {
                        'Content-Type': 'application/vnd.apple.mpegurl',
                        'Access-Control-Allow-Origin': '*',
                        'Content-Length': Buffer.byteLength(rewritten)
                    });
                    res.end(rewritten);
                });
                return;
            }

            // For other content, pipe through
            var resHeaders = {};
            for (var key in proxyRes.headers) {
                resHeaders[key] = proxyRes.headers[key];
            }
            resHeaders['Access-Control-Allow-Origin'] = '*';

            res.writeHead(status, resHeaders);

            if (req.method === 'HEAD') {
                res.end();
            } else {
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', function (e) {
            console.log('[PROXY] Error: ' + e.message);
            res.writeHead(502);
            res.end('Proxy error: ' + e.message);
        });

        proxyReq.setTimeout(30000, function () {
            proxyReq.destroy();
            res.writeHead(504);
            res.end('Timeout');
        });

        proxyReq.end();

    } catch (e) {
        console.log('[PROXY] Error: ' + e.message);
        res.writeHead(400);
        res.end('Invalid URL: ' + e.message);
    }
});

// Start the server
server.listen(PORT, function () {
    console.log('=========================================');
    console.log('TizenBrew Stream Proxy Service Started');
    console.log('=========================================');
    console.log('Port: ' + PORT);
    console.log('');
    console.log('Usage in your app:');
    console.log('  http://localhost:' + PORT + '/proxy?url=<encoded_url>');
    console.log('');
    console.log('Configured domains:');
    for (var domain in HEADER_CONFIG) {
        console.log('  - ' + domain + ' -> Referer: ' + HEADER_CONFIG[domain].referer);
    }
    console.log('=========================================');
});

// Handle errors
server.on('error', function (e) {
    console.log('[PROXY] Server error: ' + e.message);
});
