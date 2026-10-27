// Cartões: comportamento que já existia (competência, fechamento, vencimento, limite, pagamento) — hoje = 2026-10-27
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-cartao.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:1440, height:1000 } });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
  await p.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
  await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);

  const r = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const d = gs(); const cc = id => d.ccs.find(c => c.id === id);
    const comp = (ccId, gId) => { const c = cc(ccId), g = c.gastos.find(x => x.id === gId); const k = competenciaGasto(g, c); return `${MESES3[k.mes]}/${k.ano}`; };
    o.comp = ['cc1:g1','cc1:g2','cc1:g3','cc1:g4','cc2:g5','cc2:g6','cc3:g7'].map(s => { const [c, g] = s.split(':'); return g + '=' + comp(c, g); }).join(' ');
    o.fatCc1 = [8, 9, 10, 11].map(m => getFaturaMes(cc('cc1'), m, 2026)).join(',');
    o.datas = [fechVenc('cc1', 10), fechVenc('cc2', 10), fechVenc('cc3', 9)].join(' ');
    function fechVenc(id, m){ return `${dataFechFatura(cc(id), m, 2026) || '—'}/${dataVencFatura(cc(id), m, 2026)}`; }
    o.status = [['cc1', 8], ['cc1', 9], ['cc1', 10], ['cc1', 11], ['cc2', 10], ['cc3', 9], ['cc3', 10]].map(([id, m]) => statusFatura(cc(id), m, 2026)).join(',');
    o.limite = d.ccs.map(c => limiteUsado(c)).join(',');
    o.proxVenc = d.ccs.map(c => proxVencFatura(c)).join(',');
    o.parcelasNov = parcelasDaFatura(cc('cc1'), 10, 2026).map(p => `${p.g.id}:${p.num}/${p.total}:${p.valor}`).join(',');

    // ── tela ──
    go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]'));
    o.cartoes = document.querySelectorAll('#cc-grid .cc-visual').length + '|' + vis('cc-detalhe') + '|' + _ccSel;
    $('cc-mes').value = '10'; $('cc-ano').value = '2026'; renderCartoes(); selectCC('cc1');
    o.detalhe = $('cc-det-nome').textContent + '|' + $('cc-d-fat').textContent + '|' + $('cc-fatdet-total').textContent;
    o.detItens = document.querySelectorAll('#cc-fatdet-tbody tr').length;
    o.tabFaturas = [...document.querySelectorAll('#cc-fat-tbody tr')].map(tr => tr.cells[0].textContent.split('/')[0].slice(0, 3)).join(',');
    o.gastos1aFatura = [...document.querySelectorAll('#cc-gas-tbody tr')].map(tr => tr.cells[4].textContent).join(',');
    // prévia do modal de compra
    openM('m-gasto');
    $('g-data').value = '2026-10-26'; $('g-val').value = '90'; $('g-parc').value = '1'; updGastoPreview();
    o.previa = $('g-preview').textContent.includes('Novembro/2026') + '|' + $('g-preview').textContent.includes('90,00');
    $('g-data').value = '2026-10-02'; $('g-val').value = '300'; $('g-parc').value = '3'; updGastoPreview();
    o.previaParc = $('g-preview').textContent.includes('Outubro/2026') + '|' + $('g-preview').textContent.includes('Dezembro/2026') + '|' + $('g-preview').textContent.includes('100,00');
    // salvar compra
    $('g-desc').value = 'Tênis'; saveGasto();
    const t = gs().ccs[0].gastos.find(g => g.desc === 'Tênis');
    o.salvou = !vis('m-gasto') + '|' + (t && t.parc) + '|' + (t && t.val);
    o.fatOutDepois = getFaturaMes(gs().ccs[0], 9, 2026);
    // editar a compra
    editGasto('cc1', t.id);
    o.editCarrega = $('g-edit-id').value === t.id && $('g-val').value === '300';
    $('g-data').value = '2026-10-05'; saveGasto();
    o.editMoveu = `${MESES3[competenciaGasto(gs().ccs[0].gastos.find(g => g.id === t.id), gs().ccs[0]).mes]}`;
    // pagar a fatura de outubro
    pagarFatura('cc1', 9, 2026);
    o.modalPag = vis('m-pag-fat') + '|' + $('pf-mes').value + '|' + $('pf-ano').value + '|' + $('pf-val').value;
    $('pf-caixa').value = 'bk'; savePagFat();
    o.pagou = faturaPaga(gs().ccs[0], 9, 2026) + '|' + statusFatura(gs().ccs[0], 9, 2026) + '|' + gs().lancs.filter(l => l.origem === 'fatura').length;
    o.limiteDepois = limiteUsado(gs().ccs[0]);
    const f = gs().ccs[0].faturas.find(x => x.mes === 9 && x.ano === 2026);
    desfazerPagFat('cc1', f.id);
    o.desfez = faturaPaga(gs().ccs[0], 9, 2026) + '|' + gs().lancs.filter(l => l.origem === 'fatura').length;
    // excluir a compra
    delGasto('cc1', t.id);
    o.excluiu = !gs().ccs[0].gastos.some(g => g.id === t.id);
    return o;
  });
  eq('competência de cada compra', r.comp, 'g1=Out/2026 g2=Nov/2026 g3=Out/2026 g4=Nov/2026 g5=Nov/2026 g6=Dez/2026 g7=Out/2026');
  eq('faturas do Nubank (set a dez)', r.fatCc1, '150,300,490,200');
  eq('fechamento/vencimento', r.datas, '2026-11-03/2026-11-10 2026-10-28/2026-11-05 —/2026-10-15');
  eq('situação das faturas', r.status, 'Pago,Vencida,Aberta,Aberta,Aberta,Vencida,Sem movimento');
  eq('limite usado', r.limite, '990,120,40');
  eq('próximo vencimento', r.proxVenc, '2026-11-10,2026-11-05,2026-11-15');
  eq('parcelas da fatura de novembro', r.parcelasNov, 'g3:2/3:200,g2:1/1:200,g4:1/1:90');
  eq('tela: 3 cartões e detalhe do 1º', r.cartoes, '3|true|cc1');
  eq('detalhe da competência', r.detalhe, 'Nubank|R$ 490,00|R$ 490,00');
  eq('fatura detalhada: 3 itens', r.detItens, 3);
  eq('faturas do ano', r.tabFaturas, 'Set,Out,Nov,Dez');
  eq('1ª fatura de cada compra', r.gastos1aFatura, 'Nov/26,Nov/26,Out/26,Out/26,Set/26');
  eq('prévia da compra: fatura e valor', r.previa, 'true|true');
  eq('prévia parcelada: 1ª e última fatura, valor da parcela', r.previaParc, 'true|true|true');
  eq('salvar compra', r.salvou, 'true|3|300');
  eq('compra entra na fatura', r.fatOutDepois, 400);
  eq('editar carrega a compra', r.editCarrega, true);
  eq('editar a data muda a fatura', r.editMoveu, 'Nov');
  eq('pagar fatura abre o modal certo', r.modalPag, 'true|9|2026|300');
  eq('pagamento registra e gera lançamento', r.pagou, 'true|Pago|1');
  eq('fatura paga libera o limite', r.limiteDepois, 990 - 300 + 300);
  eq('desfazer pagamento', r.desfez, 'false|0');
  eq('excluir compra', r.excluiu, true);
  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
