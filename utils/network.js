const os = require('os');
const { log } = require('./logger');

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

module.exports = { getLocalIP };
