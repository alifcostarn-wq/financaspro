// Base para a Central de Relatórios: jan/2024 a out/2026, com sazonalidade (hoje = 2026-10-15)
const base = JSON.parse(JSON.stringify(require('./dados-pagar.js')));
const lancs = []; let n = 0;
const add = (a, m, dia, tipo, cat, sub, v, desc, caixa, pago) => lancs.push({ id:'r' + (++n), data:`${a}-${String(m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
  tipo, cat, subcat:sub, desc:desc || sub || cat, valor:+v.toFixed(2), caixaId:caixa === 'Nubank' ? 'nb' : 'bk', caixaNome:caixa || 'Itaú', pago:pago || 'Pago', obs:'', ts:n, status:'ativo' });
for(let a = 2024; a <= 2026; a++) for(let m = 0; m < 12; m++){
  if(a === 2026 && m > 9) break;
  const f = 1 + (a - 2024) * 0.06, saz = [1.25, 1.1, 1, .95, 1, 1.05, 1.15, 1, .95, 1, 1.1, 1.35][m];
  const futuro = a === 2026 && m === 9;
  add(a, m, 5, 'Receita', 'Receitas', 'Pro-Labore', 7200 * f, 'Salário');
  if(m % 3 === 0) add(a, m, 20, 'Receita', 'Receitas', 'Freelance', 1500 * f, 'Freela', 'Nubank');
  add(a, m, 1, 'Despesa', 'Moradia', 'Aluguel', 1800 * f, 'Aluguel');
  add(a, m, 10, 'Despesa', 'Moradia', 'Energia Elétrica', (180 + (m % 4) * 35) * saz, 'Luz');
  add(a, m, 8, 'Despesa', 'Alimentação', 'Supermercado', 950 * saz * f, 'Mercado', 'Nubank');
  add(a, m, 16 + (m % 6), 'Despesa', 'Alimentação', 'Restaurante', 280 * saz, 'Restaurantes', 'Nubank');
  add(a, m, 12, 'Despesa', 'Transporte', 'Combustível', 520 * f, 'Combustível');
  add(a, m, 18, 'Despesa', 'Saúde', 'Plano de Saúde', 540 * f, 'Plano de saúde');
  add(a, m, 6, 'Despesa', 'Educação', 'Mensalidade Escolar', 650, 'Escola');
  add(a, m, 25, 'Despesa', 'Lazer', 'Cinema / Teatro / Shows', 160 * saz * (m === 6 ? 4 : 1), 'Lazer', 'Nubank');
  if(m % 2) add(a, m, 27, 'Despesa', 'Vestuário', 'Roupas Adulto', 300 * saz, 'Roupas', 'Nubank');
  add(a, m, 3, 'Despesa', 'Serviços & Financeiro', 'Tarifa Bancária', 39, 'Tarifa');
  add(a, m, 28, 'Investimento', 'Investimentos', '', 600 * f, 'Aporte');
  if(futuro) lancs.filter(l => l.data >= '2026-10-16').forEach(l => { l.pago = 'Pendente'; });
}
base.lancs = lancs;
base.bancos = [{ id:'bk', nome:'Itaú', banco:'Itaú', tipo:'Conta Corrente', saldoInicial:8000, cor:'', ts:1, movs:[] },
               { id:'nb', nome:'Nubank', banco:'Nubank', tipo:'Conta Corrente', saldoInicial:2000, cor:'', ts:2, movs:[] }];
base.orcs = [];
for(let m = 0; m < 12; m++){
  base.orcs.push({ id:'oA' + m, mes:m, ano:2026, tipo:'Despesa', cat:'Alimentação', subcat:'', val:1300, obs:'' });
  base.orcs.push({ id:'oL' + m, mes:m, ano:2026, tipo:'Despesa', cat:'Lazer', subcat:'', val:200, obs:'' });
  base.orcs.push({ id:'oM' + m, mes:m, ano:2026, tipo:'Despesa', cat:'Moradia', subcat:'', val:2300, obs:'' });
}
base._lancsSeeded = true; base._bancosSeeded = true; base._caixaRelinked = true;
module.exports = base;
