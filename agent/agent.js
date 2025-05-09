const { OpenAI } = require('openai');
require('dotenv').config();
const registerSale = require('../tools/registerSale');
const interpretarMensagem = require('../tools/interpretarMensagemIA');
const { registrarUsoDeTokens } = require('../tools/tokenCounter');
const consultarResumoSemana = require('../tools/consultarResumoSemana');
const detectarIntencaoViaIA = require('../tools/detectarIntencaoViaIA');
const consultarMaiorGastoPeriodo = require('../tools/consultarMaiorGastoSemana');
const consultarEntradasDoMes = require('../tools/consultarEntradasDoMes');
const gerarDicaFinanceira = require('../tools/gerarDicaFinanceira');
const gerarGraficosResumo = require('../tools/gerarGraficosResumo');
const interpretarPeriodo = require('../tools/interpretarPeriodo');
const gerarResumoCompleto = require('../tools/gerarResumoCompleto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo-1106';

async function agent(message, memory = [], userId = 'desconhecido') {
  const resultado = await interpretarMensagem(message);

  if (resultado.valor && resultado.tipo) {
    await registerSale(userId, resultado.descricao, resultado.valor, resultado.tipo, resultado.categoria);

    return {
      tipo: 'texto',
      conteudo: `✅ Registro salvo!
📅 ${new Date().toLocaleDateString('pt-BR')}
💰 Tipo: ${resultado.tipo === 'entrada' ? 'Entrada' : 'Saída'}
📝 Descrição: ${resultado.descricao}
🏷️ Categoria: ${resultado.categoria}
📌 Valor: R$ ${parseFloat(resultado.valor).toFixed(2)}`
    };
  }

  const intencao = await detectarIntencaoViaIA(message);
  const periodo = interpretarPeriodo(message);
  let resposta = '';
  let sugestao = '';

  switch (intencao) {
    case 'maior_gasto':
      return { tipo: 'texto', conteudo: await consultarMaiorGastoPeriodo(userId, periodo) };

    case 'resumo_semana':
      return { tipo: 'texto', conteudo: await consultarResumoSemana(userId, periodo) };

    case 'entrada_mes':
      return { tipo: 'texto', conteudo: await consultarEntradasDoMes(userId, periodo) };

    case 'entrada_periodo':
      resposta = await gerarResumoCompleto(userId, periodo, 'entradas');
      sugestao = '\n\n👀 Deseja ver também suas *saídas* nesse período ou um *resumo completo* com saldo?';
      break;

    case 'saida_periodo':
      resposta = await gerarResumoCompleto(userId, periodo, 'saidas');
      sugestao = '\n\n👀 Deseja ver também suas *entradas* nesse período ou um *resumo completo* com saldo?';
      break;

    case 'resumo_completo':
      resposta = await gerarResumoCompleto(userId, periodo);
      break;

    case 'melhoria_financeira':
      return { tipo: 'texto', conteudo: await gerarDicaFinanceira(userId) };

    case 'grafico_semana': {
      const graficos = await gerarGraficosResumo(userId, periodo);
      if (!graficos) {
        return { tipo: 'texto', conteudo: '📭 Nenhum dado para gerar gráfico neste período.' };
      }
      return {
        tipo: 'imagem',
        imagens: [
          { caminho: graficos.graficoBar, legenda: '📊 Gastos por Dia' },
          { caminho: graficos.graficoPizza, legenda: '🥧 Distribuição por Categoria' }
        ]
      };
    }

    case 'registro_financeiro':
      return { tipo: 'texto', conteudo: "🔧 Função de registro ainda não implementada para esse caso." };

    case 'duvida':
      return { tipo: 'texto', conteudo: "🤔 Ainda estou aprendendo! Você pode tentar perguntar de outro jeito?" };

    case 'comando_invalido':
    default:
      return { tipo: 'texto', conteudo: "❌ Não entendi o que você quis dizer. Pode tentar de outra forma?" };
  }

  return { tipo: 'texto', conteudo: resposta + sugestao };
}

module.exports = agent;
