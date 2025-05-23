function analisarCompromissoOuContaIncompleta({ tipo, valor, dataISO, descricao }) {
  if (tipo !== "registrar_conta_recorrente" && tipo !== "lembrete_pessoal") {
    return null;
  }

  const faltando = [];

  if (!valor || valor <= 0) faltando.push("valor");
  if (!dataISO) faltando.push("data");

  // Monta resposta baseada nas ausências
  if (faltando.length === 0) return null;

  let resposta = "";

  if (tipo === "registrar_conta_recorrente") {
    resposta += "✅ Entendi! Você quer registrar um compromisso recorrente. ";
    if (dataISO) {
      resposta += `Vou agendar para todo dia ${dataISO.slice(-2)} com lembrete automático. `;
    }
    if (faltando.includes("valor")) {
      resposta += "Só preciso saber: qual é o valor desse compromisso?";
    }
  }

  if (tipo === "lembrete_pessoal") {
    resposta += "📌 Vou programar esse lembrete para você. ";
    if (faltando.includes("data")) {
      resposta += "Mas preciso saber: para qual dia quer que eu te avise?";
    }
    if (faltando.includes("valor")) {
      resposta += "Qual o valor envolvido, se houver?";
    }
  }

  return resposta.trim();
}

module.exports = analisarCompromissoOuContaIncompleta;
