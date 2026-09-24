const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const DEFAULT_API_HOST = 'editor32-normal-sg.capcutapi.com';

const server = http.createServer((req, res) => {
    // 1. Client se aaya hua original Host header lo
    let targetHost = req.headers['host'] || DEFAULT_API_HOST;

    // 2. Agar app ne URL Swap kiya hai (Host mein railway.app aa gaya), toh usko default API host par bhejo
    if (targetHost.includes('railway.app') || targetHost.includes('localhost') || targetHost.includes('127.0.0.1')) {
        targetHost = DEFAULT_API_HOST;
    }

    console.log(`[+] Routing: ${req.method} https://${targetHost}${req.url}`);

    // 3. Request options setup karo
    const options = {
        hostname: targetHost,
        port: 443,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetHost // Target server ko uska asli naam dikhao (Bahut Zaroori)
        }
    };

    // Proxy headers hata do taaki server ko shak na ho
    delete options.headers['x-forwarded-host'];
    delete options.headers['x-forwarded-proto'];
    delete options.headers['x-forwarded-for'];
    delete options.headers['x-real-ip'];

    // 4. Target server ko request forward karo
    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (e) => {
        console.error(`[Proxy Error] ${targetHost} -> ${e.message}`);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Bad Gateway: ' + e.message);
    });

    // 5. Request body (POST data) pipe karo
    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 Truly Dynamic Proxy LIVE on port ${PORT}`);
});
