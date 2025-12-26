/**
 * TizenBrew Stream Proxy - Client Helper
 * 
 * This file is injected into the target website (if using site mod mode)
 * or can be imported into your app to use the proxy.
 * 
 * The proxy runs on localhost:8888 on the Tizen TV.
 */

(function () {
    'use strict';

    var PROXY_PORT = 8888;
    var PROXY_BASE = 'http://localhost:' + PROXY_PORT + '/proxy?url=';

    // Domains that should be proxied
    var PROXY_DOMAINS = [
        'merichunidya.com',
        'vividmosaica.com'
    ];

    /**
     * Check if a URL needs to be proxied
     */
    function needsProxy(url) {
        if (!url) return false;
        for (var i = 0; i < PROXY_DOMAINS.length; i++) {
            if (url.indexOf(PROXY_DOMAINS[i]) > -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Wrap a URL with the proxy
     */
    function proxyUrl(url) {
        if (!needsProxy(url)) return url;
        return PROXY_BASE + encodeURIComponent(url);
    }

    /**
     * Check if the proxy service is running
     */
    function checkProxyHealth(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', 'http://localhost:' + PROXY_PORT + '/proxy?url=' + encodeURIComponent('https://google.com'), true);
        xhr.timeout = 3000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                callback(xhr.status !== 0);
            }
        };
        xhr.onerror = function () {
            callback(false);
        };
        xhr.ontimeout = function () {
            callback(false);
        };
        xhr.send();
    }

    // Expose to global scope
    window.StreamProxy = {
        PROXY_PORT: PROXY_PORT,
        PROXY_BASE: PROXY_BASE,
        PROXY_DOMAINS: PROXY_DOMAINS,
        needsProxy: needsProxy,
        proxyUrl: proxyUrl,
        checkProxyHealth: checkProxyHealth
    };

    console.log('[StreamProxy] Client helper loaded');
    console.log('[StreamProxy] Proxy URL: ' + PROXY_BASE);
})();
