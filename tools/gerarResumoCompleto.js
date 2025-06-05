const fs = require("fs");
const path = require("path");
const db = require("../db");
const { z } = require('zod');

exports.description = 'Gera resumo financeiro completo';
exports.schema = z.object({
  userId: z.string(),
  periodo: z.object({ inicio: z.string(), fim: z.string() }),
  foco: z.string().nullable().optional()
});

/**
 * Gera um resumo completo, apenas de entradas ou saídas, ou ambos.
 * @param {string} userId - número do WhatsApp
 * @param {{inicio: string, fim: string}} periodo - datas no formato "YYYY-MM-DD"
 * @param {"entradas"|"saidas"|null} foco - filtro de tipo
 * @returns {Promise<string>}
 */
async function gerarResumoCompleto(userId, periodo, foco = null) {
    console.log('[DEBUG] Entrou em gerarResumoCompleto.js > gerarResumoCompleto');
  if (!periodo?.inicio || !periodo?.fim) {
    return "⚠️ Período inválido. Especifique uma data inicial e final.";
  }

  try {
    const [dados] = await db.query(
      `SELECT tipo, categoria, descricao, valor, data
       FROM registros
       WHERE user_id = ? AND data BETWEEN ? AND ?
       ORDER BY tipo, categoria, data`,
      [userId, `${periodo.inicio} 00:00:00`, `${periodo.fim} 23:59:59`]
    );

    if (!dados.length) return "📭 Nenhum registro encontrado no período.";

    let totalEntradas = 0;
    let totalSaidas = 0;
    const grupos = { entrada: {}, saida: {} };

    for (const item of dados) {
      const tipo = item.tipo;
      const categoria = item.categoria || "Outros";
      const valor = parseFloat(item.valor) || 0;
      const data = new Date(item.data).toLocaleDateString("pt-BR");

      if (!grupos[tipo][categoria]) grupos[tipo][categoria] = [];
      grupos[tipo][categoria].push(`📅 ${data} • ${item.descricao} - R$ ${valor.toFixed(2)}`);

      if (tipo === "entrada") totalEntradas += valor;
      if (tipo === "saida") totalSaidas += valor;
    }

    let texto = `📊 *Resumo Financeiro*\n📅 De ${periodo.inicio} até ${periodo.fim}\n\n`;

    if (!foco || foco === "entradas") {
      texto += gerarBloco("💰 *Entradas*", grupos.entrada, totalEntradas);
    }

    if (!foco || foco === "saidas") {
      texto += gerarBloco("💸 *Saídas*", grupos.saida, totalSaidas);
    }

    if (!foco) {
      texto += `📌 *Saldo Final:* R$ ${(totalEntradas - totalSaidas).toFixed(2)}\n`;
    }

    registrarLog(userId, periodo, foco, totalEntradas, totalSaidas);
    return texto;
  } catch (err) {
    console.error("❌ Erro ao gerar resumo completo:", err.message);
    return "❌ Erro ao gerar o resumo completo.";
  }
}

function gerarBloco(titulo, grupo, total) {
  if (!Object.keys(grupo).length) return "";
  let bloco = `${titulo}\n`;
  for (const [categoria, linhas] of Object.entries(grupo)) {
    bloco += `📌 ${categoria}:\n${linhas.join("\n")}\n\n`;
  }
  bloco += `💵 Total: R$ ${total.toFixed(2)}\n\n`;
  return bloco;
}

function registrarLog(userId, periodo, foco, entradas, saidas) {
  const logsDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const texto = `[${new Date().toISOString()}] ${userId} | Foco: ${foco || "completo"} | De: ${periodo.inicio} a ${periodo.fim} | Entradas: R$ ${entradas.toFixed(2)} | Saídas: R$ ${saidas.toFixed(2)} | Saldo: R$ ${(entradas - saidas).toFixed(2)}\n`;
  fs.appendFileSync(path.join(logsDir, "resumo.log"), texto);
}

module.exports = gerarResumoCompleto;
