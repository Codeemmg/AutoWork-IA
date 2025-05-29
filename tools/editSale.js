const db = require('../db');

async function editSale(user_id, codigo, updates = {}) {
  // Monta query dinâmica de acordo com os campos passados
  const campos = [];
  const valores = [];
  if (updates.valor) {
    campos.push('valor = ?');
    valores.push(updates.valor);
  }
  if (updates.categoria) {
    campos.push('categoria = ?');
    valores.push(updates.categoria);
  }
  if (updates.descricao) {
    campos.push('descricao = ?');
    valores.push(updates.descricao);
  }
  if (campos.length === 0) return false; // nada pra atualizar

  valores.push(user_id, codigo);

  const [rows] = await db.query(
    `UPDATE registros SET ${campos.join(', ')} WHERE user_id = ? AND codigo = ?`,
    valores
  );
  return rows.affectedRows === 1;
}

module.exports = editSale;
