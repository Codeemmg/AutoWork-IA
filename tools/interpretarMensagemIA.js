require('dotenv').config();
const extrairDataNatural = require('../utils/extrairDataNatural');
const classificarCategoriaViaIA = require('./classificarCategoriaViaIA');
const analisarLancamentoIncompleto = require('../utils/analisarLancamentoIncompleto');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { format, startOfWeek, addDays } = require("date-fns");

// Função para extrair período da frase
function extrairPeriodoDaFrase(frase) {
  const texto = frase.toLowerCase();
  const hoje = new Date();

  const meses = {
    janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
  };

  if (/m[eê]s passado|último mês|mes anterior/.test(texto)) {
    const ano = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const mes = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
    return {
      inicio: format(new Date(ano, mes, 1), "yyyy-MM-dd"),
      fim: format(new Date(ano, mes + 1, 0), "yyyy-MM-dd")
    };
  }

  const regexMes = new RegExp(
    "(?:resumo|extrato|saldo|entradas|sa[ií]das|gastos|lançamentos)?\\s*de\\s*([a-zç]+)(?:\\s*(?:de|do)?\\s*(\\d{4}))?",
    "i"
  );
  const matchMes = texto.match(regexMes);
  if (matchMes && meses.hasOwnProperty(matchMes[1])) {
    const mesNum = meses[matchMes[1]];
    const ano = matchMes[2] ? parseInt(matchMes[2]) : hoje.getFullYear();
    return {
      inicio: format(new Date(ano, mesNum, 1), "yyyy-MM-dd"),
      fim: format(new Date(ano, mesNum + 1, 0), "yyyy-MM-dd")
    };
  }

  if (/m[eê]s/.test(texto)) {
    return {
      inicio: format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), "yyyy-MM-dd"),
      fim: format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), "yyyy-MM-dd")
    };
  }
  if (/semana/.test(texto)) {
    return {
      inicio: format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      fim: format(addDays(startOfWeek(hoje, { weekStartsOn: 1 }), 6), "yyyy-MM-dd")
    };
  }
  if (/ano/.test(texto)) {
    return {
      inicio: format(new Date(hoje.getFullYear(), 0, 1), "yyyy-MM-dd"),
      fim: format(new Date(hoje.getFullYear(), 11, 31), "yyyy-MM-dd")
    };
  }
  if (/hoje/.test(texto)) {
    const hojeISO = format(hoje, "yyyy-MM-dd");
    return { inicio: hojeISO, fim: hojeISO };
  }
  if (/ontem/.test(texto)) {
    const ontem = addDays(hoje, -1);
    const ontemISO = format(ontem, "yyyy-MM-dd");
    return { inicio: ontemISO, fim: ontemISO };
  }
  if (/\bdia\b/.test(texto)) {
    const hojeISO = format(hoje, "yyyy-MM-dd");
    return { inicio: hojeISO, fim: hojeISO };
  }

  const dataNatural = extrairDataNatural(frase);
  if (dataNatural) {
    return { inicio: dataNatural.dataISO, fim: dataNatural.dataISO };
  }
  return null;
}

const projetoRaiz = path.resolve(__dirname, "..");
const vetorPath = path.join(projetoRaiz, "core", "base_inteligencia_unificada.json");
let baseVetorial = [];

if (fs.existsSync(vetorPath)) {
  baseVetorial = JSON.parse(fs.readFileSync(vetorPath, "utf-8"));
} else {
  console.error("❌ Caminho da base vetorial está errado ou não existe:", vetorPath);
}

async function gerarEmbedding(texto, debugLog) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texto
  });
  return response.data[0].embedding;
}

function cosineSimilarity(v1, v2, debugLog) {
  const dot = v1.reduce((sum, v, i) => sum + v * v2[i], 0);
  const normA = Math.sqrt(v1.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(v2.reduce((sum, v) => sum + v * v, 0));
  const result = dot / (normA * normB);
  return result;
}

async function interpretarMensagemIA(frase, debugLog = []) {
  const texto = frase.toLowerCase();
  if (debugLog) debugLog.push({ etapa: "inicio_interpretar", frase });

  function extrairValor(texto) {
    const match = texto.match(/\d+[.,]?\d*/);
    return match ? parseFloat(match[0].replace(',', '.')) : null;
  }
  function tentarTipoPeloTexto(texto) {
    if (/(\b(recebi|ganhei|entrou|venda|depositaram|vendi)\b)/i.test(texto)) return 'entrada';
    if (/(\b(gastei|paguei|comprei|investi|retirada|doei|mandei|transferi|pagar|boleto|conta|mensalidade|aluguel|internet|fatura|cartão|empréstimo|seguro)\b)/i.test(texto)) return 'saida';
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

  const valorDireto = extrairValor(texto);
  const tipoDireto = tentarTipoPeloTexto(texto);
  const categoriaDireta = tentarCategoriaSimples(texto);
  const resultadoData = extrairDataNatural(frase);
  const dataISO = resultadoData && resultadoData.dataISO ? resultadoData.dataISO : new Date().toISOString().slice(0, 10);
  const periodo = extrairPeriodoDaFrase(frase);

  // REFORÇO: Detecta intenção de agendamento por termos + data futura (antes do embedding)
  const termosAgendamento = /(preciso|vou|tenho que|agendar|receber|pagar|depositar)/i;
  const hojeISO = new Date().toISOString().slice(0,10);
  let forcarAgendamento = false;

  if (
    termosAgendamento.test(texto) &&
    dataISO && dataISO > hojeISO &&
    valorDireto && tipoDireto
  ) {
    forcarAgendamento = true;
  }

  // Se detectou heurística de agendamento ANTES do embedding
  if (forcarAgendamento) {
    if (debugLog) debugLog.push({
      etapa: "interpretação_direta_forçada_agendamento",
      intencao: 'registrar_agendamento',
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase,
      categoria: categoriaDireta,
      data: dataISO,
      data_vencimento: dataISO,
      periodo,
      similaridade: 1
    });

    const respostaIncompleta = analisarLancamentoIncompleto({
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase
    });
    if (respostaIncompleta) {
      return {
        erro: true,
        mensagem: respostaIncompleta,
        intencao: 'registrar_agendamento',
        tipo: tipoDireto,
        valor: valorDireto,
        descricao: frase,
        categoria: categoriaDireta,
        data: dataISO,
        data_vencimento: dataISO,
        periodo,
        similaridade: 1
      };
    }

    return {
      intencao: 'registrar_agendamento',
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase,
      categoria: categoriaDireta,
      data: dataISO,
      data_vencimento: dataISO,
      periodo,
      similaridade: 1
    };
  }

  // Se encontrou valor e tipo direto, retorna sem gastar embedding!
  if (tipoDireto && valorDireto) {
    if (debugLog) debugLog.push({
      etapa: "interpretação_direta",
      intencao: tipoDireto === 'entrada' ? 'registrar_entrada' : 'registrar_saida',
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase,
      categoria: categoriaDireta,
      data: dataISO,
      periodo,
      similaridade: 1
    });

    const respostaIncompleta = analisarLancamentoIncompleto({
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase
    });
    if (respostaIncompleta) {
      if (debugLog) debugLog.push({ etapa: "lancamento_incompleto", motivo: respostaIncompleta });
      return {
        erro: true,
        mensagem: respostaIncompleta,
        intencao: tipoDireto === 'entrada' ? 'registrar_entrada' : 'registrar_saida',
        tipo: tipoDireto,
        valor: valorDireto,
        descricao: frase,
        categoria: categoriaDireta,
        data: dataISO,
        periodo,
        similaridade: 1
      };
    }

    if (debugLog) debugLog.push({ etapa: "fim_interpretar", via: "direto" });

    return {
      intencao: tipoDireto === 'entrada' ? 'registrar_entrada' : 'registrar_saida',
      tipo: tipoDireto,
      valor: valorDireto,
      descricao: frase,
      categoria: categoriaDireta,
      data: dataISO,
      periodo,
      similaridade: 1
    };
  }

  // --- IA EMBEDDING (Fallback) ---
  const embeddingFrase = await gerarEmbedding(texto, /* debugLog */);
  let melhor = { similaridade: 0, intencao: "comando_invalido" };

  for (const item of baseVetorial) {
    if (!item.embedding || !Array.isArray(item.embedding) || item.embedding.length === 0) {
      continue;
    }
    const sim = cosineSimilarity(embeddingFrase, item.embedding /*, debugLog */);
    if (sim > melhor.similaridade) {
      melhor = { similaridade: sim, intencao: item.intencao.toLowerCase() }; // FORÇA lower case
    }
  }

  if (melhor.similaridade < 0.75) {
    if (debugLog) debugLog.push({ etapa: "intencao_baixa_similaridade", similaridade: melhor.similaridade });
    return {
      erro: true,
      mensagem: "Não entendi. Você deseja registrar, consultar ou configurar algo?"
    };
  }

  // PATCH: Não atribuir categoria para consultas
  const intencoesSemCategoria = [
    "consultar_extrato", "consultar_saldo", "consultar_entradas", "consultar_saidas",
    "consultar_maior_gasto", "consultar_maior_entrada"
  ];
  let categoria = null;
  if (!intencoesSemCategoria.includes(melhor.intencao)) {
    categoria = 'Outro';
    try {
      categoria = await classificarCategoriaViaIA(frase);
      if (debugLog) debugLog.push({ etapa: "categoria_classificada", categoria });
    } catch (e) {
      if (debugLog) debugLog.push({ etapa: "erro_classificacao_categoria", erro: e.message });
    }
  }

  let tipo = null;
  if (["registrar_entrada", "entrada", "recebimento", "salario"].includes(melhor.intencao)) {
    tipo = "entrada";
  } else if (["registrar_saida", "saida", "gasto", "despesa"].includes(melhor.intencao)) {
    tipo = "saida";
  }

  // PATCH para agendamentos
  if (melhor.intencao === "registrar_agendamento" && !tipo) {
    if (/pagar|boleto|conta|despesa|comprar|mensalidade|aluguel|internet|fatura|cartão|empréstimo|seguro/i.test(frase)) {
      tipo = "saida";
    } else if (/receber|entrada|venda|deposito|pagaram|recebi|entrou|salário|renda/i.test(frase)) {
      tipo = "entrada";
    } else {
      tipo = "saida"; // padrão seguro
    }
  }

  // Extração de valor mesmo via embeddings
  const valorMatch = texto.match(/\d+[.,]?\d*/);
  const valor = valorMatch ? parseFloat(valorMatch[0].replace(",", ".")) : null;

  if (debugLog) debugLog.push({
    etapa: "dados_extraidos",
    via: "embedding",
    intencao: melhor.intencao, tipo, valor, descricao: frase, categoria, data: dataISO, periodo, similaridade: melhor.similaridade
  });

  const respostaIncompleta = analisarLancamentoIncompleto({
    tipo,
    valor,
    descricao: frase
  });

  if (respostaIncompleta) {
    if (debugLog) debugLog.push({ etapa: "lancamento_incompleto", motivo: respostaIncompleta });
    return {
      erro: true,
      mensagem: respostaIncompleta,
      intencao: melhor.intencao,
      tipo,
      valor,
      descricao: frase,
      categoria,
      data: dataISO,
      periodo,
      similaridade: melhor.similaridade
    };
  }

  if (debugLog) debugLog.push({
    etapa: "fim_interpretar",
    via: "embedding",
    intencao: melhor.intencao, tipo, valor, descricao: frase, categoria, data: dataISO, periodo, similaridade: melhor.similaridade
  });

  // Retornar periodo para CONSULTAS
  if (["consultar_extrato", "consultar_entradas", "consultar_saidas", "consultar_maior_gasto", "consultar_maior_entrada", "consultar_saldo"].includes(melhor.intencao)) {
    return {
      intencao: melhor.intencao,
      tipo,
      valor,
      descricao: frase,
      categoria,
      data: dataISO,
      periodo,
      similaridade: melhor.similaridade
    };
  }

  // Para demais intenções (registro, etc), incluindo AGENDAMENTOS!
  if (melhor.intencao === "registrar_agendamento") {
    let dataVenc = null;
    if (periodo && periodo.inicio) dataVenc = periodo.inicio;
    else if (dataISO) dataVenc = dataISO;
    return {
      intencao: melhor.intencao,
      tipo,
      valor,
      descricao: frase,
      categoria,
      data: dataISO,
      data_vencimento: dataVenc,
      periodo,
      similaridade: melhor.similaridade
    };
  }

  // Para demais intenções (registro, etc)
  return {
    intencao: melhor.intencao,
    tipo,
    valor,
    descricao: frase,
    categoria,
    data: dataISO,
    periodo,
    similaridade: melhor.similaridade
  };
}

module.exports = interpretarMensagemIA;
