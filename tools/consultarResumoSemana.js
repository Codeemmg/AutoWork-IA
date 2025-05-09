const db = require('../db');
const moment = require('moment');

/**
 * Consulta o resumo financeiro do usuário em um determinado período
 * @param {string} userId - número do WhatsApp
 * @param {Object} [periodo] - objeto com { inicio, fim } como moment ou string "YYYY-MM-DD"
 * @returns {string} resumo formatado
 */
async function consultarResumoSemana(userId = 'desconhecido', periodo = null) {
  let inicio, fim;

  if (periodo && periodo.inicio && periodo.fim) {
    inicio = moment(periodo.inicio).format('YYYY-MM-DD 00:00:00');
    fim = moment(periodo.fim).format('YYYY-MM-DD 23:59:59');
  } else {
    const hoje = moment();
    inicio = hoje.clone().startOf('isoWeek').format('YYYY-MM-DD 00:00:00');
    fim = hoje.clone().endOf('isoWeek').format('YYYY-MM-DD 23:59:59');
  }

  try {
    const [entradas] = await db.query(
      `SELECT SUM(valor) as total FROM registros 
       WHERE tipo = 'entrada' AND user_id = ? AND data BETWEEN ? AND ?`,
      [userId, inicio, fim]
    );

    const [saidas] = await db.query(
      `SELECT SUM(valor) as total FROM registros 
       WHERE tipo = 'saida' AND user_id = ? AND data BETWEEN ? AND ?`,
      [userId, inicio, fim]
    );

    const totalEntradas = parseFloat(entradas[0].total) || 0;
    const totalSaidas = parseFloat(saidas[0].total) || 0;
    const saldo = totalEntradas - totalSaidas;

    return (
      `📊 *Resumo Financeiro*\n\n` +
      `📅 De: ${inicio.split(' ')[0]} até ${fim.split(' ')[0]}\n\n` +
      `💰 *Entradas:* R$ ${totalEntradas.toFixed(2)}\n` +
      `💸 *Saídas:* R$ ${totalSaidas.toFixed(2)}\n` +
      `🧮 *Saldo:* R$ ${saldo.toFixed(2)}`
    );
  } catch (err) {
    console.error('❌ Erro ao consultar resumo:', err.message);
    return '❌ Erro ao gerar o resumo.';
  }
}

module.exports = consultarResumoSemana;
