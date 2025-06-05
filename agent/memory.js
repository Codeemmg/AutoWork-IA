// Módulo de memória conversacional por número de telefone

const memoriaPorUsuario = {};

/**
 * Retorna a memória completa de um usuário.
 * @param {string} numero - número de telefone
 */
function getTudo(numero) {
    console.log('[DEBUG] Entrou em memory.js > getTudo');
  return memoriaPorUsuario[numero] || { historico: [] };
}

/**
 * Retorna apenas o histórico de mensagens (limitado)
 * @param {string} numero - número de telefone
 * @param {number} limite - quantidade de mensagens (padrão 5)
 */
function getHistorico(numero, limite = 5) {
  const memoria = getTudo(numero);
  return (memoria.historico || []).slice(-limite);
}

/**
 * Atualiza uma chave na memória do usuário
 * @param {string} numero - número de telefone
 * @param {string} chave - chave do dado (ex: 'ultima_intencao')
 * @param {any} valor - valor a ser salvo
 */
function atualizarMemoria(numero, chave, valor) {
  if (!memoriaPorUsuario[numero]) {
    memoriaPorUsuario[numero] = { historico: [] };
  }

  memoriaPorUsuario[numero][chave] = valor;
}

/**
 * Adiciona uma nova interação ao histórico
 * @param {string} numero - número de telefone
 * @param {string} mensagem - conteúdo da interação
 */
function adicionarAoHistorico(numero, mensagem) {
  if (!memoriaPorUsuario[numero]) {
    memoriaPorUsuario[numero] = { historico: [] };
  }

  memoriaPorUsuario[numero].historico.push(mensagem);

  // Limita o histórico a 20 mensagens
  if (memoriaPorUsuario[numero].historico.length > 20) {
    memoriaPorUsuario[numero].historico.shift();
  }
}

/**
 * Limpa toda a memória do usuário
 * @param {string} numero 
 */
function limparMemoria(numero) {
  delete memoriaPorUsuario[numero];
}

module.exports = {
  getTudo,
  getHistorico,
  atualizarMemoria,
  adicionarAoHistorico,
  limparMemoria
};
