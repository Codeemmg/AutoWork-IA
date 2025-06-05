const db = require('../db');
const { z } = require('zod');

exports.description = 'Verifica autorização de número do usuário';
exports.schema = z.object({ numero: z.string() });

/**
 * Verifica se o número do usuário está autorizado a usar o assistente.
 * @param {string} numero - Número do WhatsApp no formato "5532999123456"
 * @returns {Promise<boolean>} - true se autorizado, false caso contrário
 */
async function verificarAutorizacao(numero) {
  try {
    const [res] = await db.query(
      `SELECT * FROM usuarios_autorizados WHERE numero = ? AND ativo = 1`,
      [numero]
    );

    return res.length > 0;
  } catch (err) {
    console.error("❌ Erro ao verificar autorização:", err.message);
    return false;
  }
}

module.exports = verificarAutorizacao;
