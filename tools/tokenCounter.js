const fs = require('fs');
const path = require('path');

const tokenLogPath = path.join(__dirname, '../token_log.json');
const { z } = require('zod');

exports.description = 'Registra a contagem de tokens utilizados';
exports.schema = z.object({
  totalTokens: z.number(),
  modelo: z.string(),
  origem: z.string().optional(),
  telefone: z.string().optional()
});

function registrarUsoDeTokens({ totalTokens, modelo, origem = 'agent', telefone = 'desconhecido' }) {
  const agora = new Date();
  const registro = {
    data: agora.toISOString(),
    modelo,
    origem,
    telefone,
    tokens: totalTokens
  };

  let logAtual = [];

  if (fs.existsSync(tokenLogPath)) {
    try {
      logAtual = JSON.parse(fs.readFileSync(tokenLogPath, 'utf8'));
    } catch (e) {
      logAtual = [];
    }
  }

  logAtual.push(registro);

  fs.writeFileSync(tokenLogPath, JSON.stringify(logAtual, null, 2));
}

module.exports = {
  registrarUsoDeTokens
};
