const db = require('../db');
const moment = require('moment');

/**
 * Gera uma dica financeira com base nos maiores gastos da semana do usuário.
 * @param {string} userId - número do WhatsApp
 * @returns {Promise<{resposta: string, tipo: string}>}
 */
module.exports = async function gerarDicaFinanceira(userId = 'desconhecido') {
  const inicioSemana = moment().startOf('isoWeek').format('YYYY-MM-DD 00:00:00');
  const fimSemana = moment().endOf('isoWeek').format('YYYY-MM-DD 23:59:59');

  try {
    const [dados] = await db.query(
      `SELECT descricao, SUM(valor) as total, COUNT(*) as quantidade
       FROM registros
       WHERE tipo = 'saida' AND user_id = ? AND data BETWEEN ? AND ?
       GROUP BY descricao
       ORDER BY total DESC
       LIMIT 3`,
      [userId, inicioSemana, fimSemana]
    );

    if (!dados.length) {
      return { resposta: "📭 Nenhuma despesa registrada essa semana para análise.", tipo: "texto" };
    }

    const maior = dados[0];
    const totalGasto = dados.reduce((acc, item) => acc + parseFloat(item.total), 0);
    const porcentagem = ((maior.total / totalGasto) * 100).toFixed(1);
    const economiaSugerida = (maior.total * 0.5).toFixed(2);

    const resposta =
      `💡 *Dica Financeira da Semana*\n\n` +
      `🔎 Seu maior gasto foi com *"${maior.descricao}"*, somando *R$ ${parseFloat(maior.total).toFixed(2)}* ` +
      `(${porcentagem}% das suas saídas).\n\n` +
      `📉 Se você reduzir isso pela metade, pode economizar cerca de *R$ ${economiaSugerida}* só nesta semana.`;

    return { resposta, tipo: "texto" };
  } catch (err) {
    console.error("❌ Erro ao gerar dica financeira:", err.message);
    return { resposta: "❌ Erro ao gerar sugestão de melhoria.", tipo: "texto" };
  }
};
