const extrairDataNatural = require('./extrairDataNatural');

console.log('TESTE 1:', extrairDataNatural('paguei 590 de imposto 5 de março'));
console.log('TESTE 2:', extrairDataNatural('paguei 1220 de aluguel 05 de abril'));
console.log('TESTE 3:', extrairDataNatural('recebi salário ontem'));
console.log('TESTE 4:', extrairDataNatural('ganhei 1200 de comissão dia 10 de maio'));
