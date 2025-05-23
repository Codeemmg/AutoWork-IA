const { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } = require("date-fns");

const nomesMeses = {
  "janeiro": 0, "jan": 0,
  "fevereiro": 1, "fev": 1,
  "março": 2, "marco": 2, "mar": 2,
  "abril": 3, "abr": 3,
  "maio": 4,
  "junho": 5, "jun": 5,
  "julho": 6, "jul": 6,
  "agosto": 7, "ago": 7,
  "setembro": 8, "set": 8,
  "outubro": 9, "out": 9,
  "novembro": 10, "nov": 10,
  "dezembro": 11, "dez": 11
};

function extrairDataNatural(frase) {
  const texto = frase.toLowerCase();
  const hoje = new Date();
  let data = null;
  let origem = null;
  let periodo = null;

  // Hoje
  if (/hoje/.test(texto)) {
    data = hoje;
    origem = "hoje";
    periodo = {
      inicio: format(hoje, "yyyy-MM-dd"),
      fim: format(hoje, "yyyy-MM-dd")
    };
  }
  // Ontem
  else if (/ontem/.test(texto)) {
    data = subDays(hoje, 1);
    origem = "ontem";
    periodo = {
      inicio: format(data, "yyyy-MM-dd"),
      fim: format(data, "yyyy-MM-dd")
    };
  }
  // Anteontem
  else if (/anteontem/.test(texto)) {
    data = subDays(hoje, 2);
    origem = "anteontem";
    periodo = {
      inicio: format(data, "yyyy-MM-dd"),
      fim: format(data, "yyyy-MM-dd")
    };
  }
  // Esta semana / essa semana
  else if (/esta semana|essa semana|semana atual/.test(texto)) {
    const inicio = startOfWeek(hoje, { weekStartsOn: 1 });
    const fim = endOfWeek(hoje, { weekStartsOn: 1 });
    origem = "semana atual";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // Semana passada
  else if (/semana passada/.test(texto)) {
    const inicio = subDays(startOfWeek(hoje, { weekStartsOn: 1 }), 7);
    const fim = subDays(endOfWeek(hoje, { weekStartsOn: 1 }), 7);
    origem = "semana passada";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // Este mês / esse mês
  else if (/este mês|esse mês|mês atual/.test(texto)) {
    const inicio = startOfMonth(hoje);
    const fim = endOfMonth(hoje);
    origem = "mês atual";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // Mês passado
  else if (/mês passado/.test(texto)) {
    const mesPassado = subDays(startOfMonth(hoje), 1);
    const inicio = startOfMonth(mesPassado);
    const fim = endOfMonth(mesPassado);
    origem = "mês passado";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // Este ano
  else if (/este ano|ano atual/.test(texto)) {
    const inicio = startOfYear(hoje);
    const fim = endOfYear(hoje);
    origem = "ano atual";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // Ano passado
  else if (/ano passado/.test(texto)) {
    const anoPassado = new Date(hoje.getFullYear() - 1, 0, 1);
    const inicio = startOfYear(anoPassado);
    const fim = endOfYear(anoPassado);
    origem = "ano passado";
    periodo = {
      inicio: format(inicio, "yyyy-MM-dd"),
      fim: format(fim, "yyyy-MM-dd")
    };
  }
  // "dia 5 de abril", "5 de abril", "5 abril", "05/04/2024", "05/04"
  else {
    // Monta dinamicamente todos os meses e abreviações para o regex
    const mesesRegex = Object.keys(nomesMeses).join('|');
    // Pega "5 de março", "5 março", "5 mar", "05 de abr", etc
    let match = texto.match(new RegExp(`(?:dia\\s*)?(\\d{1,2})\\s*(?:de)?\\s*(${mesesRegex})(?:\\s*de\\s*(\\d{4}))?`, 'i'));
    if (match && nomesMeses[match[2]]) {
      const dia = parseInt(match[1]);
      const mes = nomesMeses[match[2]];
      const ano = match[3] ? parseInt(match[3]) : hoje.getFullYear();
      data = new Date(ano, mes, dia);
      origem = `${dia} de ${match[2]}${match[3] ? ' de ' + match[3] : ''}`;
      periodo = {
        inicio: format(data, "yyyy-MM-dd"),
        fim: format(data, "yyyy-MM-dd")
      };
    }
    // Pega "05/04/2024", "5/4", etc
    else {
      match = texto.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (match) {
        const dia = parseInt(match[1]);
        const mes = parseInt(match[2]) - 1;
        let ano = hoje.getFullYear();
        if (match[3]) {
          ano = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
        }
        data = new Date(ano, mes, dia);
        origem = `${dia}/${mes + 1}${match[3] ? '/' + match[3] : ''}`;
        periodo = {
          inicio: format(data, "yyyy-MM-dd"),
          fim: format(data, "yyyy-MM-dd")
        };
      }
    }
  }

  // Fallback: Se não achou nenhuma data ou período, retorna null
  if (!data && !periodo) return null;

  // Se só encontrou período, retorna
  if (!data && periodo) {
    return { periodo, origem };
  }

  // Se só encontrou data, retorna ela como período do dia único
  if (data && !periodo) {
    return {
      dataISO: format(data, "yyyy-MM-dd"),
      periodo: {
        inicio: format(data, "yyyy-MM-dd"),
        fim: format(data, "yyyy-MM-dd")
      },
      origem
    };
  }

  // Caso padrão
  return {
    dataISO: format(data, "yyyy-MM-dd"),
    periodo,
    origem
  };
}

module.exports = extrairDataNatural;
