// roteador.js
const { INTENT_THRESHOLD, FALLBACK_THRESHOLD } = require('./config');
const { logEvent } = require('./logs');
const agent = require('./agent');
const superagent = require('./superagent');
require('dotenv').config();

// Função de roteamento principal
async function routeMessage(user_id, frase) {
    logEvent('ROUTER_START', { user_id, frase });

    // 1. Detectar intenção e similaridade
    const { intencao, similaridade } = await detectarIntencao(frase);

    logEvent('INTENTION_DETECTED', { intencao, similaridade });

    if (similaridade >= INTENT_THRESHOLD) {
        logEvent('ROUTE_DECISION', { rota: 'agent', intencao, similaridade });
        const resposta = await agent(user_id, frase);

        // Fallback contextual: verifica se o agent respondeu erro de dados obrigatórios
        if (
            !resposta || resposta === 'undefined' ||
            (resposta.resultado && resposta.resultado.erro && (
                resposta.resultado.mensagem === "Qual o valor?" ||
                resposta.resultado.mensagem === "Qual o tipo do lançamento? (entrada ou saída)" ||
                resposta.resultado.mensagem.startsWith("❌ Faltam informações obrigatórias")
            ))
        ) {
            logEvent('FALLBACK_TO_SUPERAGENT', { motivo: 'Agent sem dado crítico', intencao, frase });
            return await superagent(user_id, frase);
        }

        return resposta;
    } else if (similaridade >= FALLBACK_THRESHOLD) {
        logEvent('ROUTE_DECISION', { rota: 'superagent', intencao, similaridade });
        return await superagent(user_id, frase);
    } else {
        logEvent('ROUTE_DECISION', { rota: 'nenhuma', intencao, similaridade });
        return "Desculpe, não entendi seu comando. Pode reformular?";
    }
}

// Simulação da função de detecção de intenção (use sua real!)
async function detectarIntencao(frase) {
    // ...chamar seu modelo de embeddings ou IA
    // Simulação:
    return { intencao: "consultar_saldo", similaridade: 0.92 }; // Exemplo
}

module.exports = { routeMessage };
