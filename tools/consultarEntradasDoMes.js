const db = require('../db');
const moment = require('moment');

/**
 * Consulta o total de entradas do mês (ou de um período informado) para um usuário específico.
 * @param {string} userId - número do WhatsApp
 * @param {{inicio: string, fim: string}} [periodo] - período customizado
 * @returns {string}
 */
async function consultarEntradasDoMes(userId = 'desconhecido', periodo = null) {
  const inicio = periodo?.inicio
    ? moment(periodo.inicio).format('YYYY-MM-DD 00:00:00')
    : moment().startOf('month').format('YYYY-MM-DD 00:00:00');

  const fim = periodo?.fim
    ? moment(periodo.fim).format('YYYY-MM-DD 23:59:59')
    : moment().endOf('month').format('YYYY-MM-DD 23:59:59');

  try {
    const [dados] = await db.query(
      `SELECT SUM(valor) as total, COUNT(*) as quantidade
       FROM registros
       WHERE tipo = 'entrada' AND user_id = ? AND data BETWEEN ? AND ?`,
      [userId, inicio, fim]
    );

    const total = parseFloat(dados[0].total) || 0;
    const quantidade = parseInt(dados[0].quantidade) || 0;

    return `📈 *Entradas do Mês*\n\n📅 Período: ${inicio.split(' ')[0]} a ${fim.split(' ')[0]}\n💰 Total: *R$ ${total.toFixed(2)}*\n📦 Lançamentos: ${quantidade}`;
  } catch (err) {
    console.error("❌ Erro ao consultar entradas do mês:", err.message);
    return "❌ Erro ao consultar as entradas do mês.";
  }
}

module.exports = consultarEntradasDoMes;
