const registerAgendamento = require('../agendamentos/registerAgendamento');
const getAgendamentos = require('../agendamentos/getAgendamentos');
const moment = require('moment');

async function rodarTesteAgendamentos() {
    const user_id = '553299642181';
    const debugLog = [];

    // 1️⃣ Teste: Cadastro de agendamento
    const novoAgendamento = {
        descricao: "Pagar luz",
        valor: 150,
        tipo: "saida",
        categoria: "conta",
        data_vencimento: moment().add(2, 'days').format('YYYY-MM-DD'),
        recorrencia: "mensal",
        lembrete: true,
        dias_lembrete: 1,
        status: "ativo",
        observacao: "Conta de luz"
    };

    console.log("🟢 Testando cadastro de agendamento...");
    const respostaCadastro = await registerAgendamento(user_id, novoAgendamento, debugLog);
    console.log("Resultado cadastro:", respostaCadastro);

    // 2️⃣ Teste: Consulta de agendamentos futuros
    const resultadoConsulta = {
        periodo: {
            inicio: moment().startOf('month').format('YYYY-MM-DD'),
            fim: moment().endOf('month').format('YYYY-MM-DD')
        }
    };

    console.log("\n🟢 Testando consulta de agendamentos...");
    const respostaConsulta = await getAgendamentos(user_id, resultadoConsulta, debugLog);
    console.log("Resultado consulta:", respostaConsulta);

    // 3️⃣ Exibe o log de debug
    console.log("\n🟢 DebugLog do teste:", debugLog);
}

rodarTesteAgendamentos().then(() => {
    console.log("\n✅ Teste concluído!");
    process.exit();
}).catch(err => {
    console.error("❌ Erro nos testes:", err);
    process.exit(1);
});
