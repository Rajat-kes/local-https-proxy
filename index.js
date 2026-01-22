var port = 8085;
var cors_proxy = require('cors-anywhere');
const fs = require('fs');
const os = require('os');
const privateKey = fs.readFileSync('./certificate/server.key', 'utf8');
const certificate = fs.readFileSync('./certificate/server.crt', 'utf8');
const httpsOptions = { key: privateKey, cert: certificate };

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const server = cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    removeHeaders: ['origin'],
    httpsOptions,
});

// Log incoming requests
server.on('request', function(req, res) {
    const url = req.url || req.originalUrl || 'unknown';
    console.log('New request: ' + url);
});

const localIP = getLocalIP();
server.listen(port, 'localhost', function() {
    console.log('Running CORS Anywhere on https://' + localIP + ':' + port);
    console.log('Running CORS Anywhere on https://localhost:' + port);
});