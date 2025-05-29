const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { logEvent } = require('./logs');
const { logDebug } = require('../tools/logger'); // NOVO LOG IMPORTADO!
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Caminho para salvar histórico (memória local)
const MEMORY_PATH = path.resolve(__dirname, 'memory');
if (!fs.existsSync(MEMORY_PATH)) fs.mkdirSync(MEMORY_PATH);

function getMemory(user_id) {
    const memFile = path.join(MEMORY_PATH, `${user_id}.json`);
    if (fs.existsSync(memFile)) {
        return JSON.parse(fs.readFileSync(memFile, 'utf-8'));
    }
    return [];
}

function saveMemory(user_id, memory) {
    const memFile = path.join(MEMORY_PATH, `${user_id}.json`);
    fs.writeFileSync(memFile, JSON.stringify(memory.slice(-10), null, 2)); // Mantém os últimos 10 turnos
}

/**
 * SuperAgent — 100% GPT, SEM fallback, SEM agent.js
 */
async function superagent(user_id, frase, resultado = null, debugLog = []) {
    logEvent('SUPERAGENT_START', { user_id, frase, resultado });

    // LOG INICIAL DO SUPERAGENT
    logDebug({
        etapa: 'superagent_inicio',
        user_id,
        frase,
        resultado,
        debugLog
    });

    // 1️⃣ Monta o prompt do sistema
    const systemPrompt = `
Você é o SuperAssistente do Meu Gestor — seu papel é representar o criador do sistema em cada resposta.
Responda como se fosse ele, com objetividade, clareza e comando.  
Seu tom é prático, humano, inteligente e confiável.

REGRAS:
- Fale de forma simples, curta e direta.
- Nunca se apresente. Nunca diga que é um assistente ou IA.
- Se a pergunta for sim/não → responda com "Sim" ou "Não" primeiro. Detalhe só se o usuário pedir.
- Se for tutorial ou explicação de uso → use até 3 passos, em tópicos.
- Se o usuário quiser detalhes → só traga mais se ele pedir ("detalhe", "explique", "quero saber mais").
- Se a pergunta estiver vaga → pergunte de volta com clareza: “Você pode me informar qual data e valor?”
- Se a dúvida for sobre valores → sempre comece com o número (ex: “R$ 250”).
- Se for um registro (entrada, saída, agendamento) → confirme se todas as informações foram enviadas antes de registrar.
- Se não souber a resposta → diga com sinceridade e oriente a procurar o suporte.
- Nunca explique sobre o sistema, AutoWork IA ou ecossistema — exceto se o usuário perguntar diretamente.

A cada resposta, atue como o criador do sistema responderia: direto ao ponto, com inteligência real, como se estivesse falando com um cliente importante.
`;

    // 2️⃣ Recupera memória conversacional
    let memory = getMemory(user_id);

    // 3️⃣ Monta mensagens para o GPT
    const messages = [
        { role: 'system', content: systemPrompt },
        ...memory.slice(-8),
        { role: 'user', content: frase }
    ];

    let respostaGPT = null;
    try {
        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o', // ou 'gpt-3.5-turbo'
            messages
        });
        respostaGPT = gptResponse.choices[0].message.content.trim();
        logEvent('SUPERAGENT_GPT_OK', { user_id, pergunta: frase, respostaGPT });

        // LOG SUCESSO DO GPT
        logDebug({
            etapa: 'superagent_gpt_sucesso',
            user_id,
            frase,
            respostaGPT,
            resultado,
            debugLog
        });

    } catch (error) {
        respostaGPT = "Não consegui analisar sua dúvida agora. Por favor, tente novamente ou peça suporte.";
        logEvent('SUPERAGENT_GPT_ERROR', { user_id, frase, error: error.message });

        // LOG ERRO DO GPT
        logDebug({
            etapa: 'superagent_gpt_erro',
            user_id,
            frase,
            erro: error.message,
            resultado,
            debugLog
        });
    }

    memory.push({ role: 'user', content: frase });
    memory.push({ role: 'assistant', content: respostaGPT });
    saveMemory(user_id, memory);

    // LOG FINAL DA RESPOSTA
    logDebug({
        etapa: 'superagent_fim',
        user_id,
        frase,
        respostaGPT,
        resultado,
        debugLog
    });

    return {
        tipo: 'texto',
        conteudo: respostaGPT,
        resposta: respostaGPT,
        quem_atendeu: "superagent",
        intencao_detectada: resultado?.intencao || "duvida_uso",
        similaridade: resultado?.similaridade || "-"
    };
}

module.exports = superagent;
