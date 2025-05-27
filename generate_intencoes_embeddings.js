const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const intencoes = [
  // ENTRADA/RECEITA
  { intencao: "registrar_entrada_periodo", frases: [
  "recebi meu salário",
  "entrou um pix de 200",
  "ganhei comissão de venda",
  "recebi pagamento de cliente",
  "caiu dinheiro na conta",
  "depositaram 500 pra mim",
  "entrou transferência bancária",
  "vendi um produto hoje",
  "fiz uma venda agora",
  "entrou grana do serviço",
  "me pagaram 150",
  "pix recebido do João"

]
},


  // OUTROS EXEMPLOS...
  // Aqui adicione outras intenções específicas do seu negócio, sempre sem repetir frases entre intenções!
];


async function gerarEmbedding(texto) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texto
  });
  return response.data[0].embedding;
}

async function gerarBase() {
  const resultado = [];

  for (const item of intencoes) {
    for (const frase of item.frases) {
      console.log(`🧠 Embedding: [${item.intencao}] → "${frase}"`);
      const embedding = await gerarEmbedding(frase);
      resultado.push({
        intencao: item.intencao,
        frase,
        embedding
      });
    }
  }

  const outputPath = path.join(__dirname, "base_inteligencia_unificada.json");
  fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 2));
  console.log("\n✅ base_inteligencia_unificada.json gerado com sucesso!");
}

gerarBase();
