// core/memoria.js

const fs = require('fs');
const path = require('path');

const memoriaPath = path.join(__dirname, 'memoria.json');

// Função para obter o contexto de um usuário
async function obterContexto(usuario_id) {
  if (!fs.existsSync(memoriaPath)) {
    return {};
  }
  const dados = JSON.parse(fs.readFileSync(memoriaPath, 'utf-8'));
  return dados[usuario_id] || {};
}

// Função para salvar o contexto de um usuário
async function salvarContexto(usuario_id, contexto) {
  let dados = {};
  if (fs.existsSync(memoriaPath)) {
    dados = JSON.parse(fs.readFileSync(memoriaPath, 'utf-8'));
  }
  dados[usuario_id] = contexto;
  fs.writeFileSync(memoriaPath, JSON.stringify(dados, null, 2));
}

module.exports = { obterContexto, salvarContexto };
