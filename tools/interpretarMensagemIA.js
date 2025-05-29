require('dotenv').config();
const extrairDataNatural = require('../utils/extrairDataNatural');
const classificarCategoriaViaIA = require('./classificarCategoriaViaIA');
const analisarLancamentoIncompleto = require('../utils/analisarLancamentoIncompleto');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { format, startOfWeek, addDays } = require("date-fns");

const INTENCOES_SOCIAIS = [
  'saudacao',
  'agradecimento',
  'erro_ou_duvida',
  'conversa_social',
  'frase_vaga'
];

function extrairValor(frase) {
  if (!frase) return null;
  let fraseSemDatas = frase.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '');
  fraseSemDatas = fraseSemDatas.replace(/\b\d{1,2} de \w+\b/gi, '');

  // Ajuste: pega número inteiro ou decimal após palavras-chave
  const regexChave = /(por|no valor de|valor|r\$|reais)[^\d]*(\d+(?:[.,]\d{2})?)/gi;
  let matchChave = regexChave.exec(fraseSemDatas);
  if (matchChave && matchChave[2]) {
    let valorBruto = matchChave[2].replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
    let valorNum = parseFloat(valorBruto);
    if (!isNaN(valorNum) && valorNum > 0) return valorNum;
  }

  // Fallback: pega o maior número inteiro ou decimal da frase
  const regexValor = /(\d+(?:[.,]\d{2})?)/g;
  let matches = [];
  let match;
  while ((match = regexValor.exec(fraseSemDatas)) !== null) {
    let valorBruto = match[1].replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
    let valorNum = parseFloat(valorBruto);
    if (!isNaN(valorNum) && valorNum > 0) matches.push(valorNum);
  }

  return matches.length ? Math.max(...matches) : null;
}



// Função para extrair o código de um registro da frase
function extrairCodigo(frase) {
  let texto = frase.toLowerCase();
  // Captura por "código xyz123" ou "codigo: xyz123"
  let matchCodigo = texto.match(/c[óo]digo[:\s]*([a-z0-9]{4,10})/i);
  if (matchCodigo) return matchCodigo[1].toUpperCase();
  // Busca por "do codigo xyz123"
  let matchCodigo2 = texto.match(/do c[óo]digo\s*([a-z0-9]{4,10})/i);
  if (matchCodigo2) return matchCodigo2[1].toUpperCase();
  // Busca por "cód xyz123"
  let matchCodigo3 = texto.match(/c[óo]d\s*([a-z0-9]{4,10})/i);
  if (matchCodigo3) return matchCodigo3[1].toUpperCase();
  // Busca por "código xyz123" sem acento
  let matchCodigo4 = texto.match(/codigo\s*([a-z0-9]{4,10})/i);
  if (matchCodigo4) return matchCodigo4[1].toUpperCase();
  // Alternativa: "registro X123"
  let matchRegistro = texto.match(/registro\s*([a-z0-9]{4,10})/i);
  if (matchRegistro) return matchRegistro[1].toUpperCase();
  return null;
}

// Função auxiliar para identificar campos editáveis
function extrairCampoEdicao(frase) {
  frase = frase.toLowerCase();
  if (/valor|pre[çc]o|preco|quantia|preço/.test(frase)) return 'valor';
  if (/categoria|tipo de gasto|classifica[çc][aã]o/.test(frase)) return 'categoria';
  if (/descri[çc][aã]o|motivo|referente|observa[çc][aã]o/.test(frase)) return 'descricao';
  return null;
}

// Função para extrair novo valor da edição
function extrairNovoValor(frase, campo) {
  // Para valor, tenta pegar o número normalmente
  if (campo === 'valor') return extrairValor(frase);

  // Para categoria ou descrição, pega o texto após "para" ou "novo"
  let match = frase.match(/para ['"]?([^'"]{2,30})['"]?/i);
  if (match && campo !== 'valor') {
    return match[1].trim();
  }
  // Alternativa: "corrigir descrição do código X para Pão"
  match = frase.match(/(?:categoria|descri[çc][aã]o)[^\w]{1,10}([^\d]+)$/i);
  if (match && campo !== 'valor') {
    return match[1].trim();
  }
  return null;
}

// --- Padrão enterprise: Interpretação sempre modular e protegida ---
async function interpretarMensagemIA(frase, debugLog = []) {
  const fraseNorm = frase.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const texto = frase.toLowerCase();

  // 1️⃣ Detectar exclusão do último registro
  if (
    /(apagar|deletar|excluir)/i.test(fraseNorm) &&
    /(meu|o)?\s*ultim[oa]? (registro|lancamento|saida|entrada)/i.test(fraseNorm)
  ) {
    if (debugLog) debugLog.push({ etapa: "intencao_especial_detectada", intencao: 'deletar_ultimo_registro' });
    return {
      intencao: 'deletar_ultimo_registro',
      descricao: frase,
      similaridade: 1
    };
  }

  // 2️⃣ Detectar exclusão de registro específico (por código)
  if (
    /(apagar|deletar|excluir)/i.test(fraseNorm) &&
    /(registro|codigo|c[oó]digo)/i.test(fraseNorm)
  ) {
    const codigo = extrairCodigo(frase);
    if (debugLog) debugLog.push({ etapa: "intencao_especial_detectada", intencao: 'deletar_registro', codigo });
    return {
      intencao: 'deletar_registro',
      codigo,
      descricao: frase,
      similaridade: 1,
      erro: !codigo,
      faltaCampo: !codigo ? 'codigo' : null,
    };
  }

  // 3️⃣ Detectar edição do último registro
  if (
    /(editar|corrigir|trocar|alterar|atualizar)/i.test(fraseNorm) &&
    /(meu|o)?\s*ultim[oa]? (registro|lancamento|saida|entrada)/i.test(fraseNorm)
  ) {
    if (debugLog) debugLog.push({ etapa: "intencao_especial_detectada", intencao: 'editar_ultimo_registro' });
    return {
      intencao: 'editar_ultimo_registro',
      descricao: frase,
      similaridade: 1
    };
  }

  // 4️⃣ Detectar edição de registro específico (por código)
  if (
    /(editar|corrigir|trocar|alterar|atualizar)/i.test(fraseNorm) &&
    /(registro|codigo|c[oó]digo)/i.test(fraseNorm)
  ) {
    const codigo = extrairCodigo(frase);
    const campo = extrairCampoEdicao(frase);
    const novo_valor = campo ? extrairNovoValor(frase, campo) : null;
    if (debugLog) debugLog.push({ etapa: "intencao_especial_detectada", intencao: 'editar_registro', codigo, campo, novo_valor });
    return {
      intencao: 'editar_registro',
      codigo,
      campo,
      novo_valor,
      descricao: frase,
      similaridade: 1,
      erro: !codigo || !campo || novo_valor === null,
      faltaCampo: !codigo ? 'codigo' : !campo ? 'campo' : novo_valor === null ? 'novo_valor' : null,
    };
  }

  // 3️⃣ Extrai código se houver
  const codigo = extrairCodigo(frase);

  // Heurísticas rápidas
  const valorDireto = extrairValor(texto);

  // Detecta tipo e categoria básica
  function tentarTipoPeloTexto(txt) {
    if (/(\b(recebi|ganhei|entrou|venda|depositaram|vendi)\b)/i.test(txt)) return 'entrada';
    if (/(\b(gastei|paguei|comprei|investi|retirada|doei|mandei|transferi|pagar|boleto|conta|mensalidade|aluguel|internet|fatura|cartão|empréstimo|seguro)\b)/i.test(txt)) return 'saida';
    return null;
  }
  function tentarCategoriaSimples(txt) {
    if (/mercado|padaria|supermercado|comida/i.test(txt)) return 'Alimentação';
    if (/uber|gasolina|transporte|passagem|combustivel/i.test(txt)) return 'Transporte';
    if (/aluguel|mensalidade/i.test(txt)) return 'Despesas Fixas';
    if (/cinema|lazer|bar|restaurante/i.test(txt)) return 'Lazer';
    if (/remédio|farmácia|médico|consulta|nutricionista|pediatra/i.test(txt)) return 'Saúde';
    if (/livro|curso|faculdade|escola/i.test(txt)) return 'Educação';
    if (/salário|renda|pagamento|comissão|participação de lucro/i.test(txt)) return 'Renda';
    if (/investimento|aplicação/i.test(txt)) return 'Investimentos';
    if (/doação|caridade/i.test(txt)) return 'Doações';
    if (/imposto|taxa/i.test(txt)) return 'Impostos';
    if (/pagamento|despesa/i.test(txt)) return 'Despesas Variáveis';
    if (/empréstimo|dívida/i.test(txt)) return 'Empréstimos e Dívidas';
    if (/poupança|reserva/i.test(txt)) return 'Poupança e Reserva';
    if (/seguro|proteção/i.test(txt)) return 'Seguros e Proteção';
    if (/academia|futebol|futevolei|beach tennis|personal|treino|natação|gym/i.test(txt)) return 'Saúde e Bem-estar';
    return 'Outro';
  }

  const tipoDireto = tentarTipoPeloTexto(texto);
  const categoriaDireta = tentarCategoriaSimples(texto);

  // Datas e períodos
  const resultadoData = extrairDataNatural(frase);
  const dataISO = resultadoData && resultadoData.dataISO ? resultadoData.dataISO : new Date().toISOString().slice(0, 10);
  const periodo = resultadoData && resultadoData.periodo ? resultadoData.periodo : null;

  // --- IA EMBEDDING (Fallback) ---
  const projetoRaiz = path.resolve(__dirname, "..");
  const vetorPath = path.join(projetoRaiz, "core", "base_inteligencia_unificada.json");
  let baseVetorial = [];
  if (fs.existsSync(vetorPath)) {
    baseVetorial = JSON.parse(fs.readFileSync(vetorPath, "utf-8"));
  } else {
    console.error("❌ Caminho da base vetorial está errado ou não existe:", vetorPath);
  }

  // Gera embedding só se necessário (nunca para frases sociais)
  let melhor = { similaridade: 0, intencao: "comando_invalido" };
  let embeddingFrase = null;
  if (!tipoDireto && !valorDireto) {
    embeddingFrase = await openai.embeddings.create({ model: "text-embedding-ada-002", input: texto }).then(r => r.data[0].embedding);
    for (const item of baseVetorial) {
      if (!item.embedding || !Array.isArray(item.embedding) || item.embedding.length === 0) continue;
      const dot = embeddingFrase.reduce((sum, v, i) => sum + v * item.embedding[i], 0);
      const normA = Math.sqrt(embeddingFrase.reduce((sum, v) => sum + v * v, 0));
      const normB = Math.sqrt(item.embedding.reduce((sum, v) => sum + v * v, 0));
      const sim = dot / (normA * normB);
      if (sim > melhor.similaridade) {
        melhor = { similaridade: sim, intencao: item.intencao.toLowerCase() };
      }
    }
    if (melhor.similaridade < 0.75) {
      if (debugLog) debugLog.push({ etapa: "intencao_baixa_similaridade", similaridade: melhor.similaridade });
      return {
        erro: true,
        mensagem: "Não entendi. Você deseja registrar, consultar ou configurar algo?"
      };
    }
  } else {
    // Heurística direta: entrada/saída
    melhor.intencao = tipoDireto === 'entrada' ? 'registrar_entrada' : 'registrar_saida';
    melhor.similaridade = 1;
  }

  // -------------------------------------
  // 👇🏻 **FILTRO SOCIAL** — PRIMEIRO!
  if (INTENCOES_SOCIAIS.includes(melhor.intencao)) {
    if (debugLog) debugLog.push({ etapa: "intencao_social_detectada", intencao: melhor.intencao });
    return {
      intencao: melhor.intencao,
      tipo: null,
      valor: null,
      descricao: frase,
      categoria: null,
      data: dataISO,
      periodo,
      similaridade: melhor.similaridade
    };
  }
  // -------------------------------------

  // --- Se for consulta, não atribui categoria ---
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
  const valor = extrairValor(texto);

  if (debugLog) debugLog.push({
    etapa: "dados_extraidos",
    via: "embedding",
    intencao: melhor.intencao, tipo, valor, descricao: frase, categoria, data: dataISO, periodo, similaridade: melhor.similaridade,
    ...(codigo ? { codigo } : {})
  });

  // Checagem de campos obrigatórios — SÓ PARA REGISTROS
  if (["registrar_entrada", "registrar_saida", "registrar_agendamento"].includes(melhor.intencao)) {
    const respostaIncompleta = analisarLancamentoIncompleto({ tipo, valor, descricao: frase });
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
        similaridade: melhor.similaridade,
        ...(codigo ? { codigo } : {})
      };
    }
  }

  if (debugLog) debugLog.push({
    etapa: "fim_interpretar",
    via: "embedding",
    intencao: melhor.intencao, tipo, valor, descricao: frase, categoria, data: dataISO, periodo, similaridade: melhor.similaridade,
    ...(codigo ? { codigo } : {})
  });

  // Retornar periodo para CONSULTAS
  if ([
    "consultar_extrato",
    "consultar_entradas",
    "consultar_saidas",
    "consultar_maior_gasto",
    "consultar_maior_entrada",
    "consultar_saldo"
  ].includes(melhor.intencao)) {
    return {
      intencao: melhor.intencao,
      tipo,
      valor,
      descricao: frase,
      categoria,
      data: dataISO,
      periodo,
      similaridade: melhor.similaridade,
      ...(codigo ? { codigo } : {})
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
      similaridade: melhor.similaridade,
      ...(codigo ? { codigo } : {})
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
    similaridade: melhor.similaridade,
    ...(codigo ? { codigo } : {})
  };
}

module.exports = interpretarMensagemIA;
