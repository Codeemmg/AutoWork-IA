const getAgendamentos = require('./getAgendamentos');
const { z } = require('zod');

exports.description = 'Lista agendamentos próximos ao vencimento';
exports.schema = z.object({
  user_id: z.string(),
  diasAntes: z.number().optional()
});

/**
 * Retorna lista de agendamentos para lembrete no período escolhido.
 */
async function lembreteAgendamento(user_id, diasAntes = 1) {
  const hoje = new Date();
  const dataInicio = new Date(hoje);
  const dataFim = new Date(hoje);
  dataFim.setDate(dataFim.getDate() + diasAntes);

  const agendamentos = await getAgendamentos({
    user_id,
    dataInicio: dataInicio.toISOString().slice(0, 10),
    dataFim: dataFim.toISOString().slice(0, 10),
    status: 'pendente'
  });

  // Aqui pode acionar push, WhatsApp, email, etc
  return agendamentos;
}

module.exports = lembreteAgendamento;
