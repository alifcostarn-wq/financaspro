// Cenário de cartões (hoje = 2026-10-27)
//  cc1 Nubank: fecha dia 3, vence dia 10
//  cc2 Inter:  fecha dia 28, vence dia 5 (fecha no mês anterior ao vencimento)
//  cc3 Loja:   sem dia de fechamento, vence dia 15
module.exports = {
  cfg:{ sal:6000, si:0, ano:2026, pct:20 }, formas:['PIX'], kanban:[], divs:[], orcs:[], contas:[], lancs:[],
  _seeded:true, _bancosSeeded:true, _lancsSeeded:true, _caixaRelinked:true, _orcAnoMigrado:true,
  bancos:[{ id:'bk', nome:'Itaú', banco:'Itaú', tipo:'Conta Corrente', saldoInicial:5000, cor:'', ts:1, movs:[] }],
  ccs:[
    { id:'cc1', nome:'Nubank', band:'Master', lim:3000, venc:10, fech:3, grad:'', ts:1,
      faturas:[{ id:'f9', mes:8, ano:2026, valor:150, status:'Pago', dataPg:'2026-09-09', gerarLanc:false }],
      gastos:[
        { id:'g1', data:'2026-10-03', val:100, desc:'Padaria (dia do fechamento)', cat:'Alimentação', subcat:'', parc:1, ts:1 },
        { id:'g2', data:'2026-10-04', val:200, desc:'Farmácia (depois do fechamento)', cat:'Saúde', subcat:'', parc:1, ts:2 },
        { id:'g3', data:'2026-09-20', val:600, desc:'Fone 3x', cat:'Lazer', subcat:'', parc:3, ts:3 },
        { id:'g4', data:'2026-10-26', val:90, desc:'Mercado', cat:'Alimentação', subcat:'', parc:1, ts:4 },
        { id:'g0', data:'2026-08-20', val:150, desc:'Compra de agosto', cat:'Lazer', subcat:'', parc:1, ts:0 },
      ] },
    { id:'cc2', nome:'Inter', band:'Visa', lim:2000, venc:5, fech:28, grad:'', ts:2, faturas:[],
      gastos:[
        { id:'g5', data:'2026-10-27', val:50, desc:'Uber', cat:'Transporte', subcat:'', parc:1, ts:5 },
        { id:'g6', data:'2026-10-29', val:70, desc:'Cinema', cat:'Lazer', subcat:'', parc:1, ts:6 },
      ] },
    { id:'cc3', nome:'Loja', band:'Elo', lim:1000, venc:15, fech:'', grad:'', ts:3, faturas:[],
      gastos:[ { id:'g7', data:'2026-10-20', val:40, desc:'Camiseta', cat:'Vestuário', subcat:'', parc:1, ts:7 } ] },
  ],
};
