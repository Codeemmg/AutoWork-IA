// agent/logs.js
const fs = require('fs');
const path = require('path');

// Pasta dos logs
const LOG_PATH = path.resolve(__dirname, 'logs');
if (!fs.existsSync(LOG_PATH)) fs.mkdirSync(LOG_PATH);

// Nome do arquivo por data (pode trocar por userId, etc)
function getLogFileName() {
    console.log('[DEBUG] Entrou em logs.js > getLogFileName');
    const hoje = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    return path.join(LOG_PATH, `conversa_${hoje}.json`);
}

// Adiciona uma nova interação ao log de hoje (array de objetos)
function saveInteractionLog(interacao) {
    const logFile = getLogFileName();
    let historico = [];
    if (fs.existsSync(logFile)) {
        try {
            historico = JSON.parse(fs.readFileSync(logFile, 'utf8')) || [];
        } catch (e) {
            historico = [];
        }
    }
    historico.push(interacao);
    fs.writeFileSync(logFile, JSON.stringify(historico, null, 2), 'utf8');
}

// Log simples de evento
function logEvent(etapa, dados = {}) {
    const logLinha = `[${new Date().toISOString()}] [${etapa}] ${JSON.stringify(dados)}\n`;
    const eventoFile = path.join(LOG_PATH, "eventos.log");
    fs.appendFileSync(eventoFile, logLinha, 'utf8');
}

module.exports = { saveInteractionLog, logEvent };
