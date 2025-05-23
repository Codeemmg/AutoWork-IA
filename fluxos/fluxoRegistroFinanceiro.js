const extrairDataNatural = require("../utils/extrairDataNatural");

function iniciar(frase, estado) {
  estado.dados.descricao = frase;
  estado.etapa = "valor";
  return "Entendi! Qual foi o valor dessa transação?";
}

async function continuar(frase, estado) {
  if (estado.etapa === "valor") {
    const match = frase.match(/(\d+[.,]?\d*)/);
    if (match) {
      estado.dados.valor = parseFloat(match[1].replace(",", "."));
      estado.etapa = "data";
      return "Perfeito! Deseja registrar isso para hoje ou para outro dia?";
    } else {
      return "Não entendi o valor. Pode repetir? (ex: 180.50)";
    }
  }

  if (estado.etapa === "data") {
    const dataInfo = extrairDataNatural(frase);
    estado.dados.data = dataInfo ? dataInfo.dataISO : new Date().toISOString().slice(0, 10);
    estado.finalizado = true;

    return `✅ Transação registrada: ${estado.dados.descricao} — R$ ${estado.dados.valor.toFixed(2)} em ${estado.dados.data}`;
  }

  return "Só preciso do valor e da data.";
}

module.exports = { iniciar, continuar };
