const fluxoRegistroFinanceiro = require("../fluxos/fluxoRegistroFinanceiro");
const fluxoContaRecorrente = require("../fluxos/fluxoContaRecorrente");
const fluxoLembretePessoal = require("../fluxos/fluxoLembretePessoal");
const detectarTipoDeCompromisso = require("../utils/detectarTipoDeCompromisso");
const detectarFraseSocial = require("../utils/detectarFraseSocial");
const extrairDataNatural = require("../utils/extrairDataNatural");

let estado = {
  contexto: null,
  etapa: null,
  dados: {}
};

async function processarEntrada(frase) {
  const texto = frase.toLowerCase().trim();
  const social = detectarFraseSocial(texto);
  if (social) return social;

  // Se não há contexto, detecta intenção
  if (!estado.contexto) {
    const tipo = detectarTipoDeCompromisso(texto);

    if (tipo === "registro_financeiro") {
      estado.contexto = tipo;
      estado.etapa = "descricao";
      estado.dados = {};
      return fluxoRegistroFinanceiro.iniciar(frase, estado);
    }

    if (tipo === "registrar_conta_recorrente") {
      estado.contexto = tipo;
      estado.etapa = "descricao";
      estado.dados = {};
      return fluxoContaRecorrente.iniciar(frase, estado);
    }

    if (tipo === "lembrete_pessoal") {
      estado.contexto = tipo;
      estado.etapa = "descricao";
      estado.dados = {};
      return fluxoLembretePessoal.iniciar(frase, estado);
    }

    return "Não entendi. Você deseja registrar, consultar ou configurar algo?";
  }

  // Continuação do fluxo
  let resposta = "";

  if (estado.contexto === "registro_financeiro") {
    resposta = await fluxoRegistroFinanceiro.continuar(frase, estado);
  }

  if (estado.contexto === "registrar_conta_recorrente") {
    resposta = await fluxoContaRecorrente.continuar(frase, estado);
  }

  if (estado.contexto === "lembrete_pessoal") {
    resposta = await fluxoLembretePessoal.continuar(frase, estado);
  }

  // Reset se completo
  if (estado.finalizado) {
    estado = {
      contexto: null,
      etapa: null,
      dados: {},
      finalizado: false
    };
  }

  return resposta;
}

module.exports = { processarEntrada };
    