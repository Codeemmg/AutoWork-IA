// tools/getSaleByCode.js
const db = require('../db');
const { z } = require('zod');

exports.description = 'Busca um registro pelo código';
exports.schema = z.object({
  user_id: z.string(),
  codigo: z.string()
});

async function getSaleByCode(user_id, codigo) {
  // Garante case-insensitive na busca SQL
  const [res] = await db.query(
    `SELECT * FROM registros WHERE user_id = ? AND LOWER(codigo) = ? LIMIT 1`,
    [user_id, codigo.toLowerCase()]
  );
  return res[0] || null;
}


module.exports = getSaleByCode;
