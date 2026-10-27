// Contas a Pagar consolidadas: contas + faturas de cartão + parcelas de dívidas (hoje = 2026-10-15)
const { chromium } = require('./_pw.js');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-pagar.js');
const VAZIO = { cfg:{sal:5000,si:0,ano:2026,pct:20}, formas:['PIX'], kanban:[], lancs:[], orcs:[], contas:[], ccs:[], divs:[], bancos:[],
  _seeded:true,_bancosSeeded:true,_lancsSeeded:true,_caixaRelinked:true,_orcAnoMigrado:true };
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});

async function abrir(b, data, vp){
  const ctx = await b.newContext({ viewport:vp || { width:1440, height:1000 } });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1');
    localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data});
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message)); p.on('dialog', dl => dl.accept());
  await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
  await p.goto(FILE, { waitUntil:'load' }); await p.waitForTimeout(400);
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  let { ctx, p } = await abrir(b, DATA);

  // ── motor ──
  const m = await p.evaluate(() => {
    const o = {}; const l = pagaveis();
    const ach = f => l.find(f) || {};
    const fOut = ach(x => x.tipo === 'fatura' && x.mes === 9 && x.ano === 2026);
    o.fatOut = [fOut.venc, fOut.valor, fOut.status, fOut.aberto, fOut.soma, fOut.itens.length].join('|');
    o.fatOutIgualCartao = fOut.valor === getFaturaMes(gs().ccs[0], 9, 2026);
    const fSet = ach(x => x.tipo === 'fatura' && x.mes === 8);
    o.fatSetPaga = [fSet.status, fSet.valor, fSet.previsto, fSet.aberto, fSet.dataPg, fSet.fatId].join('|');
    const net = ach(x => x.conta && x.conta.id === 'nfx');
    o.netflix = [net.tipo, net.origem, net.status, net.soma, net.aberto, net.fat && `${net.fat.mes}/${net.fat.ano}`].join('|');
    const fNov = ach(x => x.tipo === 'fatura' && x.mes === 10);
    o.fatNovTemNetflix = fNov.valor + '|' + fNov.itens.some(i => i.g.refContaId === 'nfx');
    const est = l.filter(x => x.tipo === 'divida-est');
    o.renner = [est.length, est[0].venc, est[0].valor, est[est.length-1].venc, est[est.length-1].valor, est[0].status, est[0].restam].join('|');
    o.emprestimo = l.filter(x => x.tipo === 'divida').map(x => x.status).join(',');
    o.ordem = l.filter(x => x.venc >= '2026-10-20' && x.venc <= '2026-10-31').map(x => x.tipo).join(',');
    // sem contar em dobro: Netflix só dentro da fatura de novembro
    const nov = l.filter(x => x.soma && x.venc.startsWith('2026-11'));
    o.somaNov = +nov.reduce((a, x) => a + x.valor, 0).toFixed(2);
    const pr = projecaoPagar();
    o.meses = pr.meses.map(m => m.total).join(',');
    o.invariante = pr.meses.every(m => Math.abs(m.conta + m.cartao + m.divida - m.total) < 0.006 && Math.abs(m.pago + m.aberto - m.total) < 0.006);
    o.mesOut = [pr.meses[0].conta, pr.meses[0].cartao, pr.meses[0].divida, pr.meses[0].pago, pr.meses[0].aberto].join('|');
    o.atrasado = pr.atrasado + '|' + pr.qtdAtrasado;
    o.terminos = pr.terminos.map(t => `${rotuloAbs(t.abs, true)} ${t.nome} ${t.valor} ${t.origem}`).join(' ; ');
    o.libera = pr.meses.map(m => m.libera).join(',');
    // o que termina faz o mês seguinte cair exatamente esse valor (quando nada novo entra)
    o.quedaDez = +(pr.meses[2].total - pr.meses[3].total).toFixed(2);

    // ── cenários extras sobre uma cópia (motor puro) ──
    const d2 = JSON.parse(JSON.stringify(gs()));
    const base = { rec:'Única', dataPg:'', status:'Pendente', subcat:'', cat:'Casa', ts:1 };
    // quinzenal: duas parcelas no último mês → o término libera as duas
    ['2026-10-22','2026-11-05','2026-11-19'].forEach((v, i) => d2.contas.push({ ...base, id:'q'+i, venc:v, valor:100, desc:`Sofá (${i+1}/3)`, parcela:i+1, totalParcelas:3, grupoId:'gq', ccId:'' }));
    // parcelada no cartão: o término é o mês em que vence a fatura da última parcela
    ['2026-11-04','2026-12-04','2027-01-04'].forEach((v, i) => d2.contas.push({ ...base, id:'k'+i, venc:v, valor:80, desc:`Curso (${i+1}/3)`, parcela:i+1, totalParcelas:3, grupoId:'gk', ccId:'cc1' }));
    sincronizarContasNoCartao(d2);
    // recorrente com nº de ocorrências atingido termina; sem fim não termina
    [1,2,3].forEach(n => d2.contas.push({ ...base, id:'r'+n, venc:`2026-${String(9+n).padStart(2,'0')}-12`, valor:50, desc:'Academia', rec:'Mensal', recAncora:'2026-10-12', recFim:{tipo:'qtd',qtd:3}, recAtiva:true, serieId:'sR', serieNum:n, parcela:1, totalParcelas:1, grupoId:'', ccId:'' }));
    const t2 = terminosPagar(d2);
    const ach2 = n => t2.find(t => t.nome === n);
    o.quinzenal = ach2('Sofá') ? rotuloAbs(ach2('Sofá').abs, true) + ' ' + ach2('Sofá').valor : 'nenhum';
    o.cartaoParc = ach2('Curso') ? rotuloAbs(ach2('Curso').abs, true) + ' ' + ach2('Curso').origem : 'nenhum';
    o.recQtd = ach2('Academia') ? rotuloAbs(ach2('Academia').abs, true) : 'nenhum';
    o.recSemFim = t2.some(t => t.nome === 'Aluguel');
    // a conta parcelada no cartão não vira item "conta" na soma: entra pelas faturas
    const l2 = pagaveis(d2);
    o.cursoNaSoma = l2.filter(x => x.soma && x.conta && x.conta.grupoId === 'gk').length + '|'
      + l2.filter(x => x.tipo === 'conta-cartao' && x.conta.grupoId === 'gk').length;
    return o;
  });
  eq('fatura de outubro: vence 10/10, 3 compras, vencida', m.fatOut, '2026-10-10|950|Vencida|true|true|3');
  eq('fatura = mesmo valor da aba Cartões', m.fatOutIgualCartao, true);
  eq('fatura paga: vale o que foi pago', m.fatSetPaga, 'Pago|780|500|false|2026-09-10|f9');
  eq('conta no cartão aparece, mas fora da soma', m.netflix, 'conta-cartao|cartao|No cartão|false|false|10/2026');
  eq('fatura de novembro já traz a Netflix', m.fatNovTemNetflix, '555.9|true');
  eq('dívida sem parcelas: 9 meses estimados, último com o resto', m.renner, '9|2026-10-31|64.22|2027-06-30|8.33|Estimada|9');
  eq('parcelas da dívida com status', m.emprestimo, 'Pago,Pago,Pendente,Pendente,Pendente,Pendente');
  eq('ordem: no mesmo dia a conta vem antes da conta no cartão; estimada no fim do mês', m.ordem, 'conta,conta-cartao,conta,divida-est');
  eq('novembro sem contar a Netflix duas vezes', m.somaNov, 2770.12);
  eq('totais dos 12 meses', m.meses, '3464.22,2770.12,2714.22,2464.22,2064.22,1864.22,1864.22,1564.22,1508.33,1500,1500,1500');
  eq('origens e pago/aberto fecham com o total', m.invariante, true);
  eq('outubro por origem e pago/aberto', m.mesOut, '2050|950|464.22|100|3364.22');
  eq('vencido de meses anteriores', m.atrasado, '600|2');
  eq('parcelamentos que terminam', m.terminos, 'Dez/26 Geladeira 250 conta ; Jan/27 Empréstimo Itaú 400 divida ; Fev/27 Celular 200 cartao ; Abr/27 TV 55" 300 cartao ; Jun/27 Renner 8.33 divida');
  eq('quanto cada mês libera', m.libera, '0,0,250,400,200,0,300,0,8.33,0,0,0');
  eq('o término de dezembro derruba janeiro em R$ 250', m.quedaDez, 250);
  eq('quinzenal: soma as duas parcelas do último mês', m.quinzenal, 'Nov/26 200');
  eq('parcelada no cartão termina no mês da fatura', m.cartaoParc, 'Fev/27 cartao');
  eq('recorrente com fim termina na última ocorrência', m.recQtd, 'Dez/26');
  eq('recorrente sem fim não termina', m.recSemFim, false);
  eq('parcelada no cartão: fora da soma, listada pelas contas', m.cursoNaSoma, '0|3');

  // ── tela ──
  const r = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const linhas = () => [...document.querySelectorAll('#cp-tbody > tr')];
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    o.filtroPadrao = $('cp-fil-ano').value + '|' + $('cp-fil-mes').value;
    o.kpis = ['ck-total-lbl','ck-total','ck-total-sub','ck-pend','ck-pend-sub','ck-pago','ck-venc','ck-venc-sub','ck-7d','ck-7d-sub'].map(i => $(i).textContent).join(' / ');
    o.linhas = linhas().length;
    o.origens = linhas().map(tr => tr.cells[2].textContent.trim()).join(',');
    const net = linhas().find(tr => tr.textContent.includes('Netflix'));
    o.netDentro = net.textContent.includes('dentro da fatura') + '|' + net.cells[4].classList.contains('cp-dentro') + '|' + net.querySelector('.badge').textContent;
    const fat = linhas().find(tr => tr.textContent.includes('Fatura Nubank · Out/26'));
    o.fatLinha = [fat.querySelector('.badge').textContent, !!fat.querySelector('button[onclick="pagarFatura(\'cc1\',9,2026)"]'),
      !!fat.querySelector('button[onclick="abrirFatura(\'cc1\',9,2026)"]'), fat.textContent.includes('fechada em 03/10/2026'), fat.textContent.includes('2 parceladas')].join('|');
    const div = linhas().find(tr => tr.textContent.includes('parcela 3/6'));
    o.divLinha = [div.querySelector('.badge').textContent, !!div.querySelector('button[onclick="pagarParcela(\'emp\',\'ep2\')"]'), !!div.querySelector('button[onclick="abrirDivida(\'emp\')"]')].join('|');
    const est = linhas().find(tr => tr.textContent.includes('Renner'));
    o.estLinha = [est.classList.contains('cp-est'), est.querySelector('.badge').textContent, est.cells[0].textContent.includes('Out/2026'), !est.querySelector('.btn-green'), est.textContent.includes('faltam 9 meses')].join('|');
    o.listaSub = $('cp-lista-sub').textContent;
    // compras da fatura
    fat.querySelector('.cp-ver').click();
    const sub = document.querySelector('#cp-tbody tr.cp-itens-row');
    o.itens = sub ? [...sub.querySelectorAll('.cp-item:not(.cab)')].map(i => i.querySelector('.d').textContent + ' ' + i.querySelector('.n').textContent + ' ' + i.querySelector('.v').textContent).join(' ; ') : 'nada';
    o.itensSeguem = linhas().length + '|' + (linhas().find(tr => tr.textContent.includes('Fatura Nubank · Out/26')).querySelector('.cp-ver').getAttribute('aria-expanded'));
    document.querySelector('#cp-tbody .cp-ver[aria-expanded="true"]').click();
    o.itensFecham = linhas().length;
    // filtros
    const filtra = (id, v) => { $(id).value = v; renderContas(); return linhas().length; };
    o.porOrigem = ['conta','cartao','divida'].map(v => filtra('cp-fil-orig', v)).join(',');
    filtra('cp-fil-orig', '');
    o.porStatus = ['Vencida','Pendente','Pago','No cartão'].map(v => filtra('cp-fil-st', v)).join(',');
    filtra('cp-fil-st', '');
    $('cp-busca').value = 'celular'; renderContas();
    o.buscaCompra = linhas().length + '|' + linhas()[0].textContent.includes('Fatura Nubank') + '|' + !!document.querySelector('#cp-tbody tr.cp-itens-row');
    $('cp-busca').value = ''; renderContas();
    o.catFatura = [...$('cp-fil-cat').options].map(x => x.value).includes(papel('financeiro'));
    // vence hoje
    o.hoje = vis('ck-hoje-wrap') + '|' + $('ck-hoje-qtd').textContent + '|' + $('ck-hoje-total').textContent + '|'
      + !!$('ck-hoje-list').querySelector('button[onclick="pagarParcela(\'emp\',\'ep2\')"]');
    // pílula do menu: fat. jul, fat. ago, fat. out, aluguel out (vencidas) + empréstimo hoje + luz em 5 dias
    o.pill = $('pill-contas').textContent + '|' + $('pill-contas').title.includes('faturas');
    // projeção
    o.tAtual = $('cp-tile-atual').textContent.replace(/\s+/g, ' ').trim();
    o.tProx = $('cp-tile-prox').textContent.replace(/\s+/g, ' ').trim();
    o.tFim = $('cp-tile-fim').textContent.replace(/\s+/g, ' ').trim();
    o.term = [...document.querySelectorAll('#cp-termina-lista .cp-term')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).join(' ; ');
    o.nota = $('cp-proj-nota').textContent;
    const ch = CH['ch-cp-proj'];
    const ds = ch.config.data.datasets;
    o.grafico = [ch.config.type, ch.config.data.labels.length, ch.config.data.labels[0], ch.config.data.labels[11], ds.map(x => x.label).join('+'), ds.map(x => x.backgroundColor).join(',')].join('|');
    o.graficoSoma = ds[0].data.map((_, i) => +(ds[0].data[i] + ds[1].data[i] + ds[2].data[i]).toFixed(2)).join(',');
    o.umEixo = Object.keys(ch.config.options.scales).join(',') + '|' + ch.config.options.scales.y.stacked;
    o.legenda = ch.config.options.plugins.legend.display;
    // tabela da projeção
    cpVista('tabela');
    o.tabela = vis('cp-proj-tabela') + '|' + !vis('cp-proj-graf') + '|' + document.querySelectorAll('#cp-proj-tab tbody tr').length + '|' + $('cp-vista-tab').classList.contains('active');
    const linhaDez = document.querySelectorAll('#cp-proj-tab tbody tr')[2];
    o.tabDez = linhaDez.textContent.replace(/\s+/g, ' ').trim();
    o.tabSel = document.querySelectorAll('#cp-proj-tab tbody tr')[0].classList.contains('sel');
    linhaDez.click();
    o.clicaMes = $('cp-fil-ano').value + '|' + $('cp-fil-mes').value + '|' + $('ck-total-lbl').textContent + '|' + $('ck-total').textContent
      + '|' + document.querySelectorAll('#cp-proj-tab tbody tr')[2].classList.contains('sel');
    cpVerMes(2026 * 12 + 11);
    o.clicaDeNovo = $('cp-fil-mes').value + '|' + $('ck-total-lbl').textContent;
    // mês de outro ano pela projeção
    cpVerMes(2027 * 12 + 2);
    o.outroAno = $('cp-fil-ano').value + '|' + $('cp-fil-mes').value + '|' + $('ck-total').textContent;
    cpVista('grafico');
    o.voltaGrafico = vis('cp-proj-graf') + '|' + !vis('cp-proj-tabela');
    $('cp-fil-ano').value = '2026'; $('cp-fil-mes').value = '9'; renderContas();
    return o;
  });
  eq('filtro abre no mês atual', r.filtroPadrao, '2026|9');
  eq('KPIs do mês com todas as origens', r.kpis, 'Total a pagar · Out/2026 / R$ 3.464,22 / 4 contas · 1 fatura · 2 parcelas / R$ 3.364,22 / inclui 💳 R$ 950,00 de cartão / R$ 100,00 / R$ 2.450,00 / 1 conta · 1 fatura em atraso / R$ 600,00 / 1 conta · 1 parcela a vencer');
  eq('8 linhas no mês', r.linhas, 8);
  eq('coluna origem', r.origens, 'Conta,Conta,CartãoNubank,Dívida,Conta,CartãoNubank,Conta,Dívida');
  eq('conta no cartão: valor apagado, "dentro da fatura"', r.netDentro, 'true|true|💳 No cartão');
  eq('linha da fatura: status, pagar, ver, fase, parceladas', r.fatLinha, 'Vencida|true|true|true|true');
  eq('linha da dívida: pagar a parcela certa e ver', r.divLinha, 'Pendente|true|true');
  eq('dívida estimada: sem dia, sem pagar, faltam 9', r.estLinha, 'true|Estimada|true|true|true');
  eq('resumo da lista', r.listaSub, '8 itens · R$ 3.464,22 no total · contas no cartão somam pela fatura');
  eq('compras da fatura abrem na lista', r.itens, 'TV 55" 4/10 R$ 300,00 ; Celular 2/6 R$ 200,00 ; Mercado à vista R$ 450,00');
  eq('aberta continua aberta ao redesenhar', r.itensSeguem, '9|true');
  eq('e fecha de novo', r.itensFecham, 8);
  eq('filtro por origem (contas, cartões, dívidas)', r.porOrigem, '4,2,2');
  eq('filtro por status (vencida, pendente c/ estimada, pago, no cartão)', r.porStatus, '2,4,1,1');
  eq('busca acha a compra dentro da fatura e abre', r.buscaCompra, '2|true|true');
  eq('categoria da fatura no filtro', r.catFatura, true);
  eq('vence hoje: a parcela da dívida', r.hoje, 'true|1|400,00|true');
  eq('pílula do menu com faturas e parcelas', r.pill, '6|true');
  eq('destaque: este mês', r.tAtual, 'Este mês · Outubro/2026 R$ 3.464,22 pago R$ 100,00 · falta R$ 3.364,22 + R$ 600,00 vencidos de meses anteriores (2) Contas R$ 2.050,00Cartões R$ 950,00Dívidas R$ 464,22');
  eq('destaque: próximo mês cai', r.tProx, 'Próximo mês · Novembro/2026 R$ 2.770,12 ▼ R$ 694,10 (−20%) em relação a este mês Contas R$ 1.750,00Cartões R$ 555,90Dívidas R$ 464,22');
  eq('destaque: fim da projeção', r.tFim, 'Em Setembro/2027 R$ 1.500,00 ▼ R$ 1.964,22 (−57%) por mês em relação a este mês Contas R$ 1.500,00Cartões R$ 0,00Dívidas R$ 0,00');
  eq('lista do que termina', r.term, 'Dez/26 Geladeira4x · livre a partir de Jan/27 −R$ 250,00 ; Jan/27 Empréstimo Itaú6 parcelas · livre a partir de Fev/27 −R$ 400,00 ; Fev/27 Celular6x · Nubank · livre a partir de Mar/27 −R$ 200,00 ; Abr/27 TV 55"10x · Nubank · livre a partir de Mai/27 −R$ 300,00 ; Jun/27 Rennerestimada pelo saldo · livre a partir de Jul/27 −R$ 8,33');
  eq('texto: quanto cai', r.nota.includes('o total do mês cai de R$ 3.464,22 para R$ 1.500,00: R$ 1.964,22 a menos por mês (−57%).'), true);
  eq('texto: términos e o que libera', r.nota.includes('5 parcelamentos terminam nesse período, liberando R$ 1.158,33 por mês.'), true);
  eq('texto: dívida estimada', r.nota.includes('A dívida Renner não tem parcelas cadastradas'), true);
  eq('gráfico: colunas, 12 meses, 3 origens, cores validadas', r.grafico, 'bar|12|Out/26|Set/27|Contas+Cartões+Dívidas|#c98500,#3987e5,#d55181');
  eq('gráfico soma o total de cada mês', r.graficoSoma, '3464.22,2770.12,2714.22,2464.22,2064.22,1864.22,1864.22,1564.22,1508.33,1500,1500,1500');
  eq('um eixo só, empilhado', r.umEixo, 'x,y|true');
  eq('legenda com 3 séries', r.legenda, true);
  eq('tabela: 12 meses', r.tabela, 'true|true|12|true');
  eq('tabela: dezembro', r.tabDez, 'Dez/26 R$ 1.750,00R$ 500,00R$ 464,22 R$ 2.714,22 ▼ R$ 750,00 (−22%) Geladeira −R$ 250,00');
  eq('tabela marca o mês do filtro', r.tabSel, true);
  eq('clicar no mês leva a lista a ele', r.clicaMes, '2026|11|Total a pagar · Dez/2026|R$ 2.714,22|true');
  eq('clicar de novo volta ao ano', r.clicaDeNovo, '|Total a pagar · 2026');
  eq('mês do ano seguinte', r.outroAno, '2027|2|R$ 1.864,22');
  eq('volta ao gráfico', r.voltaGrafico, 'true|true');

  // ── pagar e desfazer a partir de Contas a Pagar ──
  const pg = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const linha = t => [...document.querySelectorAll('#cp-tbody > tr')].find(tr => tr.textContent.includes(t));
    // fatura
    linha('Fatura Nubank · Out/26').querySelector('.btn-green').click();
    o.modalFat = vis('m-pag-fat') + '|' + $('pf-mes').value + '|' + $('pf-ano').value + '|' + $('pf-val').value;
    $('pf-caixa').value = 'bk'; savePagFat();
    o.fatPaga = linha('Fatura Nubank · Out/26').querySelector('.badge').textContent + '|' + $('ck-pago').textContent + '|' + $('ck-pend').textContent + '|' + _page;
    o.lancFat = gs().lancs.filter(l => l.origem === 'fatura').length;
    // desfazer a fatura
    linha('Fatura Nubank · Out/26').querySelector('button[onclick^="desfazerPagFat"]').click();
    o.fatDesfeita = linha('Fatura Nubank · Out/26').querySelector('.badge').textContent + '|' + gs().lancs.filter(l => l.origem === 'fatura').length;
    // parcela da dívida
    linha('parcela 3/6').querySelector('.btn-green').click();
    o.modalDiv = vis('m-pg-div') + '|' + $('pgd-parc').value + '|' + $('pgd-val').value;
    savePgDiv();
    o.divPaga = linha('parcela 3/6').querySelector('.badge').textContent + '|' + $('ck-pago').textContent + '|' + !document.getElementById('ck-hoje-wrap').offsetParent;
    linha('parcela 3/6').querySelector('button[onclick^="desfazerPgDiv"]').click();
    o.divDesfeita = linha('parcela 3/6').querySelector('.badge').textContent;
    // conta pelo caixa continua com o fluxo de antes
    linha('Luz').querySelector('.btn-green').click();
    o.modalConta = vis('m-pagar');
    closeM('m-pagar');
    // fatura de outro ano: o ano entra na lista do modal
    pagarFatura('cc1', 6, 2025);
    o.anoFora = $('pf-ano').value + '|' + [...$('pf-ano').options].map(x => x.value).join(',');
    closeM('m-pag-fat');
    // ver fatura / ver dívida
    abrirFatura('cc1', 10, 2026);
    o.verFatura = _page + '|' + _ccView + '|' + $('cc-mes').value + '|' + _ccSel;
    abrirDivida('emp');
    o.verDivida = _page + '|' + ($('parcelas-emp').style.display);
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    // tema claro troca as cores do gráfico
    applyTheme('light'); renderContas();
    o.claro = CH['ch-cp-proj'].config.data.datasets.map(x => x.backgroundColor).join(',');
    applyTheme('dark');
    return o;
  });
  eq('pagar fatura abre o modal certo', pg.modalFat, 'true|9|2026|950');
  eq('fatura paga reflete na lista e nos KPIs', pg.fatPaga, 'Pago|R$ 1.050,00|R$ 2.414,22|contas');
  eq('pagamento da fatura gera lançamento', pg.lancFat, 1);
  eq('desfazer volta a vencida e tira o lançamento', pg.fatDesfeita, 'Vencida|0');
  eq('pagar parcela abre o modal na parcela certa', pg.modalDiv, 'true|ep2|400');
  eq('parcela paga: lista, KPI e some do "vence hoje"', pg.divPaga, 'Pago|R$ 500,00|true');
  eq('desfazer a parcela', pg.divDesfeita, 'Pendente');
  eq('conta pelo caixa abre o pagamento de conta', pg.modalConta, true);
  eq('fatura de outro ano: ano incluído no modal', pg.anoFora, '2025|2026,2025');
  eq('ver fatura', pg.verFatura, 'cartoes|fatura|10|cc1');
  eq('ver dívida com as parcelas abertas', pg.verDivida, 'dividas|block');
  eq('tema claro: cores validadas do claro', pg.claro, '#eda100,#2a78d6,#e87ba4');
  errs.push(...p._errs); await ctx.close();

  // ── sem nada cadastrado ──
  ({ ctx, p } = await abrir(b, VAZIO));
  const v = await p.evaluate(() => {
    const $ = i => document.getElementById(i);
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    return [$('ck-total').textContent, $('cp-empty').textContent, $('cp-tile-atual').querySelector('.cp-tile-val').textContent,
      $('cp-termina-lista').textContent.trim(), $('cp-proj-nota').textContent.startsWith('Considera'), $('pill-contas').textContent].join('|');
  });
  eq('vazio: zeros e mensagens', v, 'R$ 0,00|Nenhuma conta cadastrada. Clique em "+ Nova Conta".|R$ 0,00|Nenhum parcelamento termina até Set/27.|true|');
  errs.push(...p._errs); await ctx.close();

  // ── celular: sem rolagem lateral na página ──
  ({ ctx, p } = await abrir(b, DATA, { width:390, height:844 }));
  const cel = await p.evaluate(() => {
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    const t = document.querySelectorAll('#cp-hero .cp-tile');
    const mix = [...t].map(x => getComputedStyle(x.querySelector('.cp-tile-mix')).display).join(',');
    return [document.documentElement.scrollWidth, getComputedStyle(document.getElementById('cp-hero')).gridTemplateColumns.split(' ').length, mix].join('|');
  });
  eq('celular: sem rolagem lateral, destaques em coluna', cel, '390|1|flex,none,none');
  errs.push(...p._errs); await ctx.close();

  // ── desempenho: muitos dados ──
  const GRANDE = JSON.parse(JSON.stringify(DATA));
  for(let c = 0; c < 3; c++){
    const cc = { id:'g' + c, nome:'Cartão ' + c, band:'Visa', lim:20000, venc:5 + c * 5, fech:28 - c * 3, grad:'', ts:c, faturas:[], gastos:[] };
    for(let i = 0; i < 400; i++) cc.gastos.push({ id:`g${c}_${i}`, data:`202${4 + (i % 3)}-${String(1 + i % 12).padStart(2,'0')}-${String(1 + i % 27).padStart(2,'0')}`, val:50 + i, desc:'Compra ' + i, cat:'Lazer', subcat:'', parc:1 + (i % 12), ts:i });
    GRANDE.ccs.push(cc);
  }
  for(let i = 0; i < 300; i++) GRANDE.contas.push({ id:'x' + i, venc:`202${5 + (i % 2)}-${String(1 + i % 12).padStart(2,'0')}-10`, valor:100 + i, desc:'Conta ' + i, cat:'Casa', subcat:'', rec:'Única', dataPg:'', status:'Pendente', parcela:1, totalParcelas:1, grupoId:'', ccId:'', ts:i });
  ({ ctx, p } = await abrir(b, GRANDE));
  const perf = await p.evaluate(() => {
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    const t0 = performance.now(); for(let i = 0; i < 5; i++) renderContas(); const tr = (performance.now() - t0) / 5;
    const t1 = performance.now(); for(let i = 0; i < 5; i++) updSbSaldo(); const tp = (performance.now() - t1) / 5;
    return { tr, tp, n:pagaveis().length };
  });
  console.log(`desempenho: renderContas ${perf.tr.toFixed(1)} ms · updSbSaldo ${perf.tp.toFixed(1)} ms · ${perf.n} itens`);
  eq('desempenho: tela < 400 ms e menu < 150 ms com 1.200 compras e 300 contas', perf.tr < 400 && perf.tp < 150, true);
  errs.push(...p._errs); await ctx.close();

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close();
  process.exit(ok===T.length?0:1);
})();
