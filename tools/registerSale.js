const db = require('../db');
const moment = require('moment');

async function registerSale(user_id, descricao, valor, tipo = 'entrada', categoria = 'Indefinido', data = null) {
  // Usa a data passada, ou gera agora se não vier
  let dataRegistro;
  if (data) {
  // Se for data de hoje, salva com horário real
  const dataHoje = moment().format('YYYY-MM-DD');
  if (data.length <= 10) {
    if (data === dataHoje) {
      // Se for HOJE, salva com hora do momento
      dataRegistro = moment().format('YYYY-MM-DD HH:mm:ss');
    } else {
      // Outros dias, salva zerado
      dataRegistro = data + ' 00:00:00';
    }
  } else {
    dataRegistro = data;
  }
} else {
  dataRegistro = moment().format('YYYY-MM-DD HH:mm:ss');
}


  try {
    const [resultado] = await db.query(
      `INSERT INTO registros (user_id, descricao, valor, tipo, categoria, data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, descricao, valor, tipo, categoria, dataRegistro]
    );
    console.log('✅ Registro salvo. ID:', resultado.insertId);
  } catch (err) {
    console.error('❌ Erro ao salvar no banco:', err);
    throw err;
  }
}

module.exports = registerSale;
