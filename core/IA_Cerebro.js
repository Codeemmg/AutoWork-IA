const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const fs = require("fs");
const path = require("path");
const IA_Decisor = require("./IA_Decisor");
const memoria = require("./memoria");

// Carrega base de intenções vetorizadas
const vetoresPath = path.join(__dirname, "base_intencoes.json");
let baseVetorial = [];

if (fs.existsSync(vetoresPath)) {
  baseVetorial = JSON.parse(fs.readFileSync(vetoresPath, "utf-8"));
} else {
  console.warn("Base vetorial de intenções não encontrada.");
}

async function gerarEmbedding(texto) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texto,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const normA = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  return dot / (normA * normB);
}

async function processarMensagem(mensagem, usuario_id) {
  const embeddingMsg = await gerarEmbedding(mensagem);

  // Busca melhor intenção
  let melhor = { similaridade: 0, item: null };
  for (const item of baseVetorial) {
    const sim = cosineSimilarity(embeddingMsg, item.embedding);
    if (sim > melhor.similaridade) {
      melhor = { similaridade: sim, item };
    }
  }

  if (!melhor.item || melhor.similaridade < 0.80) {
    return {
      acao: null,
      resposta: "Desculpe, não entendi sua solicitação.",
      confianca: melhor.similaridade,
    };
  }

  // Executa decisão
  const contexto = await memoria.obterContexto(usuario_id);
  const decisao = await IA_Decisor.executar(melhor.item.acao, mensagem, contexto);

  // Atualiza memória
  await memoria.salvarContexto(usuario_id, {
    ...contexto,
    ultima_acao: melhor.item.acao,
  });

  return {
    acao: melhor.item.acao,
    ...decisao,
    confianca: melhor.similaridade,
  };
}

module.exports = { processarMensagem };
