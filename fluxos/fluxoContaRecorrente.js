const extrairDataNatural = require("../utils/extrairDataNatural");

function iniciar(frase, estado) {
  estado.dados.descricao = frase;
  estado.etapa = "data";
  return "Para qual dia do mês você quer agendar '" + frase + "'?";
}

function continuar(frase, estado) {
  if (estado.etapa === "data") {
    const resultado = extrairDataNatural(frase);
    if (resultado) {
      estado.dados.data = resultado.dataISO;
      estado.etapa = "valor";
      return "E qual é o valor dessa conta?";
    } else {
      return "Não entendi a data. Pode informar o dia? (ex: dia 10)";
    }
  }

  if (estado.etapa === "valor") {
    const match = frase.match(/(\d+[.,]?\d*)/);
    if (match) {
      estado.dados.valor = parseFloat(match[1].replace(",", "."));
      estado.finalizado = true;
      return `✅ Conta '${estado.dados.descricao}' registrada com valor de R$ ${estado.dados.valor.toFixed(2)} todo dia ${estado.dados.data.slice(-2)}. Lembrete ativado!`;
    } else {
      return "Qual é o valor? (ex: 1200)";
    }
  }

  return "Quase lá! Só preciso da data e do valor.";
}

module.exports = { iniciar, continuar };
