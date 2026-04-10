const path = require("path");
const dotenv = require("dotenv");

const projectRoot = process.cwd();
dotenv.config({
  path: path.join(projectRoot, ".env"),
  quiet: true,
});

module.exports = {
  port: Number(process.env.PORT || 8085),
  bindHost: process.env.BIND_HOST || "localhost",
  defaultTarget: process.env.DEFAULT_TARGET || "10.212.43.57:9220",
  certDir: process.env.CERT_DIR || path.join(projectRoot, "certificate"),
  certKeyPath:
    process.env.CERT_KEY_PATH ||
    path.join(projectRoot, "certificate", "server.key"),
  certCrtPath:
    process.env.CERT_CRT_PATH ||
    path.join(projectRoot, "certificate", "server.crt"),
};
