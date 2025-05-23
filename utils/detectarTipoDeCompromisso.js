function detectarTipoDeCompromisso(frase) {
  const texto = frase.toLowerCase();

  if (/todo (dia|mês|mes)/.test(texto) || /mensal/.test(texto)) {
    return "registrar_conta_recorrente";
  }

  if (/me avisa|me lembra|lembrete|avisar|não esquecer/.test(texto)) {
    return "lembrete_pessoal";
  }

  if (/paguei|comprei|gastei|recebi|ganhei|vendi/.test(texto)) {
    return "registro_financeiro";
  }

  return "comando_invalido";
}

module.exports = detectarTipoDeCompromisso;
