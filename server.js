const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
// Fallback host agar app ka original host detect na ho (URL swap method use karne par)
const DEFAULT_TARGET_HOST = 'editor32-normal-sg.capcutapi.com'; 

const server = http.createServer((req, res) => {
    // 1. DYNAMIC HOST DETECTION
    // App agar System Proxy ya OkHttp Proxy use kar rahi hai, toh original Host header yahan aayega
    let targetHost = req.headers['host'] || DEFAULT_TARGET_HOST;

    // Agar MT Manager se URL swap kiya hai (Host header mein railway.app aa gaya hai), 
    // toh hum default editor32 par bhej denge (kyunki sab load balancers same backend use karte hain)
    if (targetHost.includes('railway.app') || targetHost.includes('localhost') || targetHost.includes('127.0.0.1')) {
        targetHost = DEFAULT_TARGET_HOST;
    }

    // 2. SECURITY CHECK (Open Proxy Prevent)
    // Sirf capcutapi.com ke requests ko allow karo, warna tera Railway account ban ho jayega
    if (!targetHost.includes('capcutapi.com')) {
        targetHost = DEFAULT_TARGET_HOST;
    }

    // 3. HEADERS CLEANUP & PREPARATION
    const headers = { ...req.headers };
    // ByteDance server ko original Host header hi chahiye, warna 403/404 dega
    headers['host'] = targetHost; 
    
    // Proxy ke apne headers hata do taaki server ko shak na ho
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-proto'];
    delete headers['x-forwarded-for'];
    delete headers['x-real-ip'];

    console.log(`[+] Proxying: ${req.method} https://${targetHost}${req.url}`);

    // 4. HTTPS REQUEST OPTIONS
    const options = {
        hostname: targetHost,
        port: 443,
        path: req.url, // Path aur query params exactly same rahenge
        method: req.method,
        headers: headers
    };

    // 5. FORWARD REQUEST TO BYTE DANCE
    const proxyReq = https.request(options, (proxyRes) => {
        // Response headers aur status code wapas app ko bhejo
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        // Response body (JSON data) pipe karo
        proxyRes.pipe(res, { end: true });
    });

    // 6. ERROR HANDLING
    proxyReq.on('error', (e) => {
        console.error(`[Proxy Error] Target: ${targetHost} | ${e.message}`);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Bad Gateway: ' + e.message);
    });

    // 7. PIPE REQUEST BODY (POST/PUT data)
    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 CapCut GLOBAL Killer Proxy is LIVE on port ${PORT}`);
    console.log(`🎯 Dynamic Routing Enabled for all editor* endpoints!`);
});
