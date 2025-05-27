// logs.js (dentro de /agent)
const fs = require('fs');
function logEvent(event, details) {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] [${event}] ${JSON.stringify(details)}\n`;
    fs.appendFileSync('autowork.log', log);
}
module.exports = { logEvent };
