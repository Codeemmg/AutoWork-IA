const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

async function interpretarMensagemComIA(frase) {
  const prompt = `
Você é um classificador inteligente de registros financeiros para um assistente via WhatsApp.
Sua tarefa é ler a frase do usuário e devolver um JSON com as seguintes chaves:

{
  "tipo": "entrada" ou "saida",
  "valor": número (float, SEM R$),
  "descricao": string,
  "categoria": uma palavra-chave entre: Receita, Despesa, Transporte, Saúde, Lazer, Investimento, Educação, Moradia, Imposto, Venda, Outro
}

Regras:
- Nunca inclua "R$" no valor.
- A descrição deve ser curta, mas fiel à frase original.
- A categoria deve refletir o motivo do gasto ou recebimento, mesmo que implícito.
- Use "Outro" apenas se não houver nenhuma correspondência melhor.

Exemplos:
"recebi 200 da minha tia" → entrada, valor 200.00, descrição: "recebi da minha tia", categoria: Receita
"paguei 50 de uber" → saida, valor 50.00, descrição: "paguei de uber", categoria: Transporte
"comprei remédio por 32,50" → saida, valor 32.50, descrição: "comprei remédio", categoria: Saúde
"recebi 1500 de uma venda de curso" → entrada, valor 1500.00, descrição: "recebi de venda de curso", categoria: Venda

Frase: "${frase}"
Responda com apenas o JSON e nada mais.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um classificador financeiro inteligente.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const conteudo = response.choices[0].message.content.trim();
    return JSON.parse(conteudo);
  } catch (err) {
    console.error('❌ Erro ao interpretar mensagem com IA:', err.message);
    return {
      tipo: null,
      valor: null,
      descricao: frase,
      categoria: 'Outro'
    };
  }
}

module.exports = interpretarMensagemComIA;
