// tools/consultarTopEntradas.js

const db = require('../db');
const moment = require('moment');
const { z } = require('zod');

exports.description = 'Lista as maiores entradas no período';
exports.schema = z.object({
  userId: z.string(),
  periodo: z
    .object({ inicio: z.string(), fim: z.string() })
    .nullable()
    .optional(),
  topN: z.number().optional()
});

/**
 * Consulta os top N maiores entradas de um usuário em qualquer período.
 * @param {string|number} userId - número do WhatsApp
 * @param {Object|null} periodo - objeto com { inicio, fim } como string (ex: "2025-05-01"), ou null para mês atual
 * @param {array} debugLog - (opcional) array de logs para debug detalhado
 * @param {number} topN - quantidade máxima de resultados (default = 5)
 * @returns {Promise<string>} texto pronto para exibir ao usuário
 */
async function consultarTopEntradas(userId = 'desconhecido', periodo = null, debugLog = [], topN = 5) {
  let inicio, fim;

  // Detecta período (mês padrão)
  if (periodo?.inicio && periodo?.fim) {
    inicio = moment(periodo.inicio).format('YYYY-MM-DD 00:00:00');
    fim = moment(periodo.fim).format('YYYY-MM-DD 23:59:59');
  } else {
    const hoje = moment();
    inicio = hoje.clone().startOf('month').format('YYYY-MM-DD 00:00:00');
    fim = hoje.clone().endOf('month').format('YYYY-MM-DD 23:59:59');
  }

  // Identifica label do período para resposta
  let periodoLabel = 'do mês';
  if (periodo?.customLabel) {
    periodoLabel = periodo.customLabel;
  } else {
    const d1 = moment(inicio);
    const d2 = moment(fim);
    if (d1.isSame(d2, 'day')) {
      if (d1.isSame(moment(), 'day')) periodoLabel = 'de hoje';
      else if (d1.isSame(moment().subtract(1, 'day'), 'day')) periodoLabel = 'de ontem';
      else periodoLabel = `de ${d1.format('DD/MM/YYYY')}`;
    } else if (d1.isSame(d2, 'month')) {
      if (d1.isSame(moment(), 'month')) periodoLabel = 'do mês';
      else periodoLabel = `do período (${d1.format('DD/MM/YYYY')} a ${d2.format('DD/MM/YYYY')})`;
    } else if (d1.isSame(d2, 'year')) {
      periodoLabel = `do ano`;
    } else {
      periodoLabel = `do período (${d1.format('DD/MM/YYYY')} a ${d2.format('DD/MM/YYYY')})`;
    }
  }

  if (debugLog) debugLog.push({ etapa: "periodo_top_entradas", inicio, fim, periodoLabel });

  try {
    const [dados] = await db.query(
      `SELECT descricao, SUM(valor) as total, COUNT(*) as quantidade
       FROM registros
       WHERE tipo = 'entrada' AND user_id = ? AND data BETWEEN ? AND ?
       GROUP BY descricao
       ORDER BY total DESC
       LIMIT ?`,
      [userId, inicio, fim, topN]
    );

    if (!dados.length) {
      return `📭 Nenhuma entrada registrada ${periodoLabel}.`;
    }

    let resposta = `📈 *Top ${dados.length} maiores entradas ${periodoLabel}:*\n`;

    dados.forEach((entrada, idx) => {
      resposta += `\n${idx + 1}. *${entrada.descricao}* — R$ ${parseFloat(entrada.total).toFixed(2)} em ${entrada.quantidade} lançamento(s)`;
    });

    if (debugLog) debugLog.push({ etapa: "top_entradas_encontradas", dados });

    return resposta;

  } catch (err) {
    if (debugLog) debugLog.push({ etapa: "erro_top_entradas", erro: err.message });
    console.error("❌ Erro ao consultar top entradas:", err.message);
    return "❌ Erro ao consultar as maiores entradas do período.";
  }
}

module.exports = consultarTopEntradas;
