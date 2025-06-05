const { OpenAI } = require('openai');
const PQueue = require('p-queue');
const pino = require('pino');
const { skillsCatalog } = require('../skills');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const queue = new PQueue({ concurrency: 1 });
const logger = pino();

async function decidir(msg, contexto = {}) {
  logger.info({ msg }, 'planner_decidir');
  try {
    const resp = await queue.add(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: msg }],
        tools: skillsCatalog.map(s => ({
          type: 'function',
          function: {
            name: s.name,
            description: s.description,
            parameters: s.parameters
          }
        })),
        tool_choice: 'auto'
      })
    );
    const choice = resp.choices[0];
    const call = choice.message.tool_calls?.[0];
    if (call) {
      const args = JSON.parse(call.function.arguments || '{}');
      return { skill: call.function.name, args };
    }
  } catch (e) {
    logger.error(e);
  }
  return { skill: 'clarificar_pergunta', args: { pergunta_original: msg } };
}

module.exports = { decidir };
