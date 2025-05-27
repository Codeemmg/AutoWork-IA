require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');

// IMPORTA SEU ROTEADOR LOCAL (ajuste o caminho se necessário)
const { routeMessage } = require('../agent/roteador'); // Ex: './router.js' ou './rotador.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// INTENÇÕES A SEREM TESTADAS
const INTENCOES = [
    "registrar_entrada",
    "consultar_entradas_mes",
    "registrar_saida",
    "consultar_saidas_mes",
    "consultar_saldo",
    "extrato_completo",
    "maior_gasto",
    "dica_financeira"
    // Adicione outras intenções conforme a necessidade
];

const FRASES_POR_INTENCAO = 15;
const USER_ID_TESTE = "testador_gpt";

// PROMPTS POR INTENÇÃO
const promptsPorIntencao = {
    registrar_entrada: `
Você é um gerador de comandos financeiros para um sistema chamado "MEU GESTOR".
Gere {QTD} frases REALISTAS de usuários registrando ENTRADAS de dinheiro.
Inclua valor, fonte e data (ou uso de "hoje", "ontem", "mês passado").
Exemplos:
- "recebi 500 do cliente João hoje"
- "entrou 1200 da venda de motos ontem"
- "ganhei 100 de comissão mês passado"
- "recebi 800 de transferência no banco ontem"
- "entrou 250 da consultoria dia 12/05"
Siga esse estilo, variando valor, fonte e datas. Apenas as frases, sem explicação.
    `,
    consultar_entradas_mes: `
Gere {QTD} frases em que o usuário PEDE para ver ENTRADAS de dinheiro em períodos (mês, semana, hoje, datas específicas).
Exemplos:
- "quais foram minhas entradas esse mês?"
- "quanto recebi esta semana?"
- "me mostra as entradas do dia 10/05 ao dia 20/05"
- "entradas registradas no mês passado"
- "quero saber o total de entradas hoje"
Varie o período nas frases. Apenas as frases, sem explicação.
    `,
    registrar_saida: `
Gere {QTD} frases REALISTAS de usuários registrando SAÍDAS de dinheiro, informando valor, tipo de despesa, destino e datas variadas.
Exemplos:
- "paguei 200 no fornecedor ontem"
- "gastei 50 reais com gasolina hoje"
- "comprei insumos por 400 reais mês passado"
- "paguei aluguel 1500 em 10/05"
- "gastei 70 reais na farmácia dia 12"
Siga esse estilo, variando valor, tipo de gasto e datas. Apenas as frases, sem explicação.
    `,
    consultar_saidas_mes: `
Gere {QTD} frases de usuários PEDINDO RESUMO DE SAÍDAS de dinheiro em períodos.
Exemplos:
- "quais foram minhas saídas esse mês?"
- "quanto gastei esta semana?"
- "me mostra as despesas do dia 10 ao dia 20"
- "quanto saiu mês passado?"
- "gastos registrados hoje"
Varie o período nas frases. Apenas as frases, sem explicação.
    `,
    consultar_saldo: `
Gere {QTD} frases de usuários querendo saber o saldo atual.
Exemplos:
- "qual meu saldo agora?"
- "quanto tenho em caixa?"
- "me mostra o saldo atual"
- "saldo do dia, por favor"
Varie a forma de perguntar. Apenas as frases, sem explicação.
    `,
    extrato_completo: `
Gere {QTD} frases de usuários pedindo EXTRATO COMPLETO, histórico de lançamentos ou relatório detalhado.
Exemplos:
- "me envie o extrato completo"
- "quero o histórico de todos os lançamentos"
- "relatório detalhado dos meus registros"
- "extrato geral"
Varie as frases. Apenas as frases, sem explicação.
    `,
    maior_gasto: `
Gere {QTD} frases de usuários querendo saber qual foi o maior gasto ou despesa.
Exemplos:
- "qual foi meu maior gasto esse mês?"
- "onde mais gastei dinheiro na semana?"
- "maior saída registrada este ano"
- "qual despesa foi a mais alta?"
Varie o período e a forma de perguntar. Apenas as frases, sem explicação.
    `,
    dica_financeira: `
Gere {QTD} frases de usuários pedindo dicas financeiras baseadas nos lançamentos.
Exemplos:
- "me dá uma dica para economizar mais esse mês"
- "qual sugestão financeira você tem pra mim?"
- "tem alguma dica para melhorar meu controle de gastos?"
- "como posso gastar menos com alimentação?"
Varie os pedidos. Apenas as frases, sem explicação.
    `
    // Adicione outras intenções com prompts próprios se necessário
};

// Função para gerar frases contextualizadas para cada intenção
async function gerarFrases(intencao, qtd = FRASES_POR_INTENCAO) {
    const promptBase = promptsPorIntencao[intencao];
    if (!promptBase) throw new Error(`Prompt não definido para intenção ${intencao}`);
    const prompt = promptBase.replace('{QTD}', qtd);

    const resposta = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
    });
    return resposta.choices[0].message.content
        .split('\n')
        .map(f => f.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
}

// Função para testar as frases no roteador
async function testarFrases(intencao, frases) {
    let relatorio = [];
    for (const frase of frases) {
        try {
            // Chama o roteador diretamente!
            const resultado = await routeMessage(USER_ID_TESTE, frase);
            // Esperado: { resposta: "...", modulo: "agent.js" | "superagent.js" }
            relatorio.push({ intencao, frase, ...resultado });
            console.log(`\n>>> [${intencao}] "${frase}"\n→ Módulo: ${resultado.modulo}\n→ Resposta: ${resultado.resposta}\n`);
        } catch (err) {
            relatorio.push({ intencao, frase, resposta: "ERRO AO CHAMAR ROTEADOR", modulo: "ERRO" });
            console.error(`Erro ao testar frase "${frase}": ${err.message}`);
        }
    }
    return relatorio;
}

// Função principal para rodar todos os testes
async function main() {
    let relatorioFinal = [];

    for (const intencao of INTENCOES) {
        console.log(`\n==== GERANDO FRASES PARA: ${intencao} ====`);
        const frases = await gerarFrases(intencao, FRASES_POR_INTENCAO);
        const relatorio = await testarFrases(intencao, frases);
        relatorioFinal = relatorioFinal.concat(relatorio);
    }

    fs.writeFileSync('relatorio_testador_gpt_local.json', JSON.stringify(relatorioFinal, null, 2), 'utf-8');
    console.log("\nRELATÓRIO FINAL SALVO EM: relatorio_testador_gpt_local.json");
}

main();
