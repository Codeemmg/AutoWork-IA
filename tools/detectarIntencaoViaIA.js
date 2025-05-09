const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

async function detectarIntencaoViaIA(frase) {
  const prompt = `
Você é um classificador de comandos de um assistente financeiro via WhatsApp.

Sua função é ler a frase e classificar apenas a intenção principal. Retorne **exatamente** um JSON no formato:

{
  "acao": "nome_da_acao"
}

Escolha UMA das seguintes ações:
- "maior_gasto"
- "resumo_semana"
- "entrada_mes"
- "resumo_completo"
- "entrada_periodo"
- "saida_periodo"
- "melhoria_financeira"
- "registro_financeiro"
- "duvida"
- "comando_invalido"

⚠️ A frase pode conter expressões como "hoje", "ontem", "essa semana", "entradas", "saídas", "completo", "dica", "quanto", etc.

### Exemplos:

#### 🔍 resumo_completo
- "quero um resumo completo do mês"
- "me traz um resumo financeiro completo"
- "resumo geral de abril"
- "resumo completo de hoje"
- "resumo financeiro completo da semana"
- "me mostre tudo que aconteceu esse mês"
- "quanto entrou e quanto saiu ontem?"
- "e hoje, como foi?"

#### 📥 entrada_periodo
- "quero ver as entradas dessa semana"
- "quanto eu recebi ontem?"
- "me mostra só as entradas do mês passado"
- "ganhei quanto hoje?"
- "me mostra quanto entrou esse mês"
- "entradas do dia"

#### 💸 saida_periodo
- "quanto eu gastei hoje?"
- "quero ver todas as saídas dessa semana"
- "me mostra só os gastos"
- "gastos de ontem"
- "quanto saiu nesse mês?"
- "saídas de hoje"

#### 📊 resumo_semana
- "quero um resumo da semana"
- "faz um resumo de hoje"
- "me dá o resumo de ontem"
- "resumo do dia"
- "como foi minha semana?"
- "me mostra um resumo rápido"

#### 🧠 melhoria_financeira
- "me dá uma dica financeira"
- "como posso economizar mais?"
- "quero uma sugestão para melhorar"
- "melhorar minhas finanças"
- "como melhorar meu controle financeiro?"

#### 💰 entrada_mes
- "quanto eu ganhei esse mês?"
- "entradas do mês"
- "salário do mês"
- "me mostra o que recebi em maio"

#### 🔎 maior_gasto
- "qual foi meu maior gasto?"
- "com o que eu mais gastei?"
- "maior despesa dessa semana"
- "qual categoria mais me prejudicou?"

#### 🧾 registro_financeiro
- "recebi 500 da minha cliente"
- "gastei 300 com gasolina"
- "comprei remédio por 120"
- "ganhei 200 de presente"
- "fiz uma venda de 1000 reais"

Frase do usuário: "${frase}"
`;

  try {
    const resposta = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um classificador de intenção.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    });

    const conteudo = resposta.choices[0].message.content;
    const json = JSON.parse(conteudo);

    return json.acao || "comando_invalido";

  } catch (err) {
    console.error("❌ Erro ao detectar intenção via IA:", err.message);
    return "comando_invalido";
  }
}

module.exports = detectarIntencaoViaIA;
