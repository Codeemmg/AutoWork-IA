const { z } = require('zod');

exports.description = 'Pede esclarecimento ao usuário';
exports.schema = z.object({ pergunta_original: z.string() });

async function clarificar_pergunta({ pergunta_original }) {
  return `❓ Por favor, poderia esclarecer melhor sua solicitação: "${pergunta_original}"?`;
}

module.exports = { exec: clarificar_pergunta };
