# Local HTTPS Proxy

Development proxy that terminates **TLS** locally and forwards traffic to an **HTTP or HTTPS** upstream. It removes **mixed-content** issues when a secure frontend must talk to an insecure API during local development.

Built with [`http-proxy`](https://github.com/http-party/node-http-proxy) as a transparent reverse proxy (method/path/query/body/headers are forwarded, with upstream host switched to target).

---

## Table of contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Integrating your application](#integrating-your-application)
- [CORS behavior](#cors-behavior)
- [TLS certificates](#tls-certificates)
- [Project structure](#project-structure)
- [Security notice](#security-notice)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

| Capability | Description |
|------------|-------------|
| HTTPS entrypoint | Serves `https://<host>:<port>` so browsers treat calls as secure. |
| Upstream routing | Forwards to configurable target (`DEFAULT_TARGET`) while preserving incoming path and query. |
| Certificate bootstrap | Generates a self-signed key pair if certificate files are absent. |
| Observability | Structured logs + copy-ready curl for each proxied request. |
| Developer workflow | `nodemon` reloads the process when source or certificate files change. |

**Request flow (conceptual):**

```text
Client (HTTPS app)  →  This proxy (HTTPS)  →  Upstream API (HTTP/HTTPS)
```

---

## Prerequisites

- **Node.js** 18 LTS or newer  
- **npm** (bundled with Node.js)

---

## Installation

**SSH (recommended if your GitHub SSH key is configured):**

```bash
git clone git@github.com:Rajat-kes/local-https-proxy.git
cd local-https-proxy
npm ci
```

**HTTPS:**

```bash
git clone https://github.com/Rajat-kes/local-https-proxy.git
cd local-https-proxy
npm ci
```

Use `npm install` instead of `npm ci` if you do not rely on a lockfile for reproducible installs.

**Repository:** [github.com/Rajat-kes/local-https-proxy](https://github.com/Rajat-kes/local-https-proxy)

---

## Usage

| Command | Purpose |
|---------|---------|
| `npm start` | Run the proxy (Node, production-style). |
| `npm run dev` | Run with **nodemon**; restarts on file changes. |

The process listens on the host and port defined by `BIND_HOST` and `PORT` (see below).

---

## Configuration

All settings are supplied via **environment variables**. Defaults match [`src/config/index.js`](src/config/index.js).

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8085` | TCP port for the HTTPS listener. |
| `BIND_HOST` | `localhost` | Bind address. Use `0.0.0.0` to accept connections from other machines on the network. |
| `DEFAULT_TARGET` | `http://10.212.43.57:9220` | Upstream target host/base URL. A scheme is added automatically if omitted (`http://` assumed). |
| `CERT_DIR` | `./certificate` | Directory used for TLS material. |
| `CERT_KEY_PATH` | `./certificate/server.key` | Path to the private key. |
| `CERT_CRT_PATH` | `./certificate/server.crt` | Path to the certificate. |

**Example:**

```bash
export DEFAULT_TARGET=http://api.local:3000
export PORT=8443
npm run dev
```

---

## Integrating your application

1. Start this proxy on your workstation.
2. Configure your frontend or API client to use the proxy origin (same path and query string as the real API).

**Example:** if the proxy runs at `https://localhost:8085` and your API path is `/clientbackend/...`, call:

`https://localhost:8085/clientbackend/...`

The service forwards that request to `DEFAULT_TARGET` while keeping method, path, query, request body, and headers/cookies.  
`Host` is changed to the upstream host (`changeOrigin: true`), which is required by many upstream services.

---

## CORS behavior

The proxy includes a permissive CORS fallback so browser calls do not fail when upstream does not return CORS headers.

- Handles preflight `OPTIONS` directly with `204` + `Access-Control-Allow-*` headers.
- For non-`OPTIONS` responses, adds missing CORS headers and keeps upstream-provided CORS headers as-is.
- Uses request `Origin` when present; falls back to `*` otherwise.
- Adds `Access-Control-Allow-Credentials: true` only when origin is explicit (not `*`), to keep headers browser-valid.

This covers common browser CORS cases for local dev. If your team needs strict origin allowlists or method/header restrictions, add explicit CORS policy controls.

---

## TLS certificates

- If `server.key` and `server.crt` are present under `certificate/`, they are used as-is.
- If either file is missing, a **self-signed** certificate is generated and written to the configured paths.
- Browsers will show a trust warning until you install or trust that certificate, or replace the files with ones signed by a CA you trust (for example, a corporate or [mkcert](https://github.com/FiloSottile/mkcert)-based setup).

---

## Project structure

```text
├── src/
│   ├── index.js           Application entry: HTTPS server + reverse proxy wiring
│   ├── config/
│   │   └── index.js       Environment-driven configuration
│   └── utils/
│       ├── cert.js        TLS file checks and self-signed generation
│       ├── curlLog.js     Build copy-ready curl from proxied request
│       ├── logger.js      Logging helpers
│       ├── network.js     Local network address helper
│       └── proxyUrl.js    Upstream target URL normalization
├── certificate/           TLS assets (optional; auto-generated if missing)
├── nodemon.json           Development watch configuration
├── package.json
└── README.md
```

---

## Security notice

This tool is intended for **local development only**.

- It is not hardened for internet-facing deployment.
- CORS fallback is intentionally permissive for local development convenience.
- Self-signed certificates are for convenience, not production identity.

Do not expose this service to untrusted networks without a full security review and appropriate controls.

---

## Troubleshooting

| Symptom | Suggestion |
|---------|------------|
| `EADDRINUSE` | Another process is using `PORT`. Stop it or set a different `PORT`. |
| Browser blocks or warns on HTTPS | Expected for self-signed certs; trust the cert locally or supply your own files. |
| Upstream unreachable | Confirm `DEFAULT_TARGET`, VPN, and firewall rules from the machine running Node (not only from the browser). |
| Still seeing CORS errors | Inspect response headers in DevTools. Some apps with strict credential/origin policy may require custom allowlist logic. |

---

## License

ISC. See [`package.json`](package.json) for the SPDX identifier.

**Maintainer:** [Rajat Kes](https://github.com/Rajat-kes) — dev.rajat.kes@gmail.com
