const consultarResumoSemana = require('../tools/consultarResumoSemana');
const consultarEntradasDoMes = require('../tools/consultarEntradasDoMes');
const gerarDicaFinanceira = require('../tools/gerarDicaFinanceira');

async function executar(acao, mensagem, contexto = {}) {
  const usuario_id = contexto?.usuario_id || contexto?.user_id || '553299642181'; // Substitua pelo número real

  try {
    switch (acao) {
      case 'consultar_resumo_semana':
        return await consultarResumoSemana(usuario_id);

      case 'consultar_faturamento':
        return await consultarEntradasDoMes(usuario_id);

      case 'gerar_dica_financeira':
        return await gerarDicaFinanceira(usuario_id);

      default:
        return {
          resposta: '⚠️ Ação não reconhecida pelo decisor.',
          tipo: 'texto',
        };
    }
  } catch (err) {
    console.error(`Erro ao executar ação '${acao}':`, err.message);
    return {
      resposta: '❌ Erro ao processar sua solicitação.',
      tipo: 'texto',
    };
  }
}

module.exports = { executar };
