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

module.exports = { normalizeTarget, buildProxyUrl };
