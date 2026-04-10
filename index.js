const crypto = require("crypto");
const https = require("https");
const httpProxy = require("http-proxy");
const config = require("./config");
const { log } = require("./utils/logger");
const { normalizeTarget } = require("./utils/proxyUrl");
const { getLocalIP } = require("./utils/network");
const { getHttpsOptions } = require("./utils/cert");
const {
  DEFAULT_MAX_LOG_BODY_BYTES,
  buildTargetUrl,
  buildCurlCommand,
  captureBodyForLogging,
  buildForwardedHeaders,
} = require("./utils/curlLog");

const defaultTarget = normalizeTarget(config.defaultTarget);

const proxy = httpProxy.createProxyServer({
  target: defaultTarget,
  // Only replace host for upstream; keep method, path, query, body, and incoming headers.
  changeOrigin: true,
  xfwd: false,
});

const server = https.createServer(getHttpsOptions(config), (req, res) => {
  const reqId = crypto.randomBytes(4).toString("hex");
  const startedAt = Date.now();
  const originalUrl = req.url || req.originalUrl || "/";
  const proxiedUrl = buildTargetUrl(defaultTarget, originalUrl);
  const getBodyCapture = captureBodyForLogging(req, DEFAULT_MAX_LOG_BODY_BYTES);

  res.on("finish", () => {
    const targetHost = new URL(defaultTarget).host;
    const forwardedHeaders = buildForwardedHeaders(req.headers, targetHost);
    const { bodyBuffer, bodyTruncated } = getBodyCapture();
    const curl = buildCurlCommand({
      method: req.method,
      url: proxiedUrl,
      headers: forwardedHeaders,
      bodyBuffer,
      bodyTruncated,
      maxBodyBytes: DEFAULT_MAX_LOG_BODY_BYTES,
    });

    log("REQ", "Proxy request completed", {
      reqId,
      method: req.method,
      originalUrl,
      proxiedUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
    console.log(curl);
  });

  proxy.web(req, res, { target: defaultTarget });
});

proxy.on("error", (error, req, res) => {
  log("ERROR", "Proxy request error", {
    method: req && req.method,
    url: req && req.url,
    target: defaultTarget,
    message: error.message,
    stack: error.stack,
  });

  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify({ error: "Bad gateway", message: error.message }));
});

server.on("error", (error) => {
  log("ERROR", "HTTPS server error", {
    message: error.message,
    stack: error.stack,
  });
});

process.on("unhandledRejection", (reason) => {
  log("ERROR", "Unhandled promise rejection", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  log("ERROR", "Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
});

const localIP = getLocalIP();
server.listen(config.port, config.bindHost, () => {
  log("INFO", "Proxy server started", {
    bindHost: config.bindHost,
    port: config.port,
    defaultTarget,
  });
  log("INFO", "Access URLs", {
    localUrl: `https://${localIP}:${config.port}`,
    localhostUrl: `https://localhost:${config.port}`,
  });
});
