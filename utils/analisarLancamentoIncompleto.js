/**
 * Verifica se algum campo obrigatório está faltando em um lançamento/registro.
 * Retorna uma mensagem de erro se faltar algo, ou null se estiver tudo OK.
 * 
 * @param {Object} obj - { tipo, valor, descricao, data }
 * @returns {string|null}
 */
function analisarLancamentoIncompleto(obj = {}) {
    if (!obj.tipo) return "Qual o tipo do lançamento? (entrada ou saída)";
    if (!obj.valor) return "Qual o valor?";
    if (!obj.descricao) return "Qual a descrição?";
    // Data geralmente pode ser opcional (pode usar data de hoje como fallback)
    // if (!obj.data) return "Qual a data desse lançamento?"; // Descomente se quiser forçar

    return null; // Todos os campos importantes preenchidos
}

module.exports = analisarLancamentoIncompleto;
