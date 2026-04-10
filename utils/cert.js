const fs = require("fs");
const selfsigned = require("selfsigned");
const { log } = require("./logger");

function ensureCertificate(config) {
  const hasKey = fs.existsSync(config.certKeyPath);
  const hasCert = fs.existsSync(config.certCrtPath);

  if (hasKey && hasCert) {
    log("INFO", "Using existing certificate files", {
      keyPath: config.certKeyPath,
      certPath: config.certCrtPath,
    });
    return;
  }

  log(
    "WARN",
    "Certificate files missing. Generating self-signed certificate.",
    {
      keyExists: hasKey,
      certExists: hasCert,
    },
  );

  fs.mkdirSync(config.certDir, { recursive: true });

  const attrs = [{ name: "commonName", value: "localhost" }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 825,
    algorithm: "sha256",
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  });

  fs.writeFileSync(config.certKeyPath, pems.private, "utf8");
  fs.writeFileSync(config.certCrtPath, pems.cert, "utf8");

  log("INFO", "Generated self-signed certificate files", {
    keyPath: config.certKeyPath,
    certPath: config.certCrtPath,
  });
}

function getHttpsOptions(config) {
  ensureCertificate(config);
  return {
    key: fs.readFileSync(config.certKeyPath, "utf8"),
    cert: fs.readFileSync(config.certCrtPath, "utf8"),
  };
}

module.exports = { ensureCertificate, getHttpsOptions };
