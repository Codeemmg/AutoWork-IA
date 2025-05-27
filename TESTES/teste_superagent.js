const superagent = require('../agent/superagent');
const readline = require('readline');

const user_id = 'test_user_gpt'; // Pode trocar por outro ID para testes individuais

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 SuperAgent do AutoWork IA — Converse aqui! (Digite "sair" para encerrar)\n');

async function loop() {
    rl.question('👤 Você: ', async (frase) => {
        if (frase.trim().toLowerCase() === 'sair') {
            console.log('🤖 SuperAgent: Até mais! 👋');
            rl.close();
            return;
        }
        const resposta = await superagent(user_id, frase);
        console.log('🤖 SuperAgent:', resposta, '\n');
        loop();
    });
}

loop();
