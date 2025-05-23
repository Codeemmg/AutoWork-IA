const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Carrega embeddings das categorias
const categoriasPath = path.join(__dirname, "categorias_embeddings.json");
let categoriasVetoriais = [];

if (fs.existsSync(categoriasPath)) {
  categoriasVetoriais = JSON.parse(fs.readFileSync(categoriasPath, "utf-8"));
} else {
  console.warn("⚠️ Arquivo categorias_embeddings.json não encontrado.");
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

async function classificarCategoriaViaIA(frase) {
  if (categoriasVetoriais.length === 0) return null;

  const embeddingFrase = await gerarEmbedding(frase);

  let melhor = { similaridade: 0, categoria: null };
  for (const cat of categoriasVetoriais) {
    const sim = cosineSimilarity(embeddingFrase, cat.embedding);
    if (sim > melhor.similaridade) {
      melhor = { similaridade: sim, categoria: cat.nome };
    }
  }

  return melhor.categoria || null;
}

module.exports = classificarCategoriaViaIA;
