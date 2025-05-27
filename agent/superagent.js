const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { logEvent } = require('./logs');
const agent = require('./agent');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    fs.writeFileSync(memFile, JSON.stringify(memory.slice(-10), null, 2));
}

async function superagent(user_id, frase, resultadoParcial = null) {
    let debugLog = [];
    logEvent('SUPERAGENT_START', { user_id, frase });

    // 1️⃣ Tenta resolver pelo agent.js
    let respostaAgent;
    try {
        respostaAgent = await agent(user_id, frase, debugLog);
    } catch (e) {
        logEvent('SUPERAGENT_AGENT_ERROR', { user_id, frase, error: e.message });
        respostaAgent = null;
    }
    logEvent('SUPERAGENT_AGENT_RESPONSE', { user_id, frase, respostaAgent });

    // 2️⃣ Decide se precisa acionar o GPT
    let intencao = respostaAgent && respostaAgent.resultado && respostaAgent.resultado.intencao;
    let respostaEhPrompt =
        respostaAgent && respostaAgent.resposta &&
        (
            /^qual o tipo/i.test(respostaAgent.resposta) ||
            /^qual o valor/i.test(respostaAgent.resposta) ||
            /^qual a descrição/i.test(respostaAgent.resposta)
        );

    let ehDuvidaOuEnsino = false;
    if (frase) {
        let fraseLower = frase.toLowerCase();
        ehDuvidaOuEnsino = (
            fraseLower.startsWith('como') ||
            fraseLower.includes('me ensina') ||
            fraseLower.includes('ajuda') ||
            fraseLower.startsWith('o que é') ||
            fraseLower.includes('explica') ||
            fraseLower.includes('tutorial') ||
            intencao === 'erro_ou_duvida' ||
            intencao === 'saudacao'
        );
    }

    let naoEntendeu =
        ehDuvidaOuEnsino ||
        respostaEhPrompt ||
        !intencao ||
        (respostaAgent && respostaAgent.resposta && /^não entendi/i.test(respostaAgent.resposta));

    // 3️⃣ NOVO BLOCO: Se a intenção é consulta e faltou parâmetro (ex: mês), tenta responder com defaults
    const INTENCOES_DEFAULT_PERIODO = [
        "consultar_saldo",
        "consultar_entradas",
        "consultar_saidas",
        "consultar_maior_gasto"
    ];
    // Se a intenção foi reconhecida e é de consulta, tenta responder com o agent para o mês atual
    if (
        intencao &&
        INTENCOES_DEFAULT_PERIODO.includes(intencao) &&
        (
            !respostaAgent.resposta ||
            /^você pode me informar/i.test(respostaAgent.resposta)
        )
    ) {
        // Força agent a assumir período default, se não já assumiu internamente
        // (Seu agent já assume mês atual se não vier período!)
        const respostaAgentPadrao = await agent(user_id, frase, debugLog);
        if (
            respostaAgentPadrao &&
            respostaAgentPadrao.resposta &&
            !/^Você pode me informar/i.test(respostaAgentPadrao.resposta) // Evita loop de pergunta
        ) {
            memoryPush(user_id, frase, respostaAgentPadrao.resposta); // registra na memória
            logEvent('SUPERAGENT_AGENT_DEFAULT_OK', { user_id, resposta: respostaAgentPadrao.resposta });
            return {
                resposta: respostaAgentPadrao.resposta,
                intencao_detectada: respostaAgentPadrao.intencao_detectada || intencao,
                similaridade: "-",
                quem_atendeu: "superagent"
            };
        }
    }

    // 4️⃣ Memória do usuário
    let memory = getMemory(user_id);

    // 5️⃣ Se o agent respondeu bem (qualquer intenção), registra e retorna
    if (respostaAgent && !naoEntendeu) {
        memoryPush(user_id, frase, respostaAgent.resposta);
        logEvent('SUPERAGENT_AGENT_OK', { user_id, resposta: respostaAgent.resposta });
        return {
            resposta: respostaAgent.resposta,
            intencao_detectada: respostaAgent.intencao_detectada ||
                (respostaAgent.resultado && respostaAgent.resultado.intencao) ||
                "acao",
            similaridade: respostaAgent.similaridade !== undefined
                ? respostaAgent.similaridade
                : (respostaAgent.resultado && respostaAgent.resultado.similaridade !== undefined
                    ? respostaAgent.resultado.similaridade
                    : "-"),
            quem_atendeu: "superagent"
        };
    }

    // 6️⃣ Se não entendeu, chama o GPT
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

    const messages = [
        { role: 'system', content: systemPrompt },
        ...memory.slice(-8),
        { role: 'user', content: frase }
    ];

    let respostaGPT = null;
    try {
        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages
        });
        respostaGPT = gptResponse.choices[0].message.content.trim();
        logEvent('SUPERAGENT_GPT_OK', { user_id, pergunta: frase, respostaGPT });
    } catch (error) {
        respostaGPT = "Não consegui analisar sua dúvida agora. Por favor, tente novamente ou peça suporte.";
        logEvent('SUPERAGENT_GPT_ERROR', { user_id, frase, error: error.message });
    }

    memoryPush(user_id, frase, respostaGPT);

    return {
        resposta: respostaGPT,
        intencao_detectada: "duvida_uso",
        similaridade: "-",
        quem_atendeu: "superagent"
    };
}

// Função auxiliar para registrar memória sem repetir código
function memoryPush(user_id, frase, resposta) {
    let memory = getMemory(user_id);
    memory.push({ role: 'user', content: frase });
    memory.push({ role: 'assistant', content: resposta });
    saveMemory(user_id, memory);
}

module.exports = superagent;
