// roteador.js
const interpretarMensagemIA = require('../tools/interpretarMensagemIA');
const agent = require('./agent');
const superagent = require('./superagent');
const { logEvent } = require('./logs');
const { logDebug } = require('../tools/logger'); // IMPORTANTE!

// Lista de intenções sociais/conversa
const INTENCOES_SOCIAIS = [
    'saudacao',
    'agradecimento',
    'erro_ou_duvida',
    'conversa_social',
    'frase_vaga'
];

// Função principal do roteador
async function routeMessage(user_id, frase, debugLog = [], contextoPendente = null) {
    debugLog.push({ etapa: "inicio_roteador", frase });

    // Log início da mensagem
    logDebug({
        etapa: 'inicio_routeMessage',
        user_id,
        frase,
        contextoPendente
    });

    let respostaAgent;
    try {
        respostaAgent = await agent(user_id, frase, debugLog, contextoPendente);
    } catch (err) {
        debugLog.push({ etapa: "erro_agent", mensagem: err.message });
        logEvent('ROTEADOR_AGENT_ERROR', { user_id, frase, err: err.message });

        logDebug({
            etapa: 'erro_agent',
            user_id,
            frase,
            error: err.message,
            debugLog
        });

        return await superagent(user_id, frase, null, debugLog);
    }

    // Fallback universal: Se faltar qualquer campo ou erro de preenchimento
    if (respostaAgent?.erro && respostaAgent?.faltaCampo) {
        debugLog.push({ etapa: "fallback_superagent", motivo: respostaAgent.conteudo || respostaAgent.resposta });
        logEvent('ROTEADOR_FALLBACK_SUPERAGENT', { user_id, frase, motivo: respostaAgent.conteudo || respostaAgent.resposta });

        logDebug({
            etapa: 'fallback_superagent',
            user_id,
            frase,
            motivo: respostaAgent.conteudo || respostaAgent.resposta,
            respostaAgent,
            debugLog
        });

        return await superagent(user_id, frase, respostaAgent, debugLog);
    }

    // Se for intenção social ou vaga, encaminha para o superagent
    if (respostaAgent?.resultado?.intencao && INTENCOES_SOCIAIS.includes(respostaAgent.resultado.intencao)) {
        debugLog.push({ etapa: "roteador_decisao", para: "superagent", motivo: respostaAgent.resultado.intencao });
        logEvent('ROTEADOR_SUPERAGENT', { user_id, frase, intencao: respostaAgent.resultado.intencao });

        logDebug({
            etapa: 'social_para_superagent',
            user_id,
            frase,
            intencao: respostaAgent.resultado.intencao,
            respostaAgent,
            debugLog
        });

        return await superagent(user_id, frase, respostaAgent, debugLog);
    }

    debugLog.push({ etapa: "roteador_decisao", para: "agent", intencao: respostaAgent?.resultado?.intencao || "desconhecida" });
    logEvent('ROTEADOR_AGENT', { user_id, frase, intencao: respostaAgent?.resultado?.intencao });

    logDebug({
        etapa: 'final_para_agent',
        user_id,
        frase,
        intencao: respostaAgent?.resultado?.intencao || "desconhecida",
        respostaAgent,
        debugLog
    });

    return respostaAgent;
}

module.exports = { routeMessage };
