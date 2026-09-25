const http = require('http');
const net = require('net');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Standard HTTP requests ke liye (sirf testing)
  res.writeHead(200);
  res.end('CapCut Proxy is running. Use CONNECT for HTTPS.');
});

// HTTPS Tunneling Handle Karo (Ye sabse zaroori hai)
server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = new URL(`http://${req.url}`);
  
  console.log(`[Tunnel] Connecting to ${hostname}:${port}`);

  const serverSocket = net.connect(port, hostname, () => {
    // Client ko bolo connection ban gaya
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                       'Proxy-agent: Node-Proxy\r\n' +
                       '\r\n');
    
    // Data exchange shuru karo
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  // Error handling
  serverSocket.on('error', (err) => {
    console.error(`[Tunnel Error] ${hostname}: ${err.message}`);
    clientSocket.end();
  });
  clientSocket.on('error', (err) => {
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CapCut HTTPS Tunnel Proxy LIVE on port ${PORT}`);
});
