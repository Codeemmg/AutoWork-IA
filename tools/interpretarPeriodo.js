const moment = require('moment');
const { z } = require('zod');

exports.description = 'Interpreta frases que indicam período de datas';
exports.schema = z.object({ mensagem: z.string() });

function interpretarPeriodo(mensagem) {
  mensagem = mensagem.toLowerCase();
  const hoje = moment();

  // 🔍 Função auxiliar para detectar variações
  const contemAlgum = (termos) => termos.some((termo) => mensagem.includes(termo));

  // 🔤 Mapeamento de frases comuns
  const termosHoje = ['hoje', 'do dia', 'neste dia', 'resumo do dia'];
  const termosOntem = ['ontem'];
  const termosSemanaAtual = ['essa semana', 'esta semana', 'nesta semana', 'semana atual'];
  const termosSemanaPassada = ['semana passada', 'última semana'];
  const termosMesAtual = ['mês', 'mes', 'neste mês', 'nesse mês', 'deste mês', 'do mês', 'resumo do mês'];
  const termosMesPassado = ['mês passado', 'mes passado'];

  // ✅ Hoje
  if (contemAlgum(termosHoje)) {
    return {
      inicio: hoje.format('YYYY-MM-DD'),
      fim: hoje.format('YYYY-MM-DD')
    };
  }

  // ✅ Ontem
  if (contemAlgum(termosOntem)) {
    const ontem = hoje.clone().subtract(1, 'days');
    return {
      inicio: ontem.format('YYYY-MM-DD'),
      fim: ontem.format('YYYY-MM-DD')
    };
  }

  // ✅ Semana atual
  if (contemAlgum(termosSemanaAtual)) {
    return {
      inicio: hoje.clone().startOf('isoWeek').format('YYYY-MM-DD'),
      fim: hoje.clone().endOf('isoWeek').format('YYYY-MM-DD')
    };
  }

  // ✅ Semana passada
  if (contemAlgum(termosSemanaPassada)) {
    return {
      inicio: hoje.clone().subtract(1, 'weeks').startOf('isoWeek').format('YYYY-MM-DD'),
      fim: hoje.clone().subtract(1, 'weeks').endOf('isoWeek').format('YYYY-MM-DD')
    };
  }

  // ✅ Mês atual
  if (contemAlgum(termosMesAtual)) {
    return {
      inicio: hoje.clone().startOf('month').format('YYYY-MM-DD'),
      fim: hoje.clone().endOf('month').format('YYYY-MM-DD')
    };
  }

  // ✅ Mês passado
  if (contemAlgum(termosMesPassado)) {
    return {
      inicio: hoje.clone().subtract(1, 'months').startOf('month').format('YYYY-MM-DD'),
      fim: hoje.clone().subtract(1, 'months').endOf('month').format('YYYY-MM-DD')
    };
  }

  // 🔄 Intervalos específicos
  const intervaloNatural = /(?:de|entre)\s*(\d{1,2})\s*(?:a|até)\s*(\d{1,2})\s*de\s*([a-zç]+)/;
  const intervaloPadrao = /entre\s+(\d{1,2}\/\d{1,2})\s+e\s+(\d{1,2}\/\d{1,2})/;
  const matchNatural = mensagem.match(intervaloNatural);
  const matchPadrao = mensagem.match(intervaloPadrao);

  const mesMap = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };

  if (matchNatural) {
    const dia1 = parseInt(matchNatural[1]);
    const dia2 = parseInt(matchNatural[2]);
    const mesTexto = matchNatural[3];
    const mesIndex = mesMap[mesTexto];
    if (!isNaN(mesIndex)) {
      const ano = hoje.year();
      return {
        inicio: moment({ year: ano, month: mesIndex, day: dia1 }).format('YYYY-MM-DD'),
        fim: moment({ year: ano, month: mesIndex, day: dia2 }).format('YYYY-MM-DD')
      };
    }
  }

  if (matchPadrao) {
    const [_, ini, fim] = matchPadrao;
    const start = moment(ini, 'DD/MM');
    const end = moment(fim, 'DD/MM');
    if (start.isValid() && end.isValid()) {
      return {
        inicio: start.format('YYYY-MM-DD'),
        fim: end.format('YYYY-MM-DD')
      };
    }
  }

  // 🔁 Relativos: última/próxima segunda, etc.
  const diasSemana = {
    'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3,
    'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6
  };

  for (const [nome, index] of Object.entries(diasSemana)) {
    if (mensagem.includes(`última ${nome}`) || mensagem.includes(`${nome} passada`)) {
      const data = hoje.clone().day(index - 7);
      return {
        inicio: data.format('YYYY-MM-DD'),
        fim: data.format('YYYY-MM-DD')
      };
    }
    if (mensagem.includes(`próxima ${nome}`) || mensagem.includes(`${nome} que vem`)) {
      const data = hoje.clone().day(index + 7);
      return {
        inicio: data.format('YYYY-MM-DD'),
        fim: data.format('YYYY-MM-DD')
      };
    }
  }

  // 🔁 Mês por nome direto
  for (const [mesNome, mesIndex] of Object.entries(mesMap)) {
    if (mensagem.includes(`de ${mesNome}`) || mensagem.includes(`em ${mesNome}`)) {
      const ano = hoje.year();
      const inicio = moment({ year: ano, month: mesIndex, day: 1 });
      const fim = inicio.clone().endOf('month');
      return {
        inicio: inicio.format('YYYY-MM-DD'),
        fim: fim.format('YYYY-MM-DD')
      };
    }
  }

  return null;
}

module.exports = interpretarPeriodo;
