// tools/motorConsultivo.js

const db = require("../db");
const { z } = require('zod');

exports.description = 'Gera sugestão financeira ao usuário';
exports.schema = z.object({ userId: z.string() });

/**
 * Gera uma sugestão consultiva financeira para o usuário, com base em análise simples do histórico.
 * @param {string|number} userId - número do WhatsApp
 * @param {array} debugLog - (opcional) array para logs detalhados
 * @returns {Promise<string>} Sugestão financeira para o usuário
 */
async function motorConsultivo(userId, debugLog = []) {
  try {
    // 1. Busca entradas e saídas dos últimos 30 dias
    const [entradas] = await db.query(
      `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'entrada' AND data >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [userId]
    );
    const [saidas] = await db.query(
      `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'saida' AND data >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [userId]
    );
    const [maiorGasto] = await db.query(
      `SELECT categoria, SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'saida' AND data >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY categoria ORDER BY total DESC LIMIT 1`, [userId]
    );

    const totalEntradas = entradas[0].total ? parseFloat(entradas[0].total) : 0;
    const totalSaidas = saidas[0].total ? parseFloat(saidas[0].total) : 0;
    const saldo = totalEntradas - totalSaidas;

    let dica = "";

    if (saldo < 0) {
      dica = "⚠️ Seu saldo dos últimos 30 dias está negativo. Reveja seus gastos e tente cortar despesas não essenciais!";
    } else if (totalSaidas > totalEntradas * 0.8) {
      dica = "🔎 Atenção: seus gastos estão consumindo a maior parte das suas entradas. Considere reservar uma parte dos ganhos para investimentos ou emergências.";
    } else {
      dica = "✅ Parabéns! Você está conseguindo manter um bom equilíbrio entre entradas e saídas. Que tal pensar em investir parte do saldo?";
    }

    if (maiorGasto.length && maiorGasto[0].total > 0) {
      dica += `\n💡 Seu maior gasto foi na categoria *${maiorGasto[0].categoria}*. Avalie se é possível reduzir despesas nesse setor.`;
    }

    if (debugLog) debugLog.push({ etapa: "motor_consultivo", totalEntradas, totalSaidas, saldo, maiorGasto });

    return dica;
  } catch (err) {
    if (debugLog) debugLog.push({ etapa: "erro_motor_consultivo", erro: err.message });
    console.error("❌ Erro no motor consultivo:", err.message);
    return "❌ Erro ao gerar sugestão financeira.";
  }
}

module.exports = motorConsultivo;
