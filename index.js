var port = 8085;
var cors_proxy = require('cors-anywhere');
const https = require('https');
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

// Default host if not available
const defaultHost = '10.212.43.57:9220';

// Create cors-anywhere server
const corsServer = cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    removeHeaders: ['origin'],
});

// Get the request handler from cors-anywhere server
const corsRequestHandler = corsServer.listeners('request')[0];

// Create HTTPS server that wraps cors-anywhere and modifies URLs
const server = https.createServer(httpsOptions, function(req, res) {
    let url = req.url || req.originalUrl || 'unknown';
    
    // Log the original request
    console.log('New request: ' + url);
    
    // Check if URL doesn't have a protocol (no host available)
    // cors-anywhere expects URLs like /http://example.com/path
    if (url && url !== 'unknown' && !url.startsWith('/http://') && !url.startsWith('/https://')) {
        // Remove leading slash if present
        const path = url.startsWith('/') ? url.substring(1) : url;
        const fullUrl = defaultHost + '/' + path;
        req.url = '/' + fullUrl; // cors-anywhere needs leading slash
        console.log('Host not available, using default: "' + fullUrl + '"\n');
    }
    
    // Call cors-anywhere's request handler directly
    if (corsRequestHandler) {
        corsRequestHandler(req, res);
    } else {
        corsServer.emit('request', req, res);
    }
});

const localIP = getLocalIP();
server.listen(port, 'localhost', function() {
    console.log('Running CORS Anywhere on https://' + localIP + ':' + port);
    console.log('Running CORS Anywhere on https://localhost:' + port);
});