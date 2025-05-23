const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const outputPath = path.join(__dirname, "base_inteligencia_unificada.json");

// Novas intenções/exemplos a serem adicionados:
const novasIntencoes = [
  // EXTRATO PERIODO
  {
    intencao: "registrar_agendamento",
    frases: [
      "me lembre de pagar a luz dia 5",
      "agendar aluguel de 1500 para todo dia 10",
      "cadastrar academia como despesa fixa dia 8",
      "agendar consulta médica para dia 14 de junho às 15h",
      "registrar pagamento do condomínio dia 10 todo mês",
      "programar transferência bancária para dia 22",
      "agendar conta de água como fixa"
    ]
  },
  // SALDO PERÍODO
  {
    intencao: "consultar_agendamentos",
    frases: [
      "o que tenho agendado para essa semana?",
      "me mostra os compromissos do mês",
      "quais contas fixas vencem amanhã?",
      "tem algo para pagar amanhã?",
      "me diga meus agendamentos para hoje",
      "mostre meus compromissos futuros"
    ]
  },

  {
    intencao: "editar_agendamento",
    frases: [
      "alterar valor do aluguel para 1600",
      "mudar vencimento da conta de luz para dia 7",
      "editar compromisso do dentista para sexta",
      "mudar data da consulta para dia 20",
      "atualizar valor da academia"
    ]
  },

  {
    intencao: "remover_agendamento",
    frases: [
       "cancelar agendamento da consulta médica",
      "remover aluguel fixo",
      "excluir compromisso do dentista",
      "apagar agendamento do condomínio",
      "deletar conta de água agendada"
    ]
  },  
];



async function gerarEmbedding(texto) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texto
  });
  return response.data[0].embedding;
}

async function atualizarBase() {
  let resultado = [];

  // 1. Carrega base existente, se existir
  if (fs.existsSync(outputPath)) {
    resultado = JSON.parse(fs.readFileSync(outputPath));
  }

  // 2. Adiciona novas frases/intenções (evitando duplicados)
  for (const item of novasIntencoes) {
    for (const frase of item.frases) {
      // Verifica se já existe frase igual para a intenção
      if (!resultado.some(reg => reg.intencao === item.intencao && reg.frase === frase)) {
        console.log(`🧠 Embedding: [${item.intencao}] → "${frase}"`);
        const embedding = await gerarEmbedding(frase);
        resultado.push({
          intencao: item.intencao,
          frase,
          embedding
        });
      } else {
        console.log(`🔎 Pulando frase já existente: [${item.intencao}] → "${frase}"`);
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 2));
  console.log("\n✅ base_inteligencia_unificada.json atualizado com sucesso!");
}

atualizarBase();
