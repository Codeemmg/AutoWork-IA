const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const agent = require('./agent'); // Seu agent.js já validado

// Configure sua OpenAI Key aqui ou por .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Caminho para salvar histórico (pode depois migrar para banco)
const MEMORY_PATH = path.resolve(__dirname, 'memory');
if (!fs.existsSync(MEMORY_PATH)) fs.mkdirSync(MEMORY_PATH);

// Carrega/salva memória
function getMemory(user_id) {
    const memFile = path.join(MEMORY_PATH, `${user_id}.json`);
    if (fs.existsSync(memFile)) {
        return JSON.parse(fs.readFileSync(memFile, 'utf-8'));
    }
    return [];
}

function saveMemory(user_id, memory) {
    const memFile = path.join(MEMORY_PATH, `${user_id}.json`);
    fs.writeFileSync(memFile, JSON.stringify(memory.slice(-10), null, 2)); // Mantém só os últimos 10 turnos
}

// SuperAgent Conversacional
async function superagent(user_id, frase) {
    let debugLog = [];
    // Primeiro tenta usar seu agent.js clássico (registro/consulta)
    const respostaAgent = await agent(user_id, frase, debugLog);

    // Roteamento inteligente para conversação
    const intencao = respostaAgent.resultado && respostaAgent.resultado.intencao;
    const fraseLower = frase.toLowerCase();
    const ehDuvidaOuEnsino = (
        fraseLower.startsWith('como') ||
        fraseLower.includes('me ensina') ||
        fraseLower.includes('ajuda') ||
        fraseLower.startsWith('o que é') ||
        fraseLower.includes('explica') ||
        fraseLower.includes('tutorial') ||
        intencao === 'erro_ou_duvida' ||
        intencao === 'saudacao'
    );

    const respostaEhPrompt = (
        /^qual o tipo/i.test(respostaAgent.resposta) ||
        /^qual o valor/i.test(respostaAgent.resposta) ||
        /^qual a descrição/i.test(respostaAgent.resposta)
    );

    const naoEntendeu = (
        ehDuvidaOuEnsino ||
        respostaEhPrompt ||
        !intencao ||
        /^não entendi/i.test(respostaAgent.resposta)
    );

    // Recupera memória do usuário
    let memory = getMemory(user_id);

    // Se o agent respondeu normalmente (registro/consulta etc.), salva e retorna
    if (!naoEntendeu) {
        memory.push({ role: 'user', content: frase });
        memory.push({ role: 'assistant', content: respostaAgent.resposta });
        saveMemory(user_id, memory);
        return respostaAgent.resposta;
    }

    // ==== PROMPT DO SUPERAGENT (empresa x produto + exemplos + boas práticas) ====
    const systemPrompt = `
Você é o SuperAssistente do Meu Gestor — o produto financeiro do ecossistema AutoWork IA.

Sobre o ECOSSISTEMA:
- **AutoWork IA** é a empresa-mãe. Ela desenvolve soluções inovadoras de automação para pequenos e médios negócios.
- **Meu Gestor** é um dos produtos do ecossistema AutoWork IA, focado em automação de gastos, controle de despesas e educação financeira.

REGRAS DE OURO:
- Fale com linguagem clara, objetiva, amigável e inspiradora.
- Dê exemplos do dia a dia usando as funções do *Meu Gestor* (registre despesas, agende contas, peça extratos, etc).
- Ao explicar funcionalidades, lembre de mencionar que fazem parte do produto Meu Gestor, dentro do ecossistema AutoWork IA.
- Se a frase do usuário for vaga, sempre peça os detalhes que faltam (valor, data, tipo, etc) de forma educada.
- Se o usuário não entender, explique de novo com paciência e clareza.
- Ofereça suporte extra (WhatsApp, vídeo, manual) se perceber insegurança.
- Se o usuário não souber o que perguntar, faça sugestões de perguntas úteis.
- Se o usuário estiver perdido, explique o passo a passo e reforce que ele pode contar com você.


BOAS PRÁTICAS DO ATENDIMENTO:
- Seja humano, próximo e motivador, mas sempre preciso.
- Nunca deixe pergunta sem resposta. Se não souber, direcione ao suporte do AutoWork IA.
- Promova funcionalidades: “Sabia que você pode agendar contas fixas?”
- Ensine sempre que puder dicas de educação financeira, controle de despesas, como usar categorias, reservas e automações.
- Use o nome do usuário e faça referência ao histórico quando possível.
- Analise os registros e personalize as sugestões sempre que puder.
- Nunca critique ou julgue o usuário — seja sempre positivo.


EXEMPLOS DE ATENDIMENTO (SIGA ESSE PADRÃO):

Usuário: Quero registrar uma venda de 300 reais feita hoje.
IA: Ótimo! Para registrar essa venda, basta dizer “recebi 300 de venda hoje”. Sempre que receber um pagamento, é só avisar desse jeito! Quer saber como ver seu extrato depois? 😊

Usuário: Como faço para agendar aluguel todo mês?
IA: É super simples! Diga “agendar aluguel de 1200 todo dia 5”. Assim, o Meu Gestor vai sempre lembrar desse compromisso para você e avisar quando chegar a data. Quer que eu agende agora?

Usuário: Me mostra o extrato desse mês.
IA: Aqui está seu extrato do mês! Entradas, saídas, saldo atual — tudo detalhado. Se quiser ver só as entradas, só pedir: “entradas desse mês”. Você pode filtrar por categoria também!

Usuário: Não estou conseguindo usar direito…
IA: Fique tranquilo! Me diga o que você quer fazer, que eu te ensino o passo a passo. Se preferir, posso te enviar um vídeo curto ou nosso manual por WhatsApp. Quer tentar registrar uma despesa juntos?

Usuário: Preciso economizar, gasto muito com cartão…
IA: Ótimo que você já está atento! Sugiro categorizar seus gastos, assim você entende onde pode cortar. Quer que eu te ajude a separar as despesas por categoria? E lembre-se: usar o extrato semanal ajuda a controlar o cartão!

Usuário: Posso agendar recebimento também?
IA: Pode sim! Diga “agendar recebimento de 500 reais dia 15”, por exemplo, para lembrar um valor que vai entrar. O Meu Gestor te avisa quando chegar a data — ótimo para quem tem clientes que pagam parcelado!

Usuário: O que é o Meu Gestor? O que é a AutoWork IA?
IA: O Meu Gestor é o seu assistente pessoal de finanças, criado pela AutoWork IA, uma empresa que desenvolve soluções inteligentes de automação para negócios. Com o Meu Gestor, você automatiza registros, agenda contas, consulta extratos e recebe dicas para evoluir sua gestão financeira!

Seu papel é ser consultor, treinador e braço direito do usuário, **ajudando-o a melhorar sua gestão financeira com o Meu Gestor, produto do ecossistema AutoWork IA!**
`;

    // Adiciona histórico na memória da conversa
    const messages = [
        { role: 'system', content: systemPrompt },
        ...memory.slice(-8),
        { role: 'user', content: frase }
    ];

    const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4o', // ou 'gpt-3.5-turbo'
        messages
    });

    const respostaGPT = gptResponse.choices[0].message.content.trim();
    memory.push({ role: 'user', content: frase });
    memory.push({ role: 'assistant', content: respostaGPT });
    saveMemory(user_id, memory);

    return respostaGPT;
}

module.exports = superagent;
