const { logEvent } = require('./logs');
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
const getSaleByCode = require('../tools/getSaleByCode');
const getLastSale = require('../tools/getLastSale');
const moment = require('moment');

// AGENDAMENTOS
const registerAgendamento = require('../agendamentos/registerAgendamento');
const getAgendamentos = require('../agendamentos/getAgendamentos');
const updateAgendamento = require('../agendamentos/updateAgendamento');
const removeAgendamento = require('../agendamentos/removeAgendamento');
const rotinaAgendamento = require('../agendamentos/rotinaAgendamento');
const lembreteAgendamento = require('../agendamentos/lembreteAgendamento');

async function agent(user_id, frase, debugLog = [], contextoPendente = null) {
    console.log('[DEBUG] Entrou em agent.js > agent');
  logEvent('AGENT_START', { user_id, frase, contextoPendente });

  let resultado;

  // --- CONTEXTO: Exclusão aguardando código ---
  if (contextoPendente && contextoPendente.tipo === 'excluir_registro' && contextoPendente.aguardandoCodigo) {
    const codigoInput = frase.trim().toUpperCase();
    if (codigoInput === "CANCELAR") {
      const conteudo = `Exclusão cancelada. O registro não foi excluído.`;
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const registro = await getSaleByCode(user_id, codigoInput);
    if (!registro) {
      const conteudo = `❌ Registro não encontrado para o código: ${codigoInput}\nInforme um código válido ou digite "cancelar".`;
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
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    } else if (["não", "nao", "cancelar", "desistir", "parar"].includes(confirm)) {
      const conteudo = `Exclusão cancelada. O registro não foi excluído.`;
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const conteudo = `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
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
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    } else if (["não", "nao", "cancelar", "desistir", "parar"].includes(confirm)) {
      const conteudo = `Exclusão cancelada. O último registro não foi excluído.`;
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog };
    }
    const conteudo = `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado: contextoPendente, debugLog, contextoPendente };
  }

  // --- CONTEXTO: Falta campo (valor, data, etc) ---
  if (contextoPendente && contextoPendente.faltaCampo) {
    // Padronize as mensagens para cada campo
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
  } else if (!resultado) {
    resultado = contextoPendente.resultado || {};
  }

  // --- EXCLUSÃO: Se usuário pedir para apagar, mas não informar o código ---
  if (resultado.intencao === "deletar_registro" && !resultado.codigo) {
    const conteudo = `Qual é o código do registro que você deseja apagar?`;
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
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog, erro: true };
    }
    const conteudo = `Você quer mesmo excluir este registro?\n\n`
      + `🆔 Código: *${registro.codigo}*\n`
      + `📝 Descrição: ${registro.descricao}\n`
      + `🏷️ Categoria: ${registro.categoria}\n`
      + `💰 Valor: R$ ${parseFloat(registro.valor).toFixed(2)}\n`
      + `📅 Data: ${registro.data}\n\n`
      + `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
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
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog, erro: true };
    }
    const conteudo = `Você quer mesmo excluir este registro?\n\n`
      + `🆔 Código: *${ultimo.codigo}*\n`
      + `📝 Descrição: ${ultimo.descricao}\n`
      + `🏷️ Categoria: ${ultimo.categoria}\n`
      + `💰 Valor: R$ ${parseFloat(ultimo.valor).toFixed(2)}\n`
      + `📅 Data: ${ultimo.data}\n\n`
      + `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      resultado,
      debugLog,
      contextoPendente: { tipo: 'excluir_ultimo_registro', aguardandoConfirmacao: true, codigo: ultimo.codigo }
    };
  }

  // --- EDIÇÃO DO ÚLTIMO REGISTRO ---
  if (resultado.intencao === "editar_ultimo_registro") {
    const ultimo = await getLastSale(user_id);
    if (!ultimo) {
      const conteudo = "Nenhum registro encontrado para editar!";
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog, erro: true };
    }
    const conteudo =
      `📝 *Edição do último registro*\n\n` +
      `🆔 Código: *${ultimo.codigo}*\n` +
      `📝 Descrição: ${ultimo.descricao}\n` +
      `🏷️ Categoria: ${ultimo.categoria}\n` +
      `💰 Valor: R$ ${parseFloat(ultimo.valor).toFixed(2)}\n` +
      `📅 Data: ${ultimo.data}\n\n` +
      `Qual campo você deseja editar? (valor, categoria ou descrição)`;

    return {
      tipo: 'texto',
      conteudo,
      resposta: conteudo,
      erro: true,
      faltaCampo: "campo",
      contextoPendente: {
        tipo: "editar_registro",
        aguardando: "campo",
        codigo: ultimo.codigo
      }
    };
  }

  // --- EDIÇÃO DE REGISTRO (pode expandir para etapas) ---
  // --- CONTEXTO: EDIÇÃO DE REGISTRO (modo passo a passo) ---
  if (contextoPendente && contextoPendente.tipo === 'editar_registro') {
    let { codigo, campo, aguardando, novo_valor } = contextoPendente;

    // Se estava aguardando o campo
    if (aguardando === "campo") {
      const resposta = frase.trim().toLowerCase();
      if (["valor", "categoria", "descrição", "descricao"].includes(resposta)) {
        campo = resposta === "descrição" ? "descricao" : resposta;
        return {
          tipo: 'texto',
          conteudo: `Qual o novo valor para o campo *${campo}*?`,
          resposta: `Qual o novo valor para o campo *${campo}*?`,
          erro: true,
          faltaCampo: "novo_valor",
          contextoPendente: { ...contextoPendente, campo, aguardando: "novo_valor" }
        };
      } else {
        return {
          tipo: 'texto',
          conteudo: `Campo não reconhecido. Responda apenas *valor*, *categoria* ou *descrição*.`,
          resposta: `Campo não reconhecido. Responda apenas *valor*, *categoria* ou *descrição*.`,
          erro: true,
          faltaCampo: "campo",
          contextoPendente: { ...contextoPendente, aguardando: "campo" }
        };
      }
    }

    // Se estava aguardando o novo valor
    if (aguardando === "novo_valor" && campo) {
      novo_valor = frase.trim();
      const updates = {};
      if (campo === "valor") updates.valor = novo_valor.replace(",", ".").replace("r$", "").trim();
      if (campo === "categoria") updates.categoria = novo_valor;
      if (campo === "descricao") updates.descricao = novo_valor;

      if (Object.keys(updates).length === 0) {
        return {
          tipo: 'texto',
          conteudo: `Nenhum campo válido foi informado para editar.`,
          resposta: `Nenhum campo válido foi informado para editar.`,
          erro: true
        };
      }

      const sucesso = await editSale(user_id, codigo, updates);
      const campoFormatado = campo.charAt(0).toUpperCase() + campo.slice(1);
      const conteudo = sucesso
        ? `✅ Registro ${codigo} atualizado!\n${campoFormatado} alterado para: *${novo_valor}*`
        : `❌ Não foi possível editar o registro. Tente novamente.`;
      return { tipo: 'texto', conteudo, resposta: conteudo, resultado: { codigo, campo, novo_valor }, debugLog };
    }

    // fallback
    return {
      tipo: 'texto',
      conteudo: `Algo deu errado no fluxo de edição. Recomece o comando ou informe todos os dados.`,
      resposta: `Algo deu errado no fluxo de edição. Recomece o comando ou informe todos os dados.`,
      erro: true
    };
  }

  // --- INÍCIO DO FLUXO DE EDIÇÃO (igual exclusão) ---
  if (resultado.intencao === "editar_registro") {
    let codigo = resultado.codigo;
    // Permite pedir para editar o último registro
    if (!codigo && frase.match(/(último|ultimo)/i)) {
      const ultimo = await getLastSale(user_id);
      if (!ultimo) {
        return {
          tipo: 'texto',
          conteudo: "Nenhum registro encontrado para editar!",
          resposta: "Nenhum registro encontrado para editar!",
          erro: true
        };
      }
      codigo = ultimo.codigo;
      resultado.codigo = codigo;
    }
    // Busca o registro para mostrar detalhes
    if (codigo) {
      const registro = await getSaleByCode(user_id, codigo);
      if (!registro) {
        return {
          tipo: 'texto',
          conteudo: `❌ Registro não encontrado para o código: ${codigo}\nPor favor, envie um código válido.`,
          resposta: `❌ Registro não encontrado para o código: ${codigo}\nPor favor, envie um código válido.`,
          erro: true
        };
      }
      // Mostra os dados e pergunta qual campo editar
      const conteudo =
        `📝 *Edição do registro*\n\n` +
        `🆔 Código: *${registro.codigo}*\n` +
        `📝 Descrição: ${registro.descricao}\n` +
        `🏷️ Categoria: ${registro.categoria}\n` +
        `💰 Valor: R$ ${parseFloat(registro.valor).toFixed(2)}\n` +
        `📅 Data: ${registro.data}\n\n` +
        `Qual campo você deseja editar? (valor, categoria ou descrição)`;

      return {
        tipo: 'texto',
        conteudo,
        resposta: conteudo,
        erro: true,
        faltaCampo: "campo",
        contextoPendente: {
          tipo: "editar_registro",
          aguardando: "campo",
          codigo: registro.codigo
        }
      };
    } else {
      // Se não informou código, pede!
      return {
        tipo: 'texto',
        conteudo: "Qual o código do registro que deseja editar?",
        resposta: "Qual o código do registro que deseja editar?",
        erro: true,
        faltaCampo: "codigo",
        contextoPendente: { tipo: "editar_registro", aguardando: "codigo" }
      };
    }
  }


    // --- REGISTROS FINANCEIROS ---
      if (
    ["registrar_entrada", "registrar_saida"].includes(resultado.intencao) &&
    !resultado.erro
  ) {
    // Verifica se a data é futura
    const dataLanc = resultado.data ? new Date(resultado.data) : new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataLanc.setHours(0, 0, 0, 0);

    // Use moment para data exibida
    const dataExibir = resultado.data ? moment(resultado.data).format('DD/MM/YYYY') : moment().format('DD/MM/YYYY');

    if (dataLanc > hoje) {
      // Se for futura, faz registro como agendamento!
      const resposta = await registerAgendamento(user_id, {
        ...resultado,
        data_vencimento: resultado.data,
        tipo: resultado.tipo,
        valor: resultado.valor,
        categoria: resultado.categoria,
        descricao: resultado.descricao,
      }, debugLog);
      const conteudo = `🔔 Agendamento salvo para *${dataExibir}*:
  📝 ${resultado.descricao}
  💰 Valor: R$ ${parseFloat(resultado.valor).toFixed(2)}
  🏷️ Categoria: ${resultado.categoria}
  `;
      return {
        tipo: 'texto',
        conteudo,
        resposta: conteudo,
        resultado: { ...resultado, data_vencimento: resultado.data },
        debugLog
      };
    }

    // Lançamento normal (passado ou hoje)
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
  📅 ${dataExibir}
  💰 Tipo: ${resultado.tipo === 'entrada' ? 'Entrada' : 'Saída'}
  📝 Descrição: ${resultado.descricao}
  🏷️ Categoria: ${resultado.categoria}
  📌 Valor: R$ ${parseFloat(resultado.valor).toFixed(2)}`;
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
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_agendamentos") {
    const resposta = await getAgendamentos(user_id, resultado, debugLog);
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "editar_agendamento") {
    const resposta = await updateAgendamento(user_id, resultado, debugLog);
    return { tipo: 'texto', conteudo: resposta, resposta, resultado, debugLog };
  }
  if (resultado.intencao === "remover_agendamento") {
    const resposta = await removeAgendamento(user_id, resultado, debugLog);
    return { tipo: 'texto', conteudo: resposta, resposta: resultado, debugLog };
  }
  if (resultado.intencao === "lembrete_agendamento") {
    const resposta = await lembreteAgendamento(user_id, resultado, debugLog);
    return { tipo: 'texto', conteudo: resposta, resposta: conteudo, resultado, debugLog };
  }
  if (resultado.intencao === "rotina_agendamento") {
    const resposta = await rotinaAgendamento(user_id, resultado, debugLog);
    return { tipo: 'texto', conteudo: resposta, resposta: conteudo, resultado, debugLog };
  }

  // --- CONSULTAS ---
  if (
    resultado.intencao === "consultar_extrato" ||
    resultado.intencao === "consultar_extrato_periodo"
  ) {
    // Se faltar período, envie mensagem clara:
    if (!resultado.periodo || !resultado.periodo.inicio || !resultado.periodo.fim) {
      const conteudo = "⚠️ Período inválido ou não informado. Por favor, especifique uma data inicial e final.";
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
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_entradas") {
    const texto = await gerarResumoCompleto(user_id, resultado.periodo, "entradas");
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_saidas") {
    const texto = await gerarResumoCompleto(user_id, resultado.periodo, "saidas");
    return { tipo: 'texto', conteudo: texto, resposta: texto, resultado, debugLog };
  }
  if (
    resultado.intencao === "consultar_saldo" ||
    resultado.intencao === "consultar_saldo_periodo"
  ) {
    const saldo = await consultarSaldo(user_id, resultado.periodo, debugLog);
    return { tipo: 'texto', conteudo: saldo, resposta: saldo, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_maior_gasto") {
    const maiorGasto = await consultartopGasto(user_id, resultado.periodo, debugLog);
    return { tipo: 'texto', conteudo: maiorGasto, resposta: maiorGasto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_maior_entrada") {
    const maiorEntrada = await consultarTopEntradas(user_id, resultado.periodo, debugLog);
    return { tipo: 'texto', conteudo: maiorEntrada, resposta: maiorEntrada, resultado, debugLog };
  }
  if (resultado.intencao === "dica_financeira") {
    const dica = await motorConsultivo(user_id, debugLog);
    return { tipo: 'texto', conteudo: dica, resposta: dica, resultado, debugLog };
  }

  // --- SAUDAÇÕES, ELOGIOS, SOCIAIS ---
  if (resultado.intencao === "saudacao") {
    const conteudo = "Olá! Como posso ajudar você com suas finanças hoje?";
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }
  if (resultado.intencao === "agradecimento") {
    const conteudo = "Disponha! Sempre que precisar, é só chamar.";
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }
  if (resultado.intencao === "erro_ou_duvida") {
    const conteudo = "Se precisar de ajuda, pode perguntar qualquer coisa. 😉";
    return { tipo: 'texto', conteudo, resposta: conteudo, resultado, debugLog };
  }

  // --- INTENÇÃO NÃO RECONHECIDA OU ERRO ---
  if (resultado.erro) {
    const conteudo = resultado.mensagem || "Não entendi, tente de outra forma.";
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
