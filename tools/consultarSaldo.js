// tools/consultarSaldo.js

const db = require("../db");
const { z } = require("zod");

exports.description = "Consulta saldo do usuário em um período";
exports.schema = z.object({
  userId: z.string(),
  periodo: z
    .object({ inicio: z.string(), fim: z.string() })
    .nullable()
    .optional()
});

/**
 * Consulta o saldo de um usuário em um período.
 * @param {string|number} userId - Identificador do usuário (ex: número do WhatsApp)
 * @param {object} [periodo] - { inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }
 * @param {array} debugLog - (opcional) array para logs de debug detalhado
 * @returns {Promise<string>} Saldo detalhado para exibição
 */
async function consultarSaldo(userId, periodo = null, debugLog = []) {
    console.log('[DEBUG] Entrou em consultarSaldo.js > consultarSaldo');
  try {
    let entradasQuery, saidasQuery, entradasParams, saidasParams;

    if (periodo && periodo.inicio && periodo.fim) {
      // Garante o filtro do dia inteiro, independentemente do horário
      const dataInicio = periodo.inicio + ' 00:00:00';
      const dataFim = periodo.fim + ' 23:59:59';
      entradasQuery = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'entrada' AND data >= ? AND data <= ?`;
      saidasQuery = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'saida' AND data >= ? AND data <= ?`;
      entradasParams = [userId, dataInicio, dataFim];
      saidasParams = [userId, dataInicio, dataFim];
    } else {
      // saldo geral
      entradasQuery = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'entrada'`;
      saidasQuery = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'saida'`;
      entradasParams = [userId];
      saidasParams = [userId];
    }

    const [entradas] = await db.query(entradasQuery, entradasParams);
    const [saidas] = await db.query(saidasQuery, saidasParams);

    const totalEntradas = entradas[0].total ? parseFloat(entradas[0].total) : 0;
    const totalSaidas = saidas[0].total ? parseFloat(saidas[0].total) : 0;
    const saldo = totalEntradas - totalSaidas;

    if (debugLog) {
      debugLog.push({
        etapa: "consultar_saldo",
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo,
        periodo: periodo || "total"
      });
    }

    let emoji = "💰";
    if (saldo < 0) emoji = "🔴";
    else if (saldo === 0) emoji = "⚠️";
    else if (saldo > 10000) emoji = "🟢";

    return (
      `📊 *Resumo${periodo ? " do período" : ""}:*\n` +
      `➕ Entradas: R$ ${totalEntradas.toFixed(2)}\n` +
      `➖ Saídas: R$ ${totalSaidas.toFixed(2)}\n` +
      `${emoji} Saldo: R$ ${saldo.toFixed(2)}`
    );
  } catch (err) {
    if (debugLog) debugLog.push({ etapa: "erro_consultar_saldo", erro: err.message });
    console.error("❌ Erro ao consultar saldo:", err.message);
    return "❌ Erro ao consultar o saldo.";
  }
}

module.exports = consultarSaldo;
