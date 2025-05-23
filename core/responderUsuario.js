const orquestrador = require("./orquestradorDeFluxo");
const interpretar = require("../tools/interpretarMensagemIA");

async function responderUsuario(usuarioId, mensagem) {
  // 1. Tenta seguir fluxo de conversa (memória)
  const respostaFluxo = await orquestrador.processarEntrada(usuarioId, mensagem);

  // Se o orquestrador retornou uma resposta conversacional (string)
  if (typeof respostaFluxo === "string") return respostaFluxo;

  // Se o orquestrador detectou que não há contexto (e portanto devemos interpretar diretamente)
  if (
    typeof respostaFluxo === "object" &&
    respostaFluxo.tipo &&
    (respostaFluxo.valor || respostaFluxo.categoria)
  ) {
    // É uma interpretação direta (resposta final já formatada)
    return respostaFluxo;
  }

  // 2. Se orquestrador não conseguiu tratar (mensagem muito objetiva ou não iniciou fluxo)
  const resultadoDireto = await interpretar(mensagem);

  // 3. Se ainda assim não tiver tipo válido, responde fallback
  if (!resultadoDireto || resultadoDireto.tipo === null) {
    return "Não entendi. Pode reformular ou me dizer se é um registro, conta ou lembrete?";
  }

  return resultadoDireto;
}

module.exports = { responderUsuario };
