const fs = require('fs');
const path = require('path');
const db = require('../db'); // conexão pool

/**
 * Gera um resumo completo, apenas de entradas ou apenas de saídas.
 * @param {string} userId - número do usuário
 * @param {object} periodo - { inicio, fim }
 * @param {string|null} foco - 'entradas', 'saidas' ou null
 */
async function gerarResumoCompleto(userId, periodo, foco = null) {
  if (!periodo || !periodo.inicio || !periodo.fim) {
    return '⚠️ Não foi possível entender o período. Por favor, tente especificar uma data ou mês.';
  }

  const conn = db;

  const [dados] = await conn.execute(
    `SELECT tipo, categoria, descricao, valor, data
     FROM registros
     WHERE user_id = ? AND data BETWEEN ? AND ?
     ORDER BY tipo, categoria, data`,
    [userId, periodo.inicio, periodo.fim]
  );

  if (dados.length === 0) return '📭 Nenhum registro encontrado no período.';

  let resumo = `📊 *Resumo Financeiro*\n📅 De ${periodo.inicio} até ${periodo.fim}\n\n`;

  const grupos = { entrada: {}, saida: {} };
  let totalEntradas = 0, totalSaidas = 0;

  for (const item of dados) {
    const tipo = item.tipo;
    const cat = item.categoria || 'Outros';
    const valor = parseFloat(item.valor) || 0;
    const dataFormatada = new Date(item.data).toLocaleDateString('pt-BR');

    if (!grupos[tipo][cat]) grupos[tipo][cat] = [];
    grupos[tipo][cat].push(`📅 ${dataFormatada} • ${item.descricao} - R$ ${valor.toFixed(2)}`);

    if (tipo === 'entrada') totalEntradas += valor;
    else totalSaidas += valor;
  }

  if (!foco || foco === 'entradas') {
    if (Object.keys(grupos.entrada).length > 0) {
      resumo += `💰 *Entradas*\n`;
      for (const [cat, itens] of Object.entries(grupos.entrada)) {
        resumo += `📌 ${cat}:\n${itens.join('\n')}\n\n`;
      }
      resumo += `💵 Total: R$ ${totalEntradas.toFixed(2)}\n\n`;
    }
  }

  if (!foco || foco === 'saidas') {
    if (Object.keys(grupos.saida).length > 0) {
      resumo += `💸 *Saídas*\n`;
      for (const [cat, itens] of Object.entries(grupos.saida)) {
        resumo += `📌 ${cat}:\n${itens.join('\n')}\n\n`;
      }
      resumo += `💸 Total: R$ ${totalSaidas.toFixed(2)}\n\n`;
    }
  }

  if (!foco) {
    resumo += `📌 *Saldo Final:* R$ ${(totalEntradas - totalSaidas).toFixed(2)}`;
  }

  // Criação segura da pasta logs
  const logsDir = path.join(__dirname, '../logs');
  const logPath = path.join(logsDir, 'resumo.log');

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logTexto = `[${new Date().toISOString()}] ${userId} | Foco: ${foco || 'completo'} | Período: ${periodo.inicio} a ${periodo.fim} | Entradas: R$ ${totalEntradas.toFixed(2)} | Saídas: R$ ${totalSaidas.toFixed(2)} | Saldo: R$ ${(totalEntradas - totalSaidas).toFixed(2)}\n`;
  fs.appendFileSync(logPath, logTexto);

  return resumo;
}

module.exports = gerarResumoCompleto;
