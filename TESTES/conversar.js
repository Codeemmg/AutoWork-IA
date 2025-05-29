const readline = require("readline");
const { routeMessage } = require("../agent/roteador");
const { saveInteractionLog } = require("../agent/logs");
const USER_ID = 553299642181;

// Gerenciamento de contexto pendente por usuário (simula memória de sessão)
const contextoPendentePorUsuario = {};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("🤖 AutoWork IA (DEBUG PROFUNDO) pronto! Digite sua mensagem ou 'sair' para encerrar.");

async function perguntar() {
  rl.question("👤 Você: ", async (frase) => {
    if (frase.toLowerCase() === "sair" || frase.toLowerCase() === "exit") {
      console.log("👋 Encerrando a conversa. Até logo!");
      rl.close();
      return;
    }

    const debugLog = [];
    let quemChamou = 'roteador';
    let quemRespondeu = 'desconhecido';
    let resposta;

    // Recupera o contexto pendente do usuário, se houver
    const contexto = contextoPendentePorUsuario[USER_ID] || null;

    try {
      debugLog.push({ etapa: "mensagem_recebida", frase });

      // Passa o contexto pendente como argumento extra ao routeMessage
      resposta = await routeMessage(USER_ID, frase, debugLog, contexto);

      // Decide quem respondeu (agent ou superagent)
      quemRespondeu = resposta.quem_atendeu || (
        resposta.resultado && resposta.resultado.intencao ? 'agent' : 'superagent'
      );

      // Atualiza o contexto pendente com base na resposta do agent
      if (resposta.contextoPendente) {
        contextoPendentePorUsuario[USER_ID] = resposta.contextoPendente;
      } else {
        contextoPendentePorUsuario[USER_ID] = null;
      }

      // Exibe logs no terminal
      console.log("\n====== LOG DE FLUXO ======");
      debugLog.forEach((log, idx) => {
        console.log(`Etapa ${idx + 1}:`, log);
      });
      console.log("====== FIM DO LOG ======\n");

      // Mostra resposta
      if (resposta && typeof resposta === "object" && "resposta" in resposta) {
        console.log("🤖 IA:", resposta.resposta);
      } else if (typeof resposta === "string") {
        console.log("🤖 IA:", resposta);
      } else {
        console.log("🤖 IA: (sem resposta do agent)");
      }

      // Salva interação no log único do dia
      const logData = {
        dataHora: new Date().toISOString(),
        frase,
        resposta: resposta.resposta || resposta,
        intencao: resposta.resultado?.intencao || resposta.intencao_detectada || '-',
        quem_chamou: quemChamou,
        quem_respondeu: quemRespondeu,
        resultado: resposta.resultado || {},
        debugLog
      };
      saveInteractionLog(logData);

    } catch (err) {
      debugLog.push({ etapa: "erro_geral", mensagem: err.message });
      console.error("❌ Erro durante o fluxo:", err.message);
    }

    perguntar();
  });
}

perguntar();
