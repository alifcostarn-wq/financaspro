// Investimentos (hoje = 2026-10-20): aplicações, resgates e o erro antigo de contá-los como despesa/receita
//  - l3/l0: aplicações lançadas certo (tipo Investimento)
//  - l4/l5: vindas do extrato antes da correção: resgate como Receita e aplicação como Despesa
//  - m1..m4: movimentações feitas direto em Bancos (sem lançamento): aplicação e resgate de RDB,
//    uma venda (receita de verdade) e uma farmácia (despesa de verdade)
const L = (id, data, tipo, cat, subcat, desc, valor, extra) => ({ id, data, tipo, cat, subcat, desc, valor,
  caixaId:'bk', caixaNome:'Itaú', pago:'Pago', obs:'', ts:+id.replace(/\D/g, '') || 1, status:'ativo', ...(extra || {}) });
module.exports = {
  cfg:{ sal:8000, si:0, ano:2026, pct:20 }, formas:['PIX'], kanban:[], divs:[], contas:[], ccs:[],
  orcs:[{ id:'o1', tipo:'Investimento', mes:9, ano:2026, cat:'Investimentos', subcat:'', val:3000 }],
  _seeded:true, _bancosSeeded:true, _lancsSeeded:true, _caixaRelinked:true, _orcAnoMigrado:true,
  bancos:[{ id:'bk', nome:'Itaú', banco:'Itaú', tipo:'Conta Corrente', saldoInicial:10000, cor:'', ts:1, movs:[
    { id:'m1', data:'2026-10-12', val:700, desc:'Aplicação RDB', cat:'Investimentos', subcat:'Renda Fixa', forma:'PIX', tipo:'saida', ts:21 },
    { id:'m2', data:'2026-10-16', val:300, desc:'Resgate RDB', cat:'Investimentos', subcat:'Renda Fixa', forma:'PIX', tipo:'entrada', ts:22 },
    { id:'m3', data:'2026-10-18', val:150, desc:'Venda de bicicleta', cat:'Receitas', subcat:'Vendas', forma:'PIX', tipo:'entrada', ts:23 },
    { id:'m4', data:'2026-10-19', val:80, desc:'Farmácia', cat:'Saúde', subcat:'', forma:'PIX', tipo:'saida', ts:24 },
  ] }],
  lancs:[
    L('l1', '2026-10-05', 'Receita', 'Receitas', 'Pro-Labore', 'Salário', 8000),
    L('l2', '2026-10-08', 'Despesa', 'Alimentação', 'Supermercado', 'Mercado', 1200),
    L('l3', '2026-10-10', 'Investimento', 'Investimentos', 'Tesouro Direto', 'Tesouro Selic', 2000),
    L('l0', '2026-06-10', 'Investimento', 'Investimentos', 'Renda Fixa', 'CDB Banco X', 3000),
    L('l4', '2026-10-15', 'Receita', 'Receitas', 'Outras Receitas', 'RESGATE CDB BANCO X', 1500, { origem:'ofx' }),
    L('l5', '2026-10-17', 'Despesa', 'Outras Despesas', 'Importado OFX', 'APLICACAO AUTOMATICA', 400, { origem:'ofx' }),
  ],
};
