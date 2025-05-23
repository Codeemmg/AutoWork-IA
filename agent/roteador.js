const agent = require('./agent');
const superagent = require('./superagent');
const readline = require('readline');

// Roteador inteligente (profissional)
async function routeMessage(user_id, frase) {
    let debugLog = [];
    const respostaAgent = await agent(user_id, frase, debugLog);

    const intencao = respostaAgent.resultado && respostaAgent.resultado.intencao;
    const erro = respostaAgent.resultado && respostaAgent.resultado.erro;
    const similaridade = respostaAgent.resultado && respostaAgent.resultado.similaridade;

    // Define quando o SuperAgent deve ser chamado:
    const precisaSuperAgent =
        erro ||
        !intencao ||
        [
            'erro_ou_duvida',
            'ajuda',
            'explicacao',
            'tutorial',
            'saudacao',
            'comando_invalido'
        ].includes((intencao || '').toLowerCase()) ||
        (typeof similaridade === 'number' && similaridade < 0.75);

    if (precisaSuperAgent) {
        return await superagent(user_id, frase);
    }

    // Caso contrário, retorna a resposta clássica do agent.js
    return respostaAgent.resposta;
}

// === Interface interativa (console) ===

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const user_id = 'usuario_teste_router';

console.log('🤖 Roteador do AutoWork IA (Agent.js + SuperAgent) — Converse aqui! (Digite "sair" para encerrar)\n');

async function chatLoop() {
    rl.question('👤 Você: ', async (frase) => {
        if (frase.trim().toLowerCase() === 'sair') {
            console.log('🤖 Até logo! 🚀');
            rl.close();
            return;
        }
        try {
            const resposta = await routeMessage(user_id, frase);
            console.log('🤖 AutoWork:', resposta, '\n');
        } catch (err) {
            console.log('❌ Erro:', err.message);
        }
        chatLoop();
    });
}

// Só inicia o chat se rodar pelo terminal direto:
if (require.main === module) {
    chatLoop();
}

// **Exporta a função para uso no WhatsApp**
module.exports = routeMessage;
