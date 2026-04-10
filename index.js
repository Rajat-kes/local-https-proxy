const corsProxy = require('cors-anywhere');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const selfsigned = require('selfsigned');

const config = {
    port: Number(process.env.PORT || 8085),
    bindHost: process.env.BIND_HOST || 'localhost',
    defaultTarget: process.env.DEFAULT_TARGET || '10.212.43.57:9220',
    certDir: process.env.CERT_DIR || path.join(__dirname, 'certificate'),
    certKeyPath: process.env.CERT_KEY_PATH || path.join(__dirname, 'certificate', 'server.key'),
    certCrtPath: process.env.CERT_CRT_PATH || path.join(__dirname, 'certificate', 'server.crt'),
};

function nowIso() {
    return new Date().toISOString();
}

function log(level, message, meta) {
    const suffix = meta ? ' ' + JSON.stringify(meta) : '';
    console.log('--------------------------------');
    console.log(`[${nowIso()}] [${level}] ${message}${suffix}`);
    console.log('----------------------------------------------------------------');
}

function getLocalIP() {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch (error) {
        log('WARN', 'Could not read network interfaces. Falling back to localhost.', {
            message: error.message,
        });
    }
    return 'localhost';
}

function normalizeTarget(input) {
    if (!input) return 'http://localhost';
    if (input.startsWith('http://') || input.startsWith('https://')) return input;
    return `http://${input}`;
}

function buildProxyUrl(requestPath, target) {
    const trimmedPath = (requestPath || '').replace(/^\/+/, '');
    if (!trimmedPath) return target;
    return `${target}/${trimmedPath}`;
}

function ensureCertificate() {
    const hasKey = fs.existsSync(config.certKeyPath);
    const hasCert = fs.existsSync(config.certCrtPath);

    if (hasKey && hasCert) {
        log('INFO', 'Using existing certificate files', {
            keyPath: config.certKeyPath,
            certPath: config.certCrtPath,
        });
        return;
    }

    log('WARN', 'Certificate files missing. Generating self-signed certificate.', {
        keyExists: hasKey,
        certExists: hasCert,
    });

    fs.mkdirSync(config.certDir, { recursive: true });

    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
        keySize: 2048,
        days: 825,
        algorithm: 'sha256',
        extensions: [
            {
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' },
                ],
            },
        ],
    });

    fs.writeFileSync(config.certKeyPath, pems.private, 'utf8');
    fs.writeFileSync(config.certCrtPath, pems.cert, 'utf8');

    log('INFO', 'Generated self-signed certificate files', {
        keyPath: config.certKeyPath,
        certPath: config.certCrtPath,
    });
}

function getHttpsOptions() {
    ensureCertificate();
    return {
        key: fs.readFileSync(config.certKeyPath, 'utf8'),
        cert: fs.readFileSync(config.certCrtPath, 'utf8'),
    };
}

const defaultTarget = normalizeTarget(config.defaultTarget);

const corsServer = corsProxy.createServer({
    originWhitelist: [],
    removeHeaders: ['origin'],
});

const corsRequestHandler = corsServer.listeners('request')[0];

const server = https.createServer(getHttpsOptions(), (req, res) => {
    const reqId = crypto.randomBytes(4).toString('hex');
    const startedAt = Date.now();
    const originalUrl = req.url || req.originalUrl || '/';
    let rewrittenUrl = originalUrl;

    if (!originalUrl.startsWith('/http://') && !originalUrl.startsWith('/https://')) {
        const proxyUrl = buildProxyUrl(originalUrl, defaultTarget);
        rewrittenUrl = `/${proxyUrl}`;
        req.url = rewrittenUrl;
    }

    res.on('finish', () => {
        log('REQ', 'Proxy request completed', {
            reqId,
            method: req.method,
            originalUrl,
            proxiedUrl: rewrittenUrl.slice(1),
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
        });
    });

    if (corsRequestHandler) {
        corsRequestHandler(req, res);
    } else {
        corsServer.emit('request', req, res);
    }
});

server.on('error', (error) => {
    log('ERROR', 'HTTPS server error', { message: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
    log('ERROR', 'Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
    log('ERROR', 'Uncaught exception', { message: error.message, stack: error.stack });
});

const localIP = getLocalIP();
server.listen(config.port, config.bindHost, () => {
    log('INFO', 'Proxy server started', {
        bindHost: config.bindHost,
        port: config.port,
        defaultTarget,
    });
    log('INFO', 'Access URLs', {
        localUrl: `https://${localIP}:${config.port}`,
        localhostUrl: `https://localhost:${config.port}`,
    });
});