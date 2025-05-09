const db = require('../db');
const moment = require('moment');

/**
 * Registra um lançamento financeiro.
 * @param {string} user_id - número do usuário (WhatsApp)
 * @param {string} descricao - descrição da transação
 * @param {number} valor - valor em reais
 * @param {string} tipo - 'entrada' ou 'saida'
 * @param {string} categoria - categoria como 'Alimentação', 'Receita', etc.
 */
async function registerSale(user_id, descricao, valor, tipo = 'entrada', categoria = 'Indefinido') {
  const data = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const [resultado] = await db.query(
      `INSERT INTO registros (user_id, descricao, valor, tipo, categoria, data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, descricao, valor, tipo, categoria, data]
    );

    console.log('✅ Registro salvo. ID:', resultado.insertId);
  } catch (err) {
    console.error('❌ Erro ao salvar no banco:', err);
    throw err;
  }
}

module.exports = registerSale;
