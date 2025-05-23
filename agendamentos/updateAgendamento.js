const db = require('../db');

/**
 * Atualiza um agendamento por ID.
 * @param {string|number} user_id - ID do usuário (não usado aqui, mas pode ser útil para validação futura)
 * @param {object} resultado - Deve conter { id, ...camposAAtualizar }
 * @param {array} debugLog
 * @returns {string}
 */
async function updateAgendamento(user_id, resultado = {}, debugLog = []) {
    const { id, ...updates } = resultado;

    if (!id) {
        if (debugLog) debugLog.push({ etapa: "erro_id_ausente" });
        return "❌ Informe o ID do agendamento que deseja atualizar.";
    }

    // Remove campos que não podem/precisam ser atualizados
    delete updates.user_id; // Nunca atualize o user_id!
    if (Object.keys(updates).length === 0) {
        if (debugLog) debugLog.push({ etapa: "erro_sem_campos_para_atualizar" });
        return "⚠️ Nenhum campo para atualizar informado.";
    }

    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    try {
        const sql = `UPDATE registros_agendados SET ${fields.join(', ')} WHERE id = ?`;
        const [res] = await db.query(sql, [...values, id]);
        if (debugLog) debugLog.push({ etapa: "atualizacao_agendamento", id, atualizados: res.affectedRows });

        if (res.affectedRows > 0) {
            return `✅ Agendamento atualizado com sucesso! (ID: ${id})`;
        } else {
            return `⚠️ Nenhum agendamento encontrado ou campos iguais aos atuais. (ID: ${id})`;
        }
    } catch (e) {
        if (debugLog) debugLog.push({ etapa: "erro_update_agendamento", erro: e.message });
        return "❌ Erro ao atualizar agendamento. Tente novamente ou verifique o ID/campos.";
    }
}

module.exports = updateAgendamento;
