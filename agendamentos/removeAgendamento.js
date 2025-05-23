const db = require('../db');

/**
 * Remove um agendamento por ID.
 * @param {string|number} user_id - ID do usuário (não usado aqui, mas pode ser útil para validação futura)
 * @param {object} resultado - Deve conter { id }
 * @param {array} debugLog
 * @returns {string}
 */
async function removeAgendamento(user_id, resultado = {}, debugLog = []) {
    const { id } = resultado;

    if (!id) {
        if (debugLog) debugLog.push({ etapa: "erro_id_ausente" });
        return "❌ Informe o ID do agendamento que deseja remover.";
    }

    try {
        const [res] = await db.query('DELETE FROM registros_agendados WHERE id = ?', [id]);
        if (debugLog) debugLog.push({ etapa: "remocao_agendamento", id, afetados: res.affectedRows });

        if (res.affectedRows > 0) {
            return `✅ Agendamento removido com sucesso! (ID: ${id})`;
        } else {
            return `⚠️ Nenhum agendamento encontrado com o ID ${id}.`;
        }
    } catch (e) {
        if (debugLog) debugLog.push({ etapa: "erro_remover_agendamento", erro: e.message });
        return "❌ Erro ao remover agendamento. Tente novamente ou verifique o ID.";
    }
}

module.exports = removeAgendamento;
