// Aba Investimentos (hoje = 2026-10-28): cinco aplicações de tipos diferentes e um grupo antigo sem taxa
//  - a1 CDB 110% do CDI: aplicação de 10.000 em jan/2026 (lançamento ligado), vence em 2028
//  - a2 LCI 90% do CDI: 5.000 em mar/2026, venceu em 05/09/2026 sem o resgate registrado
//  - a3 Tesouro IPCA+ 6,2%: já existia antes do sistema (8.000 desde jun/2025), saldo informado em 30/09/2026
//  - a4 Ações: renda variável, só pelos saldos informados (retorno esperado de 12% para a projeção)
//  - a5 Poupança: 2.000 em jul/2026, resgate de 510 em ago/2026 (500 + 10 de lucro)
//  - Previdência XP: aplicação antiga, sem aplicação cadastrada (grupo "sem taxa")
const L = (id, data, tipo, cat, subcat, desc, valor, extra) => ({ id, data, tipo, cat, subcat, desc, valor,
  caixaId:'bk', caixaNome:'Itaú', pago:'Pago', obs:'', ts:+id.replace(/\D/g, '') || 1, status:'ativo', ...(extra || {}) });
const A = (id, nome, produto, instituicao, indexador, taxa, inicio, vencimento, subcat, extra) => ({ id, nome, produto, instituicao, indexador, taxa,
  inicio, vencimento, isento:false, cat:'Investimentos', subcat, saldos:[], ts:1, ...(extra || {}) });
module.exports = {
  cfg:{ sal:9000, si:0, ano:2026, pct:20 }, formas:['PIX'], kanban:[], divs:[], contas:[], ccs:[], orcs:[],
  _seeded:true, _bancosSeeded:true, _lancsSeeded:true, _caixaRelinked:true, _orcAnoMigrado:true,
  bancos:[{ id:'bk', nome:'Itaú', banco:'Itaú', tipo:'Conta Corrente', saldoInicial:30000, cor:'', ts:1, movs:[] }],
  invAtivos:[
    A('a1', 'CDB Banco Inter', 'CDB', 'Banco Inter', 'cdi', 110, '2026-01-10', '2028-01-10', 'Renda Fixa'),
    A('a2', 'LCI Caixa', 'LCI', 'Caixa', 'cdi', 90, '2026-03-05', '2026-09-05', 'LCI & LCA', { isento:true }),
    A('a3', 'Tesouro IPCA+ 2035', 'Tesouro IPCA+', 'XP', 'ipca', 6.2, '2025-06-01', '2035-05-15', 'Tesouro Direto',
      { base:{ valor:8000, data:'2025-06-01' }, saldos:[{ id:'s1', data:'2026-09-30', valor:8900 }] }),
    A('a4', 'Ações (carteira)', 'Ações', 'Clear', 'livre', 12, '2026-02-01', '', 'Renda Variável',
      { base:{ valor:3000, data:'2026-02-01' }, saldos:[{ id:'s2', data:'2026-06-30', valor:3300 }, { id:'s3', data:'2026-09-30', valor:3150 }] }),
    A('a5', 'Poupança', 'Poupança', 'Itaú', 'poupanca', null, '2026-07-01', '', 'Poupança', { isento:true }),
  ],
  lancs:[
    L('l1', '2026-10-05', 'Receita', 'Receitas', 'Pro-Labore', 'Salário', 9000),
    L('l2', '2026-10-08', 'Despesa', 'Alimentação', 'Supermercado', 'Mercado', 1500),
    L('i1', '2026-01-10', 'Investimento', 'Investimentos', 'Renda Fixa', 'CDB Banco Inter', 10000, { ativoId:'a1' }),
    L('i2', '2026-03-05', 'Investimento', 'Investimentos', 'LCI & LCA', 'LCI Caixa', 5000, { ativoId:'a2' }),
    L('i3', '2026-07-01', 'Investimento', 'Investimentos', 'Poupança', 'Poupança', 2000, { ativoId:'a5' }),
    L('r1', '2026-08-15', 'Resgate', 'Investimentos', 'Poupança', 'Resgate poupança', 500, { ativoId:'a5' }),
    L('r2', '2026-08-15', 'Receita', 'Receitas', 'Rendimentos', 'Rendimento — Resgate poupança', 10, { ativoId:'a5', refResgateId:'r1' }),
    L('p1', '2026-04-10', 'Investimento', 'Investimentos', 'Previdência Privada', 'Previdência XP', 1200),
  ],
};
