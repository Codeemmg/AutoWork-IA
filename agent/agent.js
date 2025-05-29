const { logEvent } = require('./logs');
const { logDebug } = require('../tools/logger'); // IMPORTANTE!
const interpretarMensagemIA = require('../tools/interpretarMensagemIA');
const registerSale = require('../tools/registerSale');
const gerarResumoCompleto = require('../tools/gerarResumoCompleto');
const consultarSaldo = require('../tools/consultarSaldo');
const consultartopGasto = require('../tools/consultarTopGasto');
const consultarTopEntradas = require('../tools/consultarTopEntradas');
const motorConsultivo = require('../tools/motorConsultivo');
const deleteSale = require('../tools/deleteSale');
const editSale = require('../tools/editSale');
const consultarSaldoAcumulado = require('../tools/consultarSaldoAcumulado');
const getLastSale = require('../tools/getLastSale');
const getSaleByCode = require('../tools/getSaleByCode');
const moment = require('moment');

// AGENDAMENTOS
const registerAgendamento = require('../agendamentos/registerAgendamento');
const getAgendamentos = require('../agendamentos/getAgendamentos');
const updateAgendamento = require('../agendamentos/updateAgendamento');
const removeAgendamento = require('../agendamentos/removeAgendamento');
const rotinaAgendamento = require('../agendamentos/rotinaAgendamento');
const lembreteAgendamento = require('../agendamentos/lembreteAgendamento');

async function agent(user_id, frase, debugLog = [], contextoPendente = null) {
  logEvent('AGENT_START', { user_id, frase, contextoPendente });
  logDebug({ etapa: 'agent_inicio', user_id, frase, contextoPendente, debugLog });

  let resultado;

  // --- CONTEXTO: Exclusão aguardando código ---
  if (contextoPendente && contextoPendente.tipo === 'excluir_registro' && contextoPendente.aguardandoCodigo) {
    const codigoInput = frase.trim().toUpperCase();
    if (codigoInput === "CANCELAR") {
      const conteudo = `Exclusão cancelada. O registro não foi excluído.`;
      logDebug({ etapa: 'agent_exclusao_cancelada', user_id, frase, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const registro = await getSaleByCode(user_id, codigoInput);
    if (!registro) {
      const conteudo = `❌ Registro não encontrado para o código: ${codigoInput}\nInforme um código válido ou digite "cancelar".`;
      logDebug({ etapa: 'agent_exclusao_codigo_nao_encontrado', user_id, frase, conteudo, debugLog });
      return {
        tipo: 'texto',
        conteudo,
        resposta: conteudo,
        resultado: contextoPendente,
        debugLog,
        contextoPendente // Mantém aguardando
      };
    }
    // Achou, pedir confirmação!
    const conteudo = `Você quer mesmo excluir este registro?\n\n`
      + `🆔 Código: *${registro.codigo}*\n`
      + `📝 Descrição: ${registro.descricao}\n`
      + `🏷️ Categoria: ${registro.categoria}\n`
      + `💰 Valor: R$ ${parseFloat(registro.valor).toFixed(2)}\n`
      + `📅 Data: ${registro.data}\n\n`
      + `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    logDebug({ etapa: 'agent_exclusao_confirmacao', user_id, frase, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado: contextoPendente,
      debugLog,
      contextoPendente: { tipo: 'excluir_registro', aguardandoConfirmacao: true, codigo: registro.codigo }
    };
  }

  // --- CONTEXTO: Exclusão aguardando confirmação ---
  if (contextoPendente && contextoPendente.tipo === 'excluir_registro' && contextoPendente.aguardandoConfirmacao && contextoPendente.codigo) {
    const confirm = frase.trim().toLowerCase();
    if (["sim", "confirmar", "ok", "excluir", "pode apagar", "yes"].includes(confirm)) {
      const sucesso = await deleteSale(user_id, contextoPendente.codigo);
      const conteudo = sucesso
        ? `✅ Registro ${contextoPendente.codigo} excluído com sucesso!`
        : `❌ Registro não encontrado ou já foi excluído.`;
      logDebug({ etapa: 'agent_exclusao_confirmado', user_id, frase, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    } else if (["não", "nao", "cancelar", "desistir", "parar"].includes(confirm)) {
      const conteudo = `Exclusão cancelada. O registro não foi excluído.`;
      logDebug({ etapa: 'agent_exclusao_negado', user_id, frase, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const conteudo = `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    logDebug({ etapa: 'agent_exclusao_aguardando', user_id, frase, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog, contextoPendente };
  }

  // --- CONTEXTO: Exclusão do último registro ---
  if (contextoPendente && contextoPendente.tipo === 'excluir_ultimo_registro' && contextoPendente.aguardandoConfirmacao && contextoPendente.codigo) {
    const confirm = frase.trim().toLowerCase();
    if (["sim", "confirmar", "ok", "excluir", "pode apagar", "yes"].includes(confirm)) {
      const sucesso = await deleteSale(user_id, contextoPendente.codigo);
      const conteudo = sucesso
        ? `✅ Último registro (${contextoPendente.codigo}) excluído com sucesso!`
        : `❌ Último registro não encontrado ou já foi excluído.`;
      logDebug({ etapa: 'agent_exclusao_ultimo_confirmado', user_id, frase, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    } else if (["não", "nao", "cancelar", "desistir", "parar"].includes(confirm)) {
      const conteudo = `Exclusão cancelada. O último registro não foi excluído.`;
      logDebug({ etapa: 'agent_exclusao_ultimo_negado', user_id, frase, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const conteudo = `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    logDebug({ etapa: 'agent_exclusao_ultimo_aguardando', user_id, frase, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog, contextoPendente };
  }

  // --- CONTEXTO: Falta campo (valor, data, etc) ---
  if (contextoPendente && contextoPendente.faltaCampo) {
    let msg = "";
    switch (contextoPendente.faltaCampo) {
      case "valor":
        msg = "Qual o valor desse lançamento?";
        break;
      case "data":
        msg = "Qual a data para este lançamento?";
        break;
      case "categoria":
        msg = "Qual categoria você deseja informar?";
        break;
      default:
        msg = "Faltou um dado importante, pode informar?";
    }
    logDebug({ etapa: 'agent_contexto_falta_campo', user_id, frase, msg, debugLog });
    return {
      tipo: 'texto',
      conteudo: msg,
      resposta: msg,
      erro: true,
      faltaCampo: contextoPendente.faltaCampo,
      contextoPendente
    };
  }

  // --- INTERPRETA A INTENÇÃO DA FRASE (fluxo normal) ---
  if (!contextoPendente) {
    resultado = await interpretarMensagemIA(frase, debugLog);
    logDebug({ etapa: 'agent_interpretou', user_id, frase, resultado, debugLog });
  } else if (!resultado) {
    resultado = contextoPendente.resultado || {};
    logDebug({ etapa: 'agent_resultado_contexto', user_id, frase, resultado, debugLog });
  }

  // --- EXCLUSÃO: Se usuário pedir para apagar, mas não informar o código ---
  if (resultado.intencao === "deletar_registro" && !resultado.codigo) {
    const conteudo = `Qual é o código do registro que você deseja apagar?`;
    logDebug({ etapa: 'agent_deletar_sem_codigo', user_id, frase, resultado, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado,
      debugLog,
      erro: true,
      faltaCampo: 'codigo',
      contextoPendente: { tipo: 'excluir_registro', aguardandoCodigo: true }
    };
  }

  // --- Exclusão direta por código ---
  if (resultado.intencao === "deletar_registro" && resultado.codigo) {
    const registro = await getSaleByCode(user_id, resultado.codigo.toUpperCase());
    if (!registro) {
      const conteudo = `❌ Registro não encontrado pelo código informado: ${resultado.codigo.toUpperCase()}`;
      logDebug({ etapa: 'agent_deletar_codigo_invalido', user_id, frase, resultado, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog, erro: true };
    }
    const conteudo = `Você quer mesmo excluir este registro?\n\n`
      + `🆔 Código: *${registro.codigo}*\n`
      + `📝 Descrição: ${registro.descricao}\n`
      + `🏷️ Categoria: ${registro.categoria}\n`
      + `💰 Valor: R$ ${parseFloat(registro.valor).toFixed(2)}\n`
      + `📅 Data: ${registro.data}\n\n`
      + `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    logDebug({ etapa: 'agent_deletar_confirmacao', user_id, frase, resultado, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado,
      debugLog,
      contextoPendente: { tipo: 'excluir_registro', aguardandoConfirmacao: true, codigo: registro.codigo }
    };
  }

  // --- Deletar o último registro ---
  if (resultado.intencao === "deletar_ultimo_registro") {
    const ultimo = await getLastSale(user_id);
    if (!ultimo) {
      const conteudo = "Nenhum registro encontrado para excluir!";
      logDebug({ etapa: 'agent_deletar_ultimo_nao_ha', user_id, frase, resultado, conteudo, debugLog });
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog, erro: true };
    }
    const conteudo = `Você quer mesmo excluir este registro?\n\n`
      + `🆔 Código: *${ultimo.codigo}*\n`
      + `📝 Descrição: ${ultimo.descricao}\n`
      + `🏷️ Categoria: ${ultimo.categoria}\n`
      + `💰 Valor: R$ ${parseFloat(ultimo.valor).toFixed(2)}\n`
      + `📅 Data: ${ultimo.data}\n\n`
      + `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    logDebug({ etapa: 'agent_deletar_ultimo_confirmacao', user_id, frase, resultado, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado,
      debugLog,
      contextoPendente: { tipo: 'excluir_ultimo_registro', aguardandoConfirmacao: true, codigo: ultimo.codigo }
    };
  }

  // --- EDIÇÃO DE REGISTRO (pode expandir para etapas) ---
  if (resultado.intencao === "editar_registro" && resultado.codigo) {
    const updates = {};
    if (resultado.valor) updates.valor = resultado.valor;
    if (resultado.categoria) updates.categoria = resultado.categoria;
    if (resultado.descricao) updates.descricao = resultado.descricao;
    const sucesso = await editSale(user_id, resultado.codigo.toUpperCase(), updates);
    const conteudo = sucesso
      ? `✅ Registro ${resultado.codigo.toUpperCase()} editado com sucesso!`
      : `❌ Registro não encontrado ou não foi possível editar.`;
    logDebug({ etapa: 'agent_editar_registro', user_id, frase, resultado, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }

  // --- REGISTROS FINANCEIROS ---
  if (
    ["registrar_entrada", "registrar_saida"].includes(resultado.intencao) &&
    !resultado.erro
  ) {
    const codigo = await registerSale(
      user_id,
      resultado.descricao,
      resultado.valor,
      resultado.tipo,
      resultado.categoria,
      resultado.data,
      debugLog
    );
    const conteudo = `✅ Registro salvo!
🆔 Código: *${codigo}*
📅 ${new Date().toLocaleDateString('pt-BR')}
💰 Tipo: ${resultado.tipo === 'entrada' ? 'Entrada' : 'Saída'}
📝 Descrição: ${resultado.descricao}
🏷️ Categoria: ${resultado.categoria}
📌 Valor: R$ ${parseFloat(resultado.valor).toFixed(2)}`;
    logDebug({ etapa: 'agent_registro_financeiro', user_id, frase, resultado: { ...resultado, codigo }, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado: { ...resultado, codigo },
      debugLog
    };
  }

  // --- AGENDAMENTOS ---
  if (resultado.intencao === "registrar_agendamento" && !resultado.erro) {
    const resposta = await registerAgendamento(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_registrar_agendamento', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_agendamentos") {
    const resposta = await getAgendamentos(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_consultar_agendamentos', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "editar_agendamento") {
    const resposta = await updateAgendamento(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_editar_agendamento', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "remover_agendamento") {
    const resposta = await removeAgendamento(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_remover_agendamento', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta: resultado, debugLog };
  }
  if (resultado.intencao === "lembrete_agendamento") {
    const resposta = await lembreteAgendamento(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_lembrete_agendamento', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta: resposta, resultado, debugLog };
  }
  if (resultado.intencao === "rotina_agendamento") {
    const resposta = await rotinaAgendamento(user_id, resultado, debugLog);
    logDebug({ etapa: 'agent_rotina_agendamento', user_id, frase, resultado, resposta, debugLog });
    return { tipo: 'texto', conteudo: resposta, resposta: resposta, resultado, debugLog };
  }

  // --- CONSULTAS ---
  if (
    resultado.intencao === "consultar_extrato" ||
    resultado.intencao === "consultar_extrato_periodo"
  ) {
    if (!resultado.periodo || !resultado.periodo.inicio || !resultado.periodo.fim) {
      const conteudo = "⚠️ Período inválido ou não informado. Por favor, especifique uma data inicial e final.";
      logDebug({ etapa: 'agent_consulta_periodo_invalido', user_id, frase, resultado, conteudo, debugLog });
      return {
        tipo: 'texto',
        conteudo,
        resposta: conteudo,
        resultado,
        debugLog,
        erro: true,
        faltaCampo: 'periodo'
      };
    }
    const texto = await gerarResumoCompleto(user_id, resultado.periodo, null);
    logDebug({ etapa: 'agent_consulta_extrato', user_id, frase, resultado, texto, debugLog });
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_entradas") {
    const texto = await gerarResumoCompleto(user_id, resultado.periodo, "entradas");
    logDebug({ etapa: 'agent_consulta_entradas', user_id, frase, resultado, texto, debugLog });
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_saidas") {
    const texto = await gerarResumoCompleto(user_id, resultado.periodo, "saidas");
    logDebug({ etapa: 'agent_consulta_saidas', user_id, frase, resultado, texto, debugLog });
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (
    resultado.intencao === "consultar_saldo" ||
    resultado.intencao === "consultar_saldo_periodo"
  ) {
    const saldo = await consultarSaldo(user_id, resultado.periodo, debugLog);
    logDebug({ etapa: 'agent_consulta_saldo', user_id, frase, resultado, saldo, debugLog });
    return { tipo: 'texto', conteudo: saldo, resposta: saldo, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_maior_gasto") {
    const maiorGasto = await consultartopGasto(user_id, resultado.periodo, debugLog);
    logDebug({ etapa: 'agent_consulta_maior_gasto', user_id, frase, resultado, maiorGasto, debugLog });
    return { tipo: 'texto', conteudo: maiorGasto, resposta: maiorGasto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_maior_entrada") {
    const maiorEntrada = await consultarTopEntradas(user_id, resultado.periodo, debugLog);
    logDebug({ etapa: 'agent_consulta_maior_entrada', user_id, frase, resultado, maiorEntrada, debugLog });
    return { tipo: 'texto', conteudo: maiorEntrada, resposta: maiorEntrada, resultado, debugLog };
  }
  if (resultado.intencao === "dica_financeira") {
    const dica = await motorConsultivo(user_id, debugLog);
    logDebug({ etapa: 'agent_dica_financeira', user_id, frase, resultado, dica, debugLog });
    return { tipo: 'texto', conteudo: dica, resposta: dica, resultado, debugLog };
  }

  // --- SAUDAÇÕES, ELOGIOS, SOCIAIS ---
  if (resultado.intencao === "saudacao") {
    const conteudo = "Olá! Como posso ajudar você com suas finanças hoje?";
    logDebug({ etapa: 'agent_saudacao', user_id, frase, resultado, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }
  if (resultado.intencao === "agradecimento") {
    const conteudo = "Disponha! Sempre que precisar, é só chamar.";
    logDebug({ etapa: 'agent_agradecimento', user_id, frase, resultado, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }
  if (resultado.intencao === "erro_ou_duvida") {
    const conteudo = "Se precisar de ajuda, pode perguntar qualquer coisa. 😉";
    logDebug({ etapa: 'agent_erro_ou_duvida', user_id, frase, resultado, conteudo, debugLog });
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }

  // --- INTENÇÃO NÃO RECONHECIDA OU ERRO ---
  if (resultado.erro) {
    const conteudo = resultado.mensagem || "Não entendi, tente de outra forma.";
    logDebug({ etapa: 'agent_erro_intencao', user_id, frase, resultado, conteudo, debugLog });
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      erro: true,
      faltaCampo: resultado.faltaCampo || null,
      resultado,
      debugLog
    };
  }

  // --- DEFAULT: Fallback ---
  const conteudo = "Não entendi, tente reformular a frase.";
  logDebug({ etapa: 'agent_default_fallback', user_id, frase, resultado, conteudo, debugLog });
  return {
    tipo: 'texto',
    conteudo,
    resposta: conteudo,
    erro: true,
    resultado,
    debugLog
  };
}

module.exports = agent;
