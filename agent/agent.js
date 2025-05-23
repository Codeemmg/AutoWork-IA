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
  const resultado = await interpretarMensagemIA(frase, debugLog);

  // 1️⃣ Período padrão = mês atual, mas se veio um período do interpretador, usa ele!
  let periodo = {
    inicio: moment().startOf('month').format('YYYY-MM-DD'),
    fim: moment().endOf('month').format('YYYY-MM-DD')
  };
  if (resultado.periodo && resultado.periodo.inicio && resultado.periodo.fim) {
    periodo = resultado.periodo;
    if (debugLog) debugLog.push({ etapa: "periodo_personalizado", periodo });
  }

  // 2️⃣ REFORÇO: Se for entrada/saída com data futura e termos de agendamento, converte para agendamento
  const termosAgendamento = /(preciso|vou|tenho que|agendar|receber|pagar|depositar)/i;
  const hoje = moment().format('YYYY-MM-DD');
  if (
    ["registrar_entrada", "registrar_saida", "registrar_saida_periodo", "registrar_entrada_periodo"].includes(resultado.intencao) &&
    !resultado.erro &&
    resultado.data &&
    resultado.data > hoje &&
    termosAgendamento.test(frase)
  ) {
    resultado.intencao = "registrar_agendamento";
    resultado.data_vencimento = resultado.data;
  }

  // 3️⃣ REGISTROS FINANCEIROS (imediatos)
  if (
    ["registrar_entrada", "registrar_saida", "registrar_saida_periodo", "registrar_entrada_periodo"].includes(resultado.intencao) &&
    !resultado.erro
  ) {
    await registerSale(
      user_id,
      resultado.descricao,
      resultado.valor,
      resultado.tipo,
      resultado.categoria,
      resultado.data,
      debugLog
    );
    return {
      resposta: `✅ Registro salvo: *${resultado.descricao}* — R$${resultado.valor}`,
      resultado,
      debugLog
    };
  }

  // 4️⃣ CONSULTAS - sempre usam o período correto!
  if (
    resultado.intencao === "consultar_extrato" ||
    resultado.intencao === "consultar_extrato_periodo"
  ) {
    const texto = await gerarResumoCompleto(user_id, periodo, null);
    return { resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_entradas") {
    const texto = await gerarResumoCompleto(user_id, periodo, "entradas");
    return { resposta: texto, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_saidas") {
    const texto = await gerarResumoCompleto(user_id, periodo, "saidas");
    return { resposta: texto, resultado, debugLog };
  }

  // 5️⃣ CONSULTA DE SALDO (com saldo acumulado do mês anterior)
  if (
    resultado.intencao === "consultar_saldo" ||
    resultado.intencao === "consultar_saldo_periodo"
  ) {
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

  // 6️⃣ CONSULTA DE MAIOR GASTO
  if (resultado.intencao === "consultar_maior_gasto") {
    const maiorGasto = await consultartopGasto(user_id, periodo, debugLog);
    return { resposta: maiorGasto, resultado, debugLog };
  }

  // 7️⃣ CONSULTA DE MAIOR ENTRADA
  if (resultado.intencao === "consultar_maior_entrada") {
    const maiorEntrada = await consultarTopEntradas(user_id, periodo, debugLog);
    return { resposta: maiorEntrada, resultado, debugLog };
  }

  // 8️⃣ SUGESTÕES FINANCEIRAS
  if (resultado.intencao === "dica_financeira") {
    const dica = await motorConsultivo(user_id, debugLog);
    return { resposta: dica, resultado, debugLog };
  }

  // 9️⃣ SAUDAÇÕES, ELOGIOS, SOCIAIS
  if (resultado.intencao === "saudacao") {
    return { resposta: "Olá! Como posso ajudar você com suas finanças hoje?", resultado, debugLog };
  }
  if (resultado.intencao === "agradecimento") {
    return { resposta: "Disponha! Sempre que precisar, é só chamar.", resultado, debugLog };
  }
  if (resultado.intencao === "erro_ou_duvida") {
    return { resposta: "Se precisar de ajuda, pode perguntar qualquer coisa. 😉", resultado, debugLog };
  }

  // 🔟 AGENDAMENTOS (NOVOS FLUXOS)
  if (resultado.intencao === "registrar_agendamento") {
    // Garante que resultado.data_vencimento nunca será null
    if (!resultado.data_vencimento) {
      if (resultado.periodo && resultado.periodo.inicio) {
        resultado.data_vencimento = resultado.periodo.inicio;
      } else if (resultado.data) {
        resultado.data_vencimento = resultado.data;
      } else {
        resultado.data_vencimento = moment().format('YYYY-MM-DD');
      }
    }

    // Checagem de campos obrigatórios ANTES de chamar handler
    if (
      !resultado.descricao ||
      !resultado.valor ||
      !resultado.tipo ||
      !resultado.data_vencimento
    ) {
      return {
        resposta: "❌ Faltam informações obrigatórias (descrição, valor, tipo ou data de vencimento).",
        resultado,
        debugLog
      };
    }

    const resposta = await registerAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "consultar_agendamentos") {
    const resposta = await getAgendamentos(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "editar_agendamento") {
    const resposta = await updateAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "remover_agendamento") {
    const resposta = await removeAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "lembrete_agendamento") {
    const resposta = await lembreteAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }
  if (resultado.intencao === "rotina_agendamento") {
    const resposta = await rotinaAgendamento(user_id, resultado, debugLog);
    return { resposta, resultado, debugLog };
  }

  // 🔟 INTENÇÃO NÃO RECONHECIDA OU ERRO
  if (resultado.erro) {
    return { resposta: resultado.mensagem || "Não entendi, tente de outra forma.", resultado, debugLog };
  }

  // 11️⃣ DEFAULT: Fallback
  return { resposta: "Não entendi, tente reformular a frase.", resultado, debugLog };
}

module.exports = agent;
