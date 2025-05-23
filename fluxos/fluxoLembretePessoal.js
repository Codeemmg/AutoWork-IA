const extrairDataNatural = require("../utils/extrairDataNatural");

function iniciar(frase, estado) {
  estado.dados.descricao = frase;
  estado.etapa = "data";
  return "Beleza! Para qual dia você quer o lembrete?";
}

function continuar(frase, estado) {
  if (estado.etapa === "data") {
    const data = extrairDataNatural(frase);
    if (data) {
      estado.dados.data = data.dataISO;
      estado.finalizado = true;
      return `🔔 Lembrete agendado: "${estado.dados.descricao}" para ${estado.dados.data}.`;
    } else {
      return "Não entendi a data. Pode informar de outra forma? (ex: amanhã, dia 20)";
    }
  }

  return "Quase lá! Só preciso da data para o lembrete.";
}

module.exports = { iniciar, continuar };
