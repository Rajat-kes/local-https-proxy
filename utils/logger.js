function nowIso() {
    return new Date().toISOString();
}

function log(level, message, meta) {
    const suffix = meta ? ' ' + JSON.stringify(meta) : '';
    console.log('--------------------------------');
    console.log(`[${nowIso()}] [${level}] ${message}${suffix}`);
    console.log('-------------------------------------------------------------------');
}

module.exports = { nowIso, log };
