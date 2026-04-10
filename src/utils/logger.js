function nowIso() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  console.log(
    "---------------------------------------------------------------------",
  );
  console.log(`[${nowIso()}] [${level}] ${message}$`);
  console.dir(meta ? meta : {});
  console.log(
    "---------------------------------------------------------------------",
  );
}

module.exports = { nowIso, log };
