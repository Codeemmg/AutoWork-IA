const db = require('../db');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

exports.description = 'Gera gráficos de resumo semanal';
exports.schema = z.object({ userId: z.string() });

const largura = 700;
const altura = 400;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: largura, height: altura });

/**
 * Gera gráficos de resumo semanal de saídas para um usuário.
 * @param {string} userId - número do WhatsApp
 * @returns {Promise<{graficoBar: string, graficoPizza: string} | null>}
 */
async function gerarGraficosResumo(userId = 'desconhecido') {
    console.log('[DEBUG] Entrou em gerarGraficosResumo.js > gerarGraficosResumo');
  const inicioSemana = moment().startOf('isoWeek').format('YYYY-MM-DD');
  const fimSemana = moment().endOf('isoWeek').format('YYYY-MM-DD');

  try {
    const [dados] = await db.query(
      `SELECT descricao, DATE(data) as dia, SUM(valor) as total
       FROM registros
       WHERE tipo = 'saida' AND user_id = ? AND data BETWEEN ? AND ?
       GROUP BY descricao, dia
       ORDER BY dia ASC`,
      [userId, inicioSemana, fimSemana]
    );

    if (!dados.length) return null;

    // Garante que a pasta ./graficos existe
    const pastaGraficos = path.join(__dirname, '../graficos');
    fs.mkdirSync(pastaGraficos, { recursive: true });

    // Gráfico de barras (por dia)
    const dias = [...new Set(dados.map(d => moment(d.dia).format('ddd')))];
    const porDia = dias.map(d =>
      dados
        .filter(r => moment(r.dia).format('ddd') === d)
        .reduce((soma, item) => soma + parseFloat(item.total), 0)
    );

    const configBar = {
      type: 'bar',
      data: {
        labels: dias,
        datasets: [{
          label: 'Gastos por Dia',
          data: porDia,
          backgroundColor: 'rgba(255, 99, 132, 0.7)'
        }]
      },
      options: { responsive: true }
    };

    const bufferBar = await chartJSNodeCanvas.renderToBuffer(configBar);
    const pathBar = path.join(pastaGraficos, `grafico_bar_${userId}.png`);
    fs.writeFileSync(pathBar, bufferBar);

    // Gráfico de pizza (por descrição)
    const porDescricao = {};
    for (let item of dados) {
      porDescricao[item.descricao] = (porDescricao[item.descricao] || 0) + parseFloat(item.total);
    }

    const configPie = {
      type: 'pie',
      data: {
        labels: Object.keys(porDescricao),
        datasets: [{
          data: Object.values(porDescricao),
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40']
        }]
      },
      options: { responsive: true }
    };

    const bufferPie = await chartJSNodeCanvas.renderToBuffer(configPie);
    const pathPie = path.join(pastaGraficos, `grafico_pizza_${userId}.png`);
    fs.writeFileSync(pathPie, bufferPie);

    return {
      graficoBar: pathBar,
      graficoPizza: pathPie
    };
  } catch (err) {
    console.error('❌ Erro ao gerar gráficos:', err.message);
    return null;
  }
}

module.exports = gerarGraficosResumo;
