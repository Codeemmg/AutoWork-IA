const db = require('../db');

async function registerAgendamento(user_id, resultado = {}, debugLog = []) {
    const {
        descricao,
        valor,
        tipo,
        categoria = null,
        data_vencimento,
        recorrencia = 'nenhum',
        lembrete = true,
        dias_lembrete = 1,
        status = 'ativo',
        observacao = null
    } = resultado;

    // Checagem de campos obrigatórios
    if (!descricao || !valor || !tipo || !data_vencimento) {
        if (debugLog) debugLog.push({
            etapa: "erro_campos_obrigatorios_faltando",
            descricao, valor, tipo, data_vencimento
        });
        return "❌ Faltam informações obrigatórias para registrar o agendamento: descrição, valor, tipo ou data de vencimento.";
    }

    try {
        const [result] = await db.query(
            `INSERT INTO registros_agendados 
            (user_id, descricao, valor, tipo, categoria, data_vencimento, recorrencia, lembrete, dias_lembrete, status, observacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, descricao, valor, tipo, categoria, data_vencimento, recorrencia, lembrete, dias_lembrete, status, observacao]
        );
        if (debugLog) debugLog.push({ etapa: "registro_agendamento", insertId: result.insertId });

        // Mensagem amigável
        return `✅ Agendamento salvo: *${descricao}* em ${data_vencimento} (${tipo}${valor ? ` — R$${Number(valor).toFixed(2)}` : ''})`;
    } catch (e) {
        if (debugLog) debugLog.push({ etapa: "erro_registro_agendamento", erro: e.message });
        return "❌ Erro ao registrar agendamento. Verifique os dados e tente novamente.";
    }
}

module.exports = registerAgendamento;
