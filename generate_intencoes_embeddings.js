const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const intencoes = [
  // ENTRADA/RECEITA
  { intencao: "registrar_entrada", frases: [
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
]},
  // SAÍDA/DESPESA
  { intencao: "registrar_saida", frases: [
  "paguei o aluguel",
  "gastei 120 reais no mercado",
  "comprei um presente",
  "paguei a fatura do cartão 4500",
  "gastei 50 no almoço",
  "comprei café por 7 reais",
  "paguei conta de luz",
  "fiz uma compra online",
  "despesa com uber",
  "foi débito hoje 300",
  "paguei a academia",
  "paguei o boleto do cartão 4500",
  "gastei 80 na farmácia",
  "saquei dinheiro do banco"
]
},
    // REGISTRO COM DATA PASSADA
  {intencao: "registrar_saida_periodo", frases:[
  "ontem paguei o boleto do cartão 4500",
  "semana passada comprei um presente",
  "no dia 10 paguei o aluguel",
  "mês passado paguei a academia",
  "no sábado gastei no restaurante",
  "comprei comida ontem",
  "anteontem paguei a luz",
  "semana retrasada fiz uma compra online",
  "no feriado gastei com viagem",
  "há dois dias paguei farmácia",
  "no último dia 5 comprei sapato"
]},
  // AGENDAR PAGAMENTO FUTURO
  { intencao: "agendar_pagamento", frases: [
  "preciso pagar o boleto do cartão dia 18",
  "me lembre de pagar a fatura amanhã",
  "agendar pagamento do cartão para semana que vem",
  "vou pagar aluguel segunda-feira",
  "marcar para pagar academia no dia 10",
  "agenda boleto para sexta-feira",
  "lembra de pagar a conta de luz dia 12",
  "programar pagamento da internet mês que vem",
  "tem boleto vencendo amanhã, agendar"
]},

  // CONSULTA SALDO
  { intencao: "consultar_saldo", frases: [
  "quanto eu tenho de saldo?",
  "meu saldo",
  "saldo atual",
  "qual meu saldo disponível?",
  "como está meu saldo?",
  "ver saldo",
  "quanto sobrou na conta?",
  "me diz o saldo"
]},
  // CONSULTA EXTRATO
  { intencao: "consultar_extrato", frases: [
  "me mostra o extrato",
  "extrato da semana",
  "extrato do mês",
  "consultar lançamentos",
  "quais foram as movimentações?",
  "ver extrato detalhado",
  "extrato do dia",
  "extrato completo"
]},
  // CONSULTA ENTRADAS
  { intencao: "consultar_entradas", frases: [
  "quanto recebi esse mês?",
  "minhas entradas",
  "entradas da semana",
  "quais entradas do mês?",
  "ganhos do mês",
  "me mostra os recebimentos",
  "quais valores entraram?",
  "teve entrada hoje?"
]
},
  // CONSULTA SAÍDAS
  { intencao: "consultar_saidas", frases: [
  "quais foram minhas despesas?",
  "quanto saiu esse mês",
  "minhas saídas da semana",
  "despesas da semana",
  "gastos do mês",
  "quanto gastei esse mês?",
  "me mostra os gastos",
  "tive despesa hoje?"
]},
  // MAIOR GASTO
  { intencao: "consultar_maior_gasto", frases: [
  "maior gasto da semana",
  "gasto mais alto do mês",
  "qual foi minha maior saída?",
  "onde gastei mais?",
  "maior despesa do período",
  "qual o maior valor gasto?",
  "maior compra do mês"
]},
  // MAIOR ENTRADA
  { intencao: "consultar_maior_entrada", frases: [
  "maior entrada do mês",
  "entrada mais alta",
  "ganho maior da semana",
  "maior recebimento",
  "maior valor recebido",
  "qual maior valor de entrada?",
  "recebimento mais alto"
]},
  //saudações
  {intencao: "saudacao", frases: [
  "bom dia",
  "boa tarde",
  "boa noite",
  "oi",
  "olá",
  "hello",
  "hey",
  "hi"
]},
  //duvidas
   {intencao: "duvidas", frases: [
  "não entendi",
  "repete por favor",
  "como faz para consultar saldo?",
  "ajuda",
  "pode explicar de novo?"
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
