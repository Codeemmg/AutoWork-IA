const { routeMessage } = require('./agent/roteador');
const fs = require('fs');

// User real para teste (você pode trocar aqui por cada cliente real)
const USER_ID = '553299642181';

// Frases de teste — COMPLETAS, AMPLIADAS e com edge cases de uso real:
const frasesTeste = [
    

    // Registro de compromissos futuros
    "Agende uma reunião com o João para amanhã às 15h",
    "comprei um carro novo, preciso registrar",

 


];

(async () => {
    let resultados = [];

    for (const frase of frasesTeste) {
        try {
            console.log('\n====================');
            console.log(`Enviando: "${frase}"`);
            const resposta = await routeMessage(USER_ID, frase);
            let info = {
                frase,
                resposta,
                quem_atendeu: resposta.quem_atendeu || (
                    resposta.resultado && resposta.resultado.intencao
                        ? 'agent'
                        : 'superagent'
                ),
                intencao_detectada: resposta.intencao_detectada ||
                    (resposta.resultado && resposta.resultado.intencao) ||
                    '-',
                erro: (typeof resposta === 'string' && resposta.toLowerCase().includes('não entendi')) ||
                      (resposta.resposta && resposta.resposta.toLowerCase().includes('não entendi')) ? true : false
            };
            console.log(`🧭 Quem atendeu: ${info.quem_atendeu}`);
            console.log(`🎯 Intenção: ${info.intencao_detectada}`);
            console.log(`💬 Resposta: ${resposta.resposta || resposta}`);
            if (info.erro) {
                console.log('⚠️ Fallback/Erro: Resposta não compreendida');
            }
            resultados.push(info);
        } catch (err) {
            console.log('❌ Erro inesperado:', err);
            resultados.push({ frase, erro: true, err });
        }
    }

    // RESUMO FINAL
    const erros = resultados.filter(r => r.erro);
    console.log('\n====================');
    console.log(`TESTE FINALIZADO! ${resultados.length - erros.length} passaram, ${erros.length} falharam.`);
    if (erros.length) {
        console.log('Resumo dos erros/fallbacks:');
        erros.forEach(r => console.log(`- "${r.frase}"`));
    } else {
        console.log('🚀 Tudo liso, seu sistema está lendário!');
    }

    // Salvar resultados detalhados
    fs.writeFileSync('resultado_teste_integrado.json', JSON.stringify(resultados, null, 2));
})();
