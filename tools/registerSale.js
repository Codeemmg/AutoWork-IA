const db = require('../db');
const moment = require('moment');
const { z } = require('zod');

exports.description = 'Registra uma movimentação financeira';
exports.schema = z.object({
  user_id: z.string(),
  descricao: z.string(),
  valor: z.number(),
  tipo: z.string().optional(),
  categoria: z.string().optional(),
  data: z.string().nullable().optional()
});

// Função para gerar um código único curto e fácil de usar
function gerarCodigoRegistro() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function registerSale(user_id, descricao, valor, tipo = 'entrada', categoria = 'Indefinido', data = null) {
  // Gera código único para o registro
  const codigo = gerarCodigoRegistro();

  // Usa a data passada, ou gera agora se não vier
  let dataRegistro;
  if (data) {
    const dataHoje = moment().format('YYYY-MM-DD');
    if (data.length <= 10) {
      if (data === dataHoje) {
        dataRegistro = moment().format('YYYY-MM-DD HH:mm:ss');
      } else {
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
      `INSERT INTO registros (user_id, codigo, descricao, valor, tipo, categoria, data) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, codigo, descricao, valor, tipo, categoria, dataRegistro]
    );
    console.log('✅ Registro salvo. ID:', resultado.insertId, 'CÓDIGO:', codigo);
    return codigo; // Retorna o código para mostrar ao usuário
  } catch (err) {
    console.error('❌ Erro ao salvar no banco:', err);
    throw err;
  }
}

module.exports = registerSale;
