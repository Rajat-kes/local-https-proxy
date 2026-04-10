const DEFAULT_MAX_LOG_BODY_BYTES = 1024 * 1024;
const SKIP_HEADER_KEYS = new Set([
  "host",
  "content-length",
  "connection",
  "accept-encoding",
]);

function shSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildTargetUrl(base, path) {
  try {
    return new URL(path || "/", base).toString();
  } catch (error) {
    return `${base}${path || "/"}`;
  }
}

function isTextLike(contentType = "") {
  const value = String(contentType).toLowerCase();
  return (
    value.startsWith("text/") ||
    value.includes("json") ||
    value.includes("xml") ||
    value.includes("x-www-form-urlencoded") ||
    value.includes("javascript")
  );
}

function buildCurlCommand({
  method,
  url,
  headers,
  bodyBuffer,
  bodyTruncated,
  maxBodyBytes = DEFAULT_MAX_LOG_BODY_BYTES,
}) {
  const parts = [
    "curl",
    "-X",
    shSingleQuote(method || "GET"),
    shSingleQuote(url),
  ];
  let cookieValue;
  let hasAcceptEncoding = false;

  Object.entries(headers || {}).forEach(([key, rawValue]) => {
    if (rawValue === undefined) return;
    const lowerKey = key.toLowerCase();
    if (lowerKey === "accept-encoding") hasAcceptEncoding = true;
    if (SKIP_HEADER_KEYS.has(lowerKey)) return;
    if (lowerKey === "cookie") {
      cookieValue = Array.isArray(rawValue) ? rawValue.join("; ") : rawValue;
      return;
    }
    if (Array.isArray(rawValue)) {
      rawValue.forEach((item) =>
        parts.push("-H", shSingleQuote(`${key}: ${item}`)),
      );
      return;
    }
    parts.push("-H", shSingleQuote(`${key}: ${rawValue}`));
  });

  if (cookieValue) {
    parts.push("-b", shSingleQuote(cookieValue));
  }

  if (hasAcceptEncoding) {
    parts.push("--compressed");
  }

  if (String(url).toLowerCase().startsWith("https://")) {
    parts.push("--insecure");
  }

  if (bodyBuffer && bodyBuffer.length > 0) {
    if (isTextLike(headers["content-type"])) {
      parts.push("--data-raw", shSingleQuote(bodyBuffer.toString("utf8")));
    } else {
      parts.push(
        "--data-binary",
        shSingleQuote("[binary body omitted from log]"),
      );
    }
  }

  const command = parts.join(" ");
  if (bodyTruncated)
    return `${command} # body truncated at ${maxBodyBytes} bytes`;
  return command;
}

function captureBodyForLogging(req, maxBodyBytes = DEFAULT_MAX_LOG_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  let captured = 0;
  let truncated = false;

  req.on("data", (chunk) => {
    if (!Buffer.isBuffer(chunk)) return;
    total += chunk.length;
    if (truncated) return;

    const remaining = maxBodyBytes - captured;
    if (remaining <= 0) {
      truncated = true;
      return;
    }

    if (chunk.length > remaining) {
      chunks.push(chunk.subarray(0, remaining));
      captured += remaining;
      truncated = true;
      return;
    }

    chunks.push(chunk);
    captured += chunk.length;
  });

  return () => ({
    bodyBuffer: chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0),
    bodyTruncated: truncated || total > maxBodyBytes,
  });
}

function buildForwardedHeaders(headers, targetHost) {
  return { ...headers, host: targetHost };
}

module.exports = {
  DEFAULT_MAX_LOG_BODY_BYTES,
  buildTargetUrl,
  buildCurlCommand,
  captureBodyForLogging,
  buildForwardedHeaders,
};
