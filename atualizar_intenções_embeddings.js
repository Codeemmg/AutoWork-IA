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
    "intencao": "registrar_saida",
    "frases": [
      "gastei 100 no mercado",
      "paguei 50 de gasolina",
      "comprei uma pizza por 70 ontem",
      "paguei a fatura do cartão de crédito",
      "gastei com delivery hoje",
      "fiz uma compra no cartão",
      "paguei aluguel dia 5",
      "saquei 300 da conta",
      "gastei com remédio semana passada",
      "paguei a escola da filha",
      "paguei 300 do aluguel",
      "comprei um celular de 1200 reais",
      "gastei 250 reais em roupas",
      "paguei academia 90 reais",
      "gastei 150 de combustível"
    ]
  },
  {
    "intencao": "registrar_entrada",
    "frases": [
      "recebi 1200 do cliente",
      "entrou 500 da empresa",
      "ganhei 300 de comissão",
      "me pagaram 800 ontem",
      "salário caiu hoje",
      "depósito de 200 na conta",
      "recebi dinheiro do meu chefe",
      "venda de produto rendeu 600",
      "ganhei 100 de presente",
      "recebi pensão de 400",
      "comissão de vendas entrou",
      "salário depositado hoje",
      "recebi pagamento de consultoria",
      "entrou dinheiro da venda",
      "ganhei bônus de 150"
    ]
  },
  {
    "intencao": "consultar_saldo",
    "frases": [
      "quanto eu tenho disponível?",
      "me mostra meu saldo",
      "qual meu saldo do mês?",
      "saldo da semana",
      "tenho quanto na conta?",
      "saldo atual",
      "mostra o saldo do dia",
      "tem como ver saldo antigo?",
      "saldo disponível agora",
      "quero saber meu saldo"
    ]
  },
  {
    "intencao": "consultar_extrato",
    "frases": [
      "me mostra o extrato desse mês",
      "quero ver o resumo financeiro",
      "me envia o relatório de gastos",
      "extrato do dia",
      "extrato semanal",
      "quais foram meus lançamentos este mês?",
      "extrato do cartão",
      "relatório financeiro completo",
      "extrato detalhado",
      "ver extrato do ano",
      "resumo do mês passado"
    ]
  },
  {
    "intencao": "consultar_entradas",
    "frases": [
      "entradas desse mês",
      "o que entrou esse mês?",
      "quais foram as receitas?",
      "quanto recebi na semana?",
      "me mostra as entradas de janeiro",
      "todas as entradas de hoje",
      "recebimentos do mês passado",
      "lista de receitas",
      "mostra os depósitos recebidos"
    ]
  },
  {
    "intencao": "consultar_saidas",
    "frases": [
      "saídas do mês passado",
      "o que gastei esse mês?",
      "me mostra os gastos da semana",
      "todas as despesas de março",
      "qual foi minha maior despesa do mês?",
      "mostra tudo que paguei",
      "gastos de ontem",
      "despesas do ano",
      "lista de pagamentos realizados"
    ]
  },
  {
    "intencao": "consultar_maior_gasto",
    "frases": [
      "com o que mais gastei esse mês?",
      "maior despesa do mês",
      "onde foi meu maior gasto?",
      "qual o maior gasto do ano?",
      "top gasto de abril",
      "gasto mais alto da semana",
      "maior valor gasto",
      "meu maior gasto do semestre"
    ]
  },
  {
    "intencao": "consultar_maior_entrada",
    "frases": [
      "maior entrada do mês",
      "qual foi minha maior receita?",
      "onde ganhei mais dinheiro esse mês?",
      "entrada mais alta de janeiro",
      "maior valor recebido",
      "melhor entrada do semestre",
      "qual foi meu melhor recebimento?"
    ]
  },
  {
    "intencao": "registrar_agendamento",
    "frases": [
      "me lembre de pagar a luz dia 5",
      "agendar aluguel de 1500 para todo dia 10",
      "cadastrar academia como despesa fixa dia 8",
      "agendar consulta médica para dia 14/06 às 15h",
      "me avisa do boleto que vence dia 15",
      "programa para avisar do aluguel dia 1º",
      "tenho que receber do cliente dia 20",
      "anota que tenho que pagar aluguel dia 10",
      "me lembra de pagar internet na segunda",
      "programa lembrete para consulta sexta que vem"
    ]
  },
  {
    "intencao": "consultar_agendamentos",
    "frases": [
      "o que tenho agendado para essa semana?",
      "me mostra meus compromissos do mês",
      "quais contas fixas vencem amanhã?",
      "tem algum agendamento para hoje?",
      "próximos lembretes de pagamento",
      "compromissos futuros",
      "próximas contas para pagar",
      "lista de agendamentos do mês"
    ]
  },
  {
    "intencao": "deletar_registro",
    "frases": [
      "quero apagar um lançamento",
      "posso deletar uma entrada?",
      "remover gasto do mês passado",
      "apague os registros de janeiro",
      "excluir o boleto pago dia 12",
      "limpar todos os dados desse mês",
      "quero deletar todas as despesas de abril",
      "apaga meus registros antigos",
      "deleta as movimentações de março"
    ]
  },
  {
    "intencao": "editar_registro",
    "frases": [
      "quero mudar o valor do aluguel",
      "como altero uma conta?",
      "editar data do pagamento",
      "corrigir um lançamento antigo",
      "ajustar registro antigo",
      "quero corrigir um lançamento errado",
      "alterar valor de despesa",
      "ajustar uma receita",
      "modificar lançamento passado"
    ]
  },
  {
    "intencao": "duvida_uso",
    "frases": [
      "como faz para registrar um gasto?",
      "me ensina a usar o sistema",
      "onde vejo meus lançamentos antigos?",
      "tem como exportar para excel?",
      "como cadastro conta fixa?",
      "como agendar um lembrete?",
      "o que acontece se esquecer de pagar uma conta?",
      "para que serve a aba extrato?",
      "como funciona o autowork ia?",
      "explica como registrar uma venda"
    ]
  }
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
