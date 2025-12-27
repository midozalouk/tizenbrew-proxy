# TizenBrew Stream Proxy (Node.js)

Local Node.js proxy service for Samsung Tizen TVs.

## Features
- Custom Referer / Origin headers
- AVPlay seeking (Range support)
- Auto-restart watchdog
- No external server required

## Installation

1. Open **TizenBrew**
2. Add repository:
   https://github.com/midozalouk/tizenbrew-proxy
3. Refresh packages
4. Enable **Stream Proxy**

## Usage (AVPlay)

```js
avplay.open(
  StreamProxy.proxyUrl("https://cdn.example.com/stream.m3u8")
);
avplay.play();
