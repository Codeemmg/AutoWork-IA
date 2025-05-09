const db = require('../db');
const moment = require('moment');

/**
 * Consulta o maior gasto de um usuário em um período.
 * @param {string} userId - número do WhatsApp
 * @param {Object} [periodo] - objeto com { inicio, fim } como string (ex: "2025-05-01")
 * @returns {Promise<string>}
 */
async function consultarMaiorGastoPeriodo(userId = 'desconhecido', periodo = null) {
  let inicio, fim;

  if (periodo?.inicio && periodo?.fim) {
    inicio = moment(periodo.inicio).format('YYYY-MM-DD 00:00:00');
    fim = moment(periodo.fim).format('YYYY-MM-DD 23:59:59');
  } else {
    const hoje = moment();
    inicio = hoje.clone().startOf('isoWeek').format('YYYY-MM-DD 00:00:00');
    fim = hoje.clone().endOf('isoWeek').format('YYYY-MM-DD 23:59:59');
  }

  try {
    const [dados] = await db.query(
      `SELECT descricao, SUM(valor) as total, COUNT(*) as quantidade
       FROM registros
       WHERE tipo = 'saida' AND user_id = ? AND data BETWEEN ? AND ?
       GROUP BY descricao
       ORDER BY total DESC
       LIMIT 1`,
      [userId, inicio, fim]
    );

    if (!dados.length) {
      return `📭 Nenhum gasto registrado no período de ${inicio.split(" ")[0]} a ${fim.split(" ")[0]}.`;
    }

    const maior = dados[0];

    return `💸 Seu maior gasto nesse período (${inicio.split(" ")[0]} a ${fim.split(" ")[0]}) foi com *"${maior.descricao}"*, totalizando *R$ ${parseFloat(maior.total).toFixed(2)}* em *${maior.quantidade} lançamento(s)*.`;
  } catch (err) {
    console.error("❌ Erro ao consultar maior gasto:", err.message);
    return "❌ Erro ao consultar o maior gasto do período.";
  }
}

module.exports = consultarMaiorGastoPeriodo;
