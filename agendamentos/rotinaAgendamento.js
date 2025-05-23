const getAgendamentos = require('./getAgendamentos');
const registerSale = require('../tools/registerSale'); // Ou outro caminho se estiver diferente

/**
 * Executa os agendamentos do dia, criando registro real se necessário.
 */
async function rotinaAgendamento(user_id, hoje = new Date()) {
  const hojeISO = hoje.toISOString().slice(0, 10);

  // Busca agendamentos do dia
  const agendamentos = await getAgendamentos({
    user_id,
    dataInicio: hojeISO,
    dataFim: hojeISO,
    status: 'pendente'
  });

  // Para cada agendamento, registra saída/entrada
  for (const ag of agendamentos) {
    await registerSale(user_id, ag.descricao, ag.valor, ag.tipo, ag.categoria, hojeISO);
    // Aqui pode atualizar status para "efetivado"
    // await updateAgendamento(ag.id, { status: 'efetivado' });
  }
}

module.exports = rotinaAgendamento;
