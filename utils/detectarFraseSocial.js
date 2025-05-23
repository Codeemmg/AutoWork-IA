const frasesSociais = {
  entrada: {
    "bom dia": "Bom dia! Vamos registrar algo ou consultar seu resumo?",
    "boa tarde": "Boa tarde! Como posso te ajudar hoje?",
    "boa noite": "Boa noite! Está pronto para organizar suas finanças?",
    "oi": "Oi! Me diga se deseja registrar, consultar ou editar algo.",
    "olá": "Olá! Quer registrar um lançamento ou ver o resumo da semana?",
    "e aí": "E aí! Pronto para registrar alguma coisa ou consultar seu saldo?"
  },
  confirmacao: {
    "obrigado": "De nada! Estou aqui se precisar de mais alguma coisa.",
    "valeu": "Tamo junto! Qualquer coisa, é só chamar.",
    "show": "Show! Missão cumprida 😎",
    "top": "Top! Sempre que quiser, é só mandar."
  },
  encerramento: {
    "até mais": "Até logo! Quando quiser, é só me chamar.",
    "tchau": "Tchau! Cuide bem das suas finanças.",
    "valeu por hoje": "Disponha! Até a próxima!"
  },
  erroInformal: {
    "esquece": "Entendido. Nada será registrado por enquanto.",
    "deixa": "Beleza! Ignorando o último comando.",
    "já era": "Sem problemas, não vou registrar nada."
  }
};

function detectarFraseSocial(frase) {
  const normalizada = frase.trim().toLowerCase();

  for (const categoria of Object.values(frasesSociais)) {
    for (const chave of Object.keys(categoria)) {
      if (normalizada.startsWith(chave)) {
        return categoria[chave];
      }
    }
  }

  return null;
}

module.exports = detectarFraseSocial;
