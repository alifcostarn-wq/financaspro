// Cenário de exemplo para Contas a Pagar consolidadas (hoje = 2026-10-15)
const rec = (id, n, venc, extra) => Object.assign({ id, venc, valor:1500, desc:'Aluguel', cat:'Moradia', subcat:'Aluguel', obs:'',
  rec:'Mensal', recAncora:'2026-01-05', recFim:{tipo:'nunca'}, recAtiva:true, serieId:'sAlug', serieNum:n,
  dataPg:'', status:'Pendente', parcela:1, totalParcelas:1, grupoId:'', caixaId:'', caixaNome:'', ccId:'', ts:n }, extra || {});
const contas = [];
for(let i = 1; i <= 10; i++) contas.push(rec('al' + i, i, `2026-${String(i).padStart(2,'0')}-05`, i <= 9 ? { status:'Pago', dataPg:`2026-${String(i).padStart(2,'0')}-05`, valorPago:1500 } : {}));
contas.push({ id:'luz', venc:'2026-10-20', valor:200, desc:'Luz', cat:'Moradia', subcat:'Energia', rec:'Única', dataPg:'', status:'Pendente', parcela:1, totalParcelas:1, grupoId:'', ccId:'', ts:20 });
contas.push({ id:'net', venc:'2026-10-08', valor:100, desc:'Internet', cat:'Moradia', subcat:'Internet', rec:'Única', dataPg:'2026-10-08', valorPago:100, status:'Pago', parcela:1, totalParcelas:1, grupoId:'', ccId:'', caixaNome:'Itaú', ts:21 });
['2026-09-25','2026-10-25','2026-11-25','2026-12-25'].forEach((v, i) => contas.push({ id:'gel' + i, venc:v, valor:250, desc:`Geladeira (${i+1}/4)`, cat:'Casa', subcat:'', rec:'Única',
  dataPg:i === 0 ? '2026-09-25' : '', status:i === 0 ? 'Pago' : 'Pendente', parcela:i + 1, totalParcelas:4, grupoId:'gGel', ccId:'', ts:30 + i }));
contas.push({ id:'nfx', venc:'2026-10-20', valor:55.9, desc:'Netflix', cat:'Lazer', subcat:'Streaming', rec:'Única', dataPg:'', status:'Pendente', parcela:1, totalParcelas:1, grupoId:'', ccId:'cc1', ts:40 });
module.exports = {
  cfg:{sal:8000,si:0,ano:2026,pct:20}, formas:['PIX'], kanban:[], lancs:[], orcs:[], contas,
  _seeded:true,_bancosSeeded:true,_lancsSeeded:true,_caixaRelinked:true,_orcAnoMigrado:true,
  ccs:[{ id:'cc1', nome:'Nubank', band:'Master', lim:8000, venc:10, fech:3, grad:'', ts:1,
         faturas:[{ id:'f9', mes:8, ano:2026, valor:780, status:'Pago', dataPg:'2026-09-10', caixaNome:'Itaú', gerarLanc:false }],
         gastos:[ { id:'tv', data:'2026-06-15', val:3000, desc:'TV 55"', cat:'Casa', subcat:'', parc:10, ts:1 },
                  { id:'mer', data:'2026-10-01', val:450, desc:'Mercado', cat:'Alimentação', subcat:'', parc:1, ts:2 },
                  { id:'cel', data:'2026-08-20', val:1200, desc:'Celular', cat:'Eletrônicos', subcat:'', parc:6, ts:3 } ] }],
  divs:[ { id:'emp', nome:'Empréstimo Itaú', total:2400, nparc:6, pagas:2, saldo:1600, mensal:400, juros:0, cor:'#ff4d6d', ts:1, pags:[],
           parcelas:['2026-08-15','2026-09-15','2026-10-15','2026-11-15','2026-12-15','2027-01-15'].map((v, i) => ({ id:'ep' + i, num:i + 1, total:6, venc:v, valor:400,
             status:i < 2 ? 'Pago' : 'Pendente', dataPg:i < 2 ? v : '', valorPago:i < 2 ? 400 : null })) },
         { id:'ren', nome:'Renner', total:586.31, saldo:522.09, mensal:64.22, juros:0, cor:'#ffd43b', pags:[], ts:2 } ],
  bancos:[{id:'bk',nome:'Itaú',banco:'Itaú',tipo:'Conta Corrente',saldoInicial:5000,cor:'',ts:1,movs:[]}],
};
