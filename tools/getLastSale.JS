// getLastSale.js
const db = require('../db');

// Retorna o último registro do usuário (entrada ou saída REAL)
async function getLastSale(user_id) {
  const [rows] = await db.query(
    `SELECT * FROM registros 
     WHERE user_id = ? 
       AND (tipo = 'entrada' OR tipo = 'saida')
     ORDER BY id DESC
     LIMIT 1`,
    [user_id]
  );
  // Se não encontrar nada, retorna null
  return rows[0] || null;
}

module.exports = getLastSale;
