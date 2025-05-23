const db = require('../db');
const moment = require('moment');

/**
 * Consulta agendamentos do usuário, com filtros opcionais.
 * @param {string|number} user_id
 * @param {object} resultado - Pode conter: { status, periodo, recorrencia }
 * @param {array} debugLog
 * @returns {string}
 */
async function getAgendamentos(user_id, resultado = {}, debugLog = []) {
    let sql = "SELECT * FROM registros_agendados WHERE user_id = ?";
    let params = [user_id];

    // Filtro por status (ex: ativo, pago, vencido)
    if (resultado.status) {
        sql += " AND status = ?";
        params.push(resultado.status);
    }

    // Filtro por recorrência (fixa, nenhum, etc)
    if (resultado.recorrencia) {
        sql += " AND recorrencia = ?";
        params.push(resultado.recorrencia);
    }

    // Filtro por período
    let data_min, data_max;
    if (resultado.periodo && resultado.periodo.inicio && resultado.periodo.fim) {
        data_min = resultado.periodo.inicio;
        data_max = resultado.periodo.fim;
    } else if (resultado.data_referencia) {
        // Suporte a frases tipo "amanhã", "hoje", "semana"
        const ref = resultado.data_referencia;
        if (ref === "amanha") {
            data_min = data_max = moment().add(1, 'day').format('YYYY-MM-DD');
        } else if (ref === "semana") {
            data_min = moment().startOf('week').format('YYYY-MM-DD');
            data_max = moment().endOf('week').format('YYYY-MM-DD');
        } else if (ref === "hoje") {
            data_min = data_max = moment().format('YYYY-MM-DD');
        }
    }

    if (data_min && data_max) {
        sql += " AND data_vencimento BETWEEN ? AND ?";
        params.push(data_min, data_max);
    }

    sql += " ORDER BY data_vencimento ASC";

    const [rows] = await db.query(sql, params);

    // Log da query
    if (debugLog) debugLog.push({
        etapa: "resposta_getAgendamentos",
        sql,
        params,
        total: rows.length
    });

    // Resposta amigável para WhatsApp
    if (!rows.length) {
        return "Nenhum agendamento encontrado nesse período!";
    }

    let resposta = "🗓️ *Seus agendamentos:*\n";
    rows.forEach(ag => {
        // Ícone: fixa 🔁, variável 💸, vencida ❗️
        let icone = "💸";
        if (ag.recorrencia && ag.recorrencia !== 'nenhum') icone = "🔁";
        if (ag.status === "vencido") icone = "❗️";
        if (ag.status === "pago") icone = "✅";

        resposta += `\n${icone} *${ag.descricao}* — ${moment(ag.data_vencimento).format('DD/MM/YYYY')}`;
        if (ag.valor) resposta += ` — R$ ${Number(ag.valor).toFixed(2)}`;
        if (ag.status && ag.status !== "ativo") resposta += ` (${ag.status})`;
        if (ag.recorrencia && ag.recorrencia !== 'nenhum') resposta += ` [fixa]`;
    });

    return resposta;
}

module.exports = getAgendamentos;
