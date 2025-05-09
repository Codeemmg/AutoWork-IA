const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

async function classificarCategoriaViaIA(frase) {
  const prompt = `
Classifique a frase abaixo em UMA das seguintes categorias:

- Receita
- Despesa
- Alimentação
- Transporte
- Compras
- Saúde
- Contas
- Despesas Fixas
- Transferência
- Lazer
- Educação

Frase: "${frase}"

Retorne somente a categoria exata como uma string. Exemplo: "Receita"
`;

  try {
    const resposta = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um classificador de categorias financeiras.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const categoria = resposta.choices[0].message.content.trim();
    return categoria;
  } catch (err) {
    console.error("Erro ao classificar categoria via IA:", err.message);
    return null;
  }
}

module.exports = classificarCategoriaViaIA;
