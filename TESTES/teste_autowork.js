const agent = require('../agent/agent'); // ajuste se necessário
const moment = require('moment');
const fs = require('fs');

const user_id = '553299642181';
const logFile = 'log_teste_autowork_ia.txt';
let logOutput = '=== INICIANDO TESTES AUTOWORK IA ===\n\n';

const testes = [
  // ... (os mesmos testes do exemplo anterior)
  { desc: 'Registro de entrada atual', frase: 'recebi 1200 de salário hoje' },
  { desc: 'Registro de saída atual', frase: 'paguei 350 de aluguel hoje' },
  { desc: 'Registro de entrada antiga', frase: `recebi 500 de cliente dia ${moment().subtract(12, 'days').format('DD/MM/YYYY')}` },
  { desc: 'Registro de saída antiga', frase: `gastei 200 no mercado dia ${moment().subtract(14, 'days').format('DD/MM/YYYY')}` },
  { desc: 'Registro de entrada futura', frase: `vou receber 700 de comissão dia ${moment().add(8, 'days').format('DD/MM/YYYY')}` },
  { desc: 'Registro de saída futura', frase: `preciso pagar 450 de cartão dia ${moment().add(10, 'days').format('DD/MM/YYYY')}` },
  { desc: 'Saldo mês atual', frase: 'saldo desse mês' },
  { desc: 'Saldo mês anterior', frase: 'saldo do mês passado' },
  { desc: 'Saldo dos últimos 7 dias', frase: `saldo do período de ${moment().subtract(7, 'days').format('DD/MM/YYYY')} a ${moment().format('DD/MM/YYYY')}` },
  { desc: 'Extrato mês atual', frase: 'extrato desse mês' },
  { desc: 'Extrato mês passado', frase: 'extrato do mês passado' },
  { desc: 'Extrato dos últimos 7 dias', frase: `extrato do período de ${moment().subtract(7, 'days').format('DD/MM/YYYY')} a ${moment().format('DD/MM/YYYY')}` },
  { desc: 'Extrato de hoje', frase: 'extrato do dia' },
  { desc: 'Entradas do mês', frase: 'entradas desse mês' },
  { desc: 'Saídas do mês', frase: 'saídas desse mês' },
  { desc: 'Entradas mês passado', frase: 'entradas do mês passado' },
  { desc: 'Saídas mês passado', frase: 'saídas do mês passado' },
];

(async () => {
  for (let i = 0; i < testes.length; i++) {
    const t = testes[i];
    const debugLog = [];
    try {
      const resposta = await agent(user_id, t.frase, debugLog);

      // Monta o texto do log
      logOutput += `\n[${i + 1}] 📌 ${t.desc}\n`;
      logOutput += `Frase: ${t.frase}\n`;
      logOutput += `Resposta: ${resposta.resposta}\n`;
      logOutput += `↪️ Intenção: ${resposta.resultado && resposta.resultado.intencao}\n`;
      if (resposta.resultado && resposta.resultado.valor)
        logOutput += `↪️ Valor: ${resposta.resultado.valor}\n`;
      if (resposta.resultado && resposta.resultado.data)
        logOutput += `↪️ Data: ${resposta.resultado.data}\n`;
      if (debugLog.length > 0)
        logOutput += `↪️ Debug: ${debugLog.map(etapa => etapa.etapa).join(' > ')}\n`;
      // Para log completo:
      // logOutput += `↪️ Debug Completo: ${JSON.stringify(debugLog, null, 2)}\n`;
    } catch (e) {
      logOutput += `Erro ao testar [${t.desc}]: ${e.message}\n`;
    }
  }

  logOutput += '\n=== FIM DOS TESTES ===\n';

  // Exibe no console e salva no arquivo
  console.log(logOutput);
  fs.writeFileSync(logFile, logOutput, 'utf8');
  console.log(`\nLog salvo em: ${logFile}`);
})();
