# TizenBrew Stream Proxy Module

A TizenBrew service module that runs a local HTTP proxy on your Samsung Tizen TV. The proxy adds custom headers (Referer, Origin) required by certain streaming CDNs.

## Features

- 🔄 **Local Proxy**: Runs directly on the TV at `localhost:8888`
- 🔐 **Header Injection**: Adds Referer and Origin headers for CDNs that require them
- 📺 **M3U8 Rewriting**: Automatically rewrites HLS manifests to route segments through the proxy
- ⚡ **No External Server**: Everything runs locally on the TV

## Supported CDNs

| Domain | Referer Header |
|--------|---------------|
| `merichunidya.com` | `https://vividmosaica.com/` |
| `vividmosaica.com` | `https://vividmosaica.com/` |

## Installation

### Via TizenBrew

1. Open TizenBrew on your Samsung TV
2. Go to "Add Module"
3. Enter the NPM package name: `@custom/stream-proxy`
4. Install and enable the module

### Manual Installation

1. Clone this repository
2. Publish to NPM or a private registry
3. Install via TizenBrew

## Usage in Your App

### Method 1: Direct URL Wrapping

```javascript
// Instead of:
player.load('https://d1.merichunidya.com/hls/stream.m3u8');

// Use:
var proxiedUrl = 'http://localhost:8888/proxy?url=' + encodeURIComponent('https://d1.merichunidya.com/hls/stream.m3u8');
player.load(proxiedUrl);
```

### Method 2: Using the Client Helper

Include `client.js` in your app:

```javascript
// Check if URL needs proxy
if (StreamProxy.needsProxy(url)) {
    url = StreamProxy.proxyUrl(url);
}

player.load(url);
```

### Method 3: With Shaka Player

```javascript
// Configure Shaka to use proxy for specific domains
shaka.net.NetworkingEngine.registerScheme('proxy', function(uri, request) {
    var targetUrl = uri.replace('proxy://', 'https://');
    var proxiedUrl = 'http://localhost:8888/proxy?url=' + encodeURIComponent(targetUrl);
    request.uris = [proxiedUrl];
    return shaka.net.HttpXHRPlugin(proxiedUrl, request, requestType, progressUpdated);
});
```

## Configuration

Edit `service.js` to add more CDN domains:

```javascript
const HEADER_CONFIG = {
    'merichunidya.com': {
        referer: 'https://vividmosaica.com/',
        origin: 'https://vividmosaica.com'
    },
    // Add your domain here
    'your-cdn.com': {
        referer: 'https://allowed-site.com/',
        origin: 'https://allowed-site.com'
    }
};
```

## How It Works

1. **Proxy Request**: Your app sends a request to `localhost:8888/proxy?url=<target>`
2. **Header Addition**: The proxy adds required Referer/Origin headers
3. **M3U8 Rewriting**: For HLS manifests, segment URLs are rewritten to also go through the proxy
4. **Response**: Content is returned to your app with CORS headers

## Troubleshooting

### Proxy Not Starting
- Check if port 8888 is available
- Look at TizenBrew logs for errors

### Still Getting 403 Errors
- Verify the correct Referer is configured for the domain
- Check if the CDN has changed their requirements

### Slow Playback
- The proxy runs locally, so no external latency
- If slow, check TV's network connection

## License

MIT
