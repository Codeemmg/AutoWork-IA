const readline = require("readline");
const agent = require("./agent/agent"); // Use o agent.js centralizador

const USER_ID = 553299642181;

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
    try {
      debugLog.push({ etapa: "mensagem_recebida", frase });

      // Chama o agent.js centralizador (garante sempre Promise)
      let resposta;
      try {
        resposta = await agent(USER_ID, frase, debugLog);
      } catch (agentErr) {
        debugLog.push({ etapa: "erro_agent", mensagem: agentErr.message });
        resposta = { resposta: "❌ Erro interno do assistente (agent.js)", erro: agentErr.message };
      }

      // Exibe os logs detalhados de fluxo
      console.log("\n====== LOG DE FLUXO ======");
      debugLog.forEach((log, idx) => {
        console.log(`Etapa ${idx + 1}:`, log);
      });
      console.log("====== FIM DO LOG ======\n");

      // Mostra resposta final de forma robusta
      if (resposta && typeof resposta === "object" && "resposta" in resposta) {
        console.log("🤖 IA:", resposta.resposta);
      } else if (typeof resposta === "string") {
        console.log("🤖 IA:", resposta);
      } else {
        console.log("🤖 IA: (sem resposta do agent)");
      }

    } catch (err) {
      debugLog.push({ etapa: "erro_geral", mensagem: err.message });
      console.error("❌ Erro durante o fluxo:", err.message);
    }

    perguntar();
  });
}

perguntar();
