const corsProxy = require('cors-anywhere');
const crypto = require('crypto');
const https = require('https');
const config = require('./config');
const { log } = require('./utils/logger');
const { normalizeTarget, buildProxyUrl } = require('./utils/proxyUrl');
const { getLocalIP } = require('./utils/network');
const { getHttpsOptions } = require('./utils/cert');

const defaultTarget = normalizeTarget(config.defaultTarget);

const corsServer = corsProxy.createServer({
    originWhitelist: [],
    removeHeaders: ['origin'],
});

const corsRequestHandler = corsServer.listeners('request')[0];

const server = https.createServer(getHttpsOptions(config), (req, res) => {
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
