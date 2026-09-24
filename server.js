const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const TARGET_HOST = 'editor32-normal-sg.capcutapi.com';
const TARGET_PORT = 443;

const server = http.createServer((req, res) => {
    // 1. Original headers ko copy karo (X-Gorgon, X-Argus, tdid sab yahi se jayega)
    const headers = { ...req.headers };

    // 2. CRITICAL FIX: ByteDance server 'Host' header check karta hai.
    // Hum usko original CapCut domain par force karenge, warna 403/404 aayega.
    headers['host'] = TARGET_HOST;
    
    // Proxy ke apne headers hata do taaki server ko shak na ho
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-proto'];
    delete headers['x-forwarded-for'];

    console.log(`[+] Proxying: ${req.method} https://${TARGET_HOST}${req.url}`);

    // 3. HTTPS request options setup karo
    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: req.url, // Query parameters aur path exactly same rahenge
        method: req.method,
        headers: headers
    };

    // 4. Target server ko request bhejo
    const proxyReq = https.request(options, (proxyRes) => {
        // Response headers aur status code wapas app ko bhejo
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        // Response body (JSON data) pipe karo
        proxyRes.pipe(res, { end: true });
    });

    // 5. Agar target server se error aaye
    proxyReq.on('error', (e) => {
        console.error(`[Proxy Error] ${e.message}`);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Bad Gateway: ' + e.message);
    });

    // 6. Request body (POST data / JSON payload) ko target server par pipe karo
    // Ye sabse zaroori hai, warna POST requests fail ho jayengi
    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 CapCut Killer Proxy is LIVE on port ${PORT}`);
    console.log(`🎯 Targeting: https://${TARGET_HOST}`);
});
