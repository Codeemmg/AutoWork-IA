const { logEvent } = require('./logs');
const superagent = require('./superagent');

const interpretarMensagemIA = require('../tools/interpretarMensagemIA');
const registerSale = require('../tools/registerSale');
const gerarResumoCompleto = require('../tools/gerarResumoCompleto');
const consultarSaldo = require('../tools/consultarSaldo');
const consultartopGasto = require('../tools/consultarTopGasto');
const consultarTopEntradas = require('../tools/consultarTopEntradas');
const motorConsultivo = require('../tools/motorConsultivo');
const consultarSaldoAcumulado = require('../tools/consultarSaldoAcumulado');
const moment = require('moment');

// AGENDAMENTOS
const registerAgendamento = require('../agendamentos/registerAgendamento');
const getAgendamentos = require('../agendamentos/getAgendamentos');
const updateAgendamento = require('../agendamentos/updateAgendamento');
const removeAgendamento = require('../agendamentos/removeAgendamento');
const rotinaAgendamento = require('../agendamentos/rotinaAgendamento');
const lembreteAgendamento = require('../agendamentos/lembreteAgendamento');

/**
 * Função central do AutoWork IA — pronta para qualquer interface!
 * @param {string} user_id - identificador único do usuário (ex: número WhatsApp)
 * @param {string} frase - mensagem do usuário
 * @param {array} debugLog - (opcional) array para log detalhado do fluxo
 * @returns {object} resposta final formatada
 */
async function agent(user_id, frase, debugLog = []) {
  logEvent('AGENT_START', { user_id, frase });

  const resultado = await interpretarMensagemIA(frase, debugLog);

  // Período padrão = mês atual, mas se veio um período do interpretador, usa ele!
  let periodo = {
    inicio: moment().startOf('month').format('YYYY-MM-DD'),
    fim: moment().endOf('month').format('YYYY-MM-DD')
  };
  if (resultado.periodo && resultado.periodo.inicio && resultado.periodo.fim) {
    periodo = resultado.periodo;
    if (debugLog) debugLog.push({ etapa: "periodo_personalizado", periodo });
  }

  // FLUXO DE REGISTRO E AGENDAMENTO — COM CHECAGEM DE VALOR E DATA
  if (
    ["registrar_entrada", "registrar_saida", "registrar_agendamento"].includes(resultado.intencao)
  ) {
    // 1. Checagem de valor
    if (!resultado.valor || isNaN(resultado.valor) || resultado.valor <= 0) {
      // Fallback: Superagent pergunta o valor
      return {
        resposta: "Qual o valor para registrar esse lançamento?",
        resultado,
        debugLog
      };
    }

    // 2. Checagem de data para períodos futuros (“próximo mês” etc.)
    let dataParaRegistro = resultado.data;
    if (
      resultado.periodo &&
      (resultado.periodo.diaDefault || resultado.periodo.inicio) &&
      (!resultado.data || resultado.data === "" || resultado.data === undefined)
    ) {
      // Se existe sugestão de dia default
      if (resultado.periodo.diaDefault) {
        return {
          resposta: `Quer registrar para o dia ${resultado.periodo.diaDefault.replace(/(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1")} do próximo mês ou prefere outro dia?`,
          resultado,
          debugLog
        };
      } else {
        // Se só tem período, mas não dia, sugere o início do período
        return {
          resposta: `Qual dia do ${resultado.periodo.inicio.slice(5,7)}/${resultado.periodo.inicio.slice(0,4)} você quer registrar?`,
          resultado,
          debugLog
        };
      }
    }

    // 3. Se valor e data existem, segue registro normal
    if (resultado.intencao === "registrar_entrada" || resultado.intencao === "registrar_saida") {
      await registerSale(
        user_id,
        resultado.descricao,
        resultado.valor,
        resultado.tipo,
        resultado.categoria,
        dataParaRegistro,
        debugLog
      );
      return {
        resposta: `✅ Registro salvo: *${resultado.descricao}* — R$${resultado.valor}`,
        resultado,
        debugLog
      };
    }
    if (resultado.intencao === "registrar_agendamento") {
      const resposta = await registerAgendamento(user_id, resultado, debugLog);
      return { resposta, resultado, debugLog };
    }
  }

  // CONSULTAS DE EXTRATO, ENTRADAS, SAÍDAS
  if (
    resultado.intencao === "consultar_extrato" ||
    resultado.intencao === "consultar_extrato_periodo"
  ) {
    logEvent('CONSULTA_EXTRATO', { user_id, periodo });
    const texto = await gerarResumoCompleto(user_id, periodo, null);
    return { resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_entradas") {
    logEvent('CONSULTA_ENTRADAS', { user_id, periodo });
    const texto = await gerarResumoCompleto(user_id, periodo, "entradas");
    return { resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_saidas") {
    logEvent('CONSULTA_SAIDAS', { user_id, periodo });
    const texto = await gerarResumoCompleto(user_id, periodo, "saidas");
    return { resposta: texto, resultado, debugLog };
  }

  // CONSULTA DE SALDO (com saldo acumulado do mês anterior)
  if (
    resultado.intencao === "consultar_saldo" ||
    resultado.intencao === "consultar_saldo_periodo"
  ) {
    logEvent('CONSULTA_SALDO', { user_id, periodo });
    const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
    const fimMes = moment().endOf('month').format('YYYY-MM-DD');
    if (
      periodo.inicio === inicioMes &&
      periodo.fim === fimMes
    ) {
      const ultimoDiaAnterior = moment(inicioMes).subtract(1, 'day').format('YYYY-MM-DD') + ' 23:59:59';
      const saldoAcumulado = await consultarSaldoAcumulado(user_id, ultimoDiaAnterior, debugLog);
      const saldoPeriodo = await consultarSaldo(user_id, periodo, debugLog);

      let resposta = `🔗 *Saldo acumulado até ${moment(inicioMes).subtract(1, 'day').format('DD/MM/YYYY')}:* R$ ${saldoAcumulado.toFixed(2)}\n\n`;
      resposta += saldoPeriodo;

      return { resposta, resultado, debugLog };
    } else {
      const saldo = await consultarSaldo(user_id, periodo, debugLog);
      return { resposta: saldo, resultado, debugLog };
    }
  }

  // CONSULTA DE MAIOR GASTO
  if (resultado.intencao === "consultar_maior_gasto") {
    logEvent('CONSULTA_MAIOR_GASTO', { user_id, periodo });
    const maiorGasto = await consultartopGasto(user_id, periodo, debugLog);
    return { resposta: maiorGasto, resultado, debugLog };
  }

  // CONSULTA DE MAIOR ENTRADA
  if (resultado.intencao === "consultar_maior_entrada") {
    logEvent('CONSULTA_MAIOR_ENTRADA', { user_id, periodo });
    const maiorEntrada = await consultarTopEntradas(user_id, periodo, debugLog);
    return { resposta: maiorEntrada, resultado, debugLog };
  }

  // SUGESTÕES FINANCEIRAS
  if (resultado.intencao === "dica_financeira") {
    logEvent('CONSULTA_DICA_FINANCEIRA', { user_id });
    const dica = await motorConsultivo(user_id, debugLog);
    return { resposta: dica, resultado, debugLog };
  }

  // SAUDAÇÕES, ELOGIOS, SOCIAIS
  if (resultado.intencao === "saudacao") {
    logEvent('SAUDACAO', { user_id });
    return { resposta: "Olá! Como posso ajudar você com suas finanças hoje?", resultado, debugLog };
  }
  if (resultado.intencao === "agradecimento") {
    logEvent('AGRADECIMENTO', { user_id });
    return { resposta: "Disponha! Sempre que precisar, é só chamar.", resultado, debugLog };
  }
  if (resultado.intencao === "erro_ou_duvida") {
    logEvent('SOCIAL_ERRO_DUVIDA', { user_id });
    return { resposta: "Se precisar de ajuda, pode perguntar qualquer coisa. 😉", resultado, debugLog };
  }

  // AGENDAMENTOS (NOVOS FLUXOS)
  if (resultado.intencao === "consultar_agendamentos") {
    logEvent('AGENDAMENTO_CONSULTA', { user_id, resultado });
    const resposta = await getAgendamentos(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "editar_agendamento") {
    logEvent('AGENDAMENTO_EDITAR', { user_id, resultado });
    const resposta = await updateAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "remover_agendamento") {
    logEvent('AGENDAMENTO_REMOVER', { user_id, resultado });
    const resposta = await removeAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "lembrete_agendamento") {
    logEvent('AGENDAMENTO_LEMBRETE', { user_id, resultado });
    const resposta = await lembreteAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "rotina_agendamento") {
    logEvent('AGENDAMENTO_ROTINA', { user_id, resultado });
    const resposta = await rotinaAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }

  // INTENÇÃO NÃO RECONHECIDA OU ERRO
  if (resultado.erro) {
    logEvent('AGENT_INTENCAO_ERRO', { user_id, resultado });
    // Fallback real para superagent, se disponível
    if (superagent && typeof superagent === 'function') {
      const respostaSuper = await superagent(user_id, frase, resultado);
      return respostaSuper || { resposta: resultado.mensagem || "Não entendi, tente de outra forma.", resultado, debugLog };
    }
    return { resposta: resultado.mensagem || "Não entendi, tente de outra forma.", resultado, debugLog };
  }

  // DEFAULT: Fallback inteligente para superagent
  logEvent('AGENT_FALLBACK', { user_id, frase, resultado });
  if (superagent && typeof superagent === 'function') {
    const respostaSuper = await superagent(user_id, frase, resultado);
    return respostaSuper || { resposta: "Não entendi, tente reformular a frase.", resultado, debugLog };
  }
  return { resposta: "Não entendi, tente reformular a frase.", resultado, debugLog };
}

module.exports = agent;
