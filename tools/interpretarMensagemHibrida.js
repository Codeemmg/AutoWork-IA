
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const extrairDataNatural = require('../utils/extrairDataNatural');
const classificarCategoriaViaIA = require('./classificarCategoriaViaIA');
const analisarLancamentoIncompleto = require('../utils/analisarLancamentoIncompleto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const vetorPath = path.join(__dirname, "../core/base_inteligencia_unificada.json");
const baseVetorial = fs.existsSync(vetorPath) ? JSON.parse(fs.readFileSync(vetorPath, "utf-8")) : [];

function extrairValor(texto) {
  const match = texto.match(/\d+[.,]?\d*/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

function tentarTipoPeloTexto(texto) {
  if (/(\b(recebi|ganhei|entrou|venda|depositaram|vendi)\b)/i.test(texto)) return 'entrada';
  if (/(\b(gastei|paguei|comprei|investi|retirada|doei|mandei|transferi)\b)/i.test(texto)) return 'saida';
  return null;
}

function tentarCategoriaSimples(texto) {
  if (/mercado|padaria|supermercado|comida/i.test(texto)) return 'Alimentação';
  if (/uber|gasolina|transporte|passagem|combustivel/i.test(texto)) return 'Transporte';
  if (/aluguel|mensalidade/i.test(texto)) return 'Despesas Fixas';
  if (/cinema|lazer|bar|restaurante/i.test(texto)) return 'Lazer';
  if (/remédio|farmácia|médico|consulta|nutricionista|pediatra/i.test(texto)) return 'Saúde';
  if (/livro|curso|faculdade|escola/i.test(texto)) return 'Educação';
  if (/salário|renda|pagamento|comissão|participação de lucro/i.test(texto)) return 'Renda';
  if (/investimento|aplicação/i.test(texto)) return 'Investimentos';
  if (/doação|caridade/i.test(texto)) return 'Doações';
  if (/imposto|taxa/i.test(texto)) return 'Impostos';
  if (/pagamento|despesa/i.test(texto)) return 'Despesas Variáveis';
  if (/empréstimo|dívida/i.test(texto)) return 'Empréstimos e Dívidas';
  if (/poupança|reserva/i.test(texto)) return 'Poupança e Reserva';
  if (/seguro|proteção/i.test(texto)) return 'Seguros e Proteção';
  if (/academia|futebol|futevolei|beach tennis|personal|treino|natação|gym/i.test(texto)) return 'Saúde e Bem-estar';
  return 'Outro';
}

async function gerarEmbedding(texto) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texto
  });
  return response.data[0].embedding;
}

function cosineSimilarity(v1, v2) {
  const dot = v1.reduce((sum, v, i) => sum + v * v2[i], 0);
  const normA = Math.sqrt(v1.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(v2.reduce((sum, v) => sum + v * v, 0));
  return dot / (normA * normB);
}

async function interpretarMensagemHibrida(frase) {
  const texto = frase.toLowerCase();

  const tipo = tentarTipoPeloTexto(texto);
  const valor = extrairValor(texto);
  const dataInfo = extrairDataNatural(frase);
  const data = dataInfo ? dataInfo.dataISO : new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];
  const categoria = tentarCategoriaSimples(texto);

  if (tipo && valor) {
    return {
      intencao: tipo === 'entrada' ? 'registrar_entrada' : 'registrar_saida',
      tipo,
      valor,
      descricao: frase,
      categoria,
      data,
      similaridade: 1
    };
  }

  const embeddingFrase = await gerarEmbedding(texto);
  let melhor = { similaridade: 0, intencao: "comando_invalido" };

  for (const item of baseVetorial) {
    const sim = cosineSimilarity(embeddingFrase, item.embedding);
    if (sim > melhor.similaridade) {
      melhor = { similaridade: sim, intencao: item.intencao };
    }
  }

  if (melhor.similaridade < 0.70) {
    return {
      erro: true,
      mensagem: "❌ Não entendi. Você deseja registrar, consultar ou configurar algo?"
    };
  }

  let categoriaFinal = categoria;
  try {
    if (!categoria || categoria === 'Outro') {
      categoriaFinal = await classificarCategoriaViaIA(frase);
    }
  } catch (_) {}

  const tipoFinal = melhor.intencao.includes("entrada") ? "entrada" :
                    melhor.intencao.includes("saida") ? "saida" : null;

  const respostaIncompleta = analisarLancamentoIncompleto({
    tipo: tipoFinal,
    valor,
    descricao: frase
  });

  if (respostaIncompleta) {
    return {
      erro: true,
      mensagem: respostaIncompleta,
      intencao: melhor.intencao,
      tipo: tipoFinal,
      valor,
      descricao: frase,
      categoria: categoriaFinal,
      data,
      similaridade: melhor.similaridade
    };
  }

  return {
    intencao: melhor.intencao,
    tipo: tipoFinal,
    valor,
    descricao: frase,
    categoria: categoriaFinal,
    data,
    similaridade: melhor.similaridade
  };
}

module.exports = interpretarMensagemHibrida;
