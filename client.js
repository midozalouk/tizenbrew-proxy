(function () {
    'use strict';

    var PORT = 8888;
    var BASE = 'http://127.0.0.1:' + PORT + '/proxy?url=';

    function proxyUrl(url) {
        return BASE + encodeURIComponent(url);
    }

    window.StreamProxy = {
        proxyUrl: proxyUrl
    };

    console.log('[StreamProxy] Ready on port ' + PORT);
})();
