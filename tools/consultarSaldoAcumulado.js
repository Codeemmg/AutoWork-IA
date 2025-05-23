// tools/consultarSaldoAcumulado.js
const db = require("../db");

async function consultarSaldoAcumulado(userId, ateData, debugLog = []) {
  try {
    const queryEntradas = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'entrada' AND data < ?`;
    const querySaidas = `SELECT SUM(valor) as total FROM registros WHERE user_id = ? AND tipo = 'saida' AND data < ?`;

    const [entradas] = await db.query(queryEntradas, [userId, ateData]);
    const [saidas] = await db.query(querySaidas, [userId, ateData]);

    const totalEntradas = entradas[0].total ? parseFloat(entradas[0].total) : 0;
    const totalSaidas = saidas[0].total ? parseFloat(saidas[0].total) : 0;
    const saldoAcumulado = totalEntradas - totalSaidas;

    if (debugLog) debugLog.push({
      etapa: "consultar_saldo_acumulado",
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldoAcumulado,
      ateData,
    });

    return saldoAcumulado;
  } catch (err) {
    if (debugLog) debugLog.push({ etapa: "erro_consultar_saldo_acumulado", erro: err.message });
    return 0;
  }
}

module.exports = consultarSaldoAcumulado;
