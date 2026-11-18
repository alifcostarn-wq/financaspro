// Dívidas: excluir só uma parcela (ex.: renegociação) e recalcular o que fica — hoje = 2026-10-15
// Empréstimo Itaú: 6 × R$ 400 (ago/26 a jan/27), as 2 primeiras pagas
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = JSON.parse(JSON.stringify(require('./dados-pagar.js')));
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport:{ width:1400, height:900 } });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
  await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
  await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
  const txt = (sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), sel);
  const aberto = id => p.evaluate(id => getComputedStyle(document.getElementById(id)).display === 'flex', id);
  const div = () => p.evaluate(() => { const dv = gs().divs.find(x => x.id === 'emp');
    return `${dv.nparc}x · total ${dv.total} · saldo ${dv.saldo} · mensal ${dv.mensal} · pagas ${dv.pagas} · ` + dv.parcelas.map(x => `${x.num}/${x.total}:${x.venc.slice(5)}=${x.valor}${x.status === 'Pago' ? '✓' : ''}`).join(' '); });

  // ── 1. Pela aba Dívidas: excluir e diminuir a dívida ──
  await p.evaluate(() => { irPagina('dividas'); toggleParcelas('emp'); });
  await p.click('#parcelas-emp tbody tr:nth-child(4) .btn-red');   // parcela 4/6 (nov)
  eq('✕ na parcela abre a escolha', `${await aberto('m-del-parc')}|${await txt('#xp-desc')}|${await txt('#xp-valor')}`, 'true|Empréstimo Itaú — parcela 4/6|R$ 400,00');
  eq('as duas opções explicam o resultado', await txt('#xp-opcoes .btn > div > div'),
    'Excluir e diminuir a dívida | O total passa de R$ 2.400,00 para R$ 2.000,00; as outras parcelas não mudam. | '
    + 'Excluir e dividir o valor nas que ficam | Cerca de +R$ 133,33 em cada uma das 3 parcelas em aberto; o total continua R$ 2.400,00.');
  await p.evaluate(() => excluirParcelaDiv('reduzir'));
  eq('diminuir: 5 parcelas renumeradas; total, saldo e pagas recalculados', await div(),
    '5x · total 2000 · saldo 1200 · mensal 400 · pagas 2 · 1/5:08-15=400✓ 2/5:09-15=400✓ 3/5:10-15=400 4/5:12-15=400 5/5:01-15=400');
  eq('a aba Dívidas mostra o novo número de parcelas', (await txt('#dv-lista .debt-hd .badge')).includes('2/5 parcelas pagas'), true);

  // ── 2. Pelo detalhe da conta a pagar: excluir e dividir o valor ──
  await p.evaluate(() => { irPagina('contas'); abrirDetalhePagar(pagaveis(gs()).find(x => x.dv && x.dv.id === 'emp' && x.pc.num === 5).chave); });
  eq('detalhe da dívida tem "Excluir parcela"', await txt('#cpd-ft .btn'), '✕ Excluir parcela | 📉 Ver dívida | ✓ Pagar parcela');
  await p.click('#cpd-ft .btn-red');
  eq('a escolha abre por cima do detalhe', `${await aberto('m-del-parc')}|${await aberto('m-cp-det')}`, 'true|true');
  await p.evaluate(() => excluirParcelaDiv('redistribuir'));
  eq('dividir: o valor vai para as parcelas em aberto; o total fica', await div(),
    '4x · total 2000 · saldo 1200 · mensal 600 · pagas 2 · 1/4:08-15=400✓ 2/4:09-15=400✓ 3/4:10-15=600 4/4:12-15=600');
  eq('o detalhe continua aberto, na parcela em aberto seguinte', `${await aberto('m-cp-det')}|${await txt('#cpd-corpo .cpd-qual')}|${await txt('#cpd-corpo .cpd-tiles > div:first-child b')}`, 'true|Parcela 3 de 4|R$ 2.000,00');
  await p.evaluate(() => closeM('m-cp-det'));

  // ── 3. Parcela paga fica travada: só se exclui depois de desfazer o pagamento ──
  await p.evaluate(() => { const d = gs(), dv = d.divs.find(x => x.id === 'emp');
    dv.parcelas.filter(x => x.status === 'Pago').forEach(pc => { pc.gerarLanc = true; pc.dataPg = pc.venc; gerarLancDaParcela(dv, pc, d); }); ss(d); });
  await p.evaluate(() => abrirExcluirParcela('emp', gs().divs.find(x => x.id === 'emp').parcelas[0].id));
  eq('parcela paga: travada, a única opção é desfazer o pagamento', `${(await txt('#xp-aviso')).includes('Parcela paga não pode ser excluída')}|${await txt('#xp-opcoes .btn > div > div:first-child')}`, 'true|↩ Desfazer o pagamento');
  await p.evaluate(() => excluirParcelaDiv('reduzir'));
  eq('parcela paga: nem chamando a exclusão direto ela sai', (await div()).slice(0, 2), '4x');
  await p.click('#xp-opcoes .btn');
  eq('desfeito o pagamento, ela volta a ficar em aberto', await p.evaluate(() => gs().divs.find(x => x.id === 'emp').parcelas[0].status), 'Pendente');
  await p.evaluate(() => abrirExcluirParcela('emp', gs().divs.find(x => x.id === 'emp').parcelas[0].id));
  await p.evaluate(() => excluirParcelaDiv('reduzir'));
  eq('em aberto, aí sim se exclui: 3 parcelas, total sem ela', await div(), '3x · total 1600 · saldo 1200 · mensal 600 · pagas 1 · 1/3:09-15=400✓ 2/3:10-15=600 3/3:12-15=600');
  eq('lançamentos: só o da parcela que ficou, com a numeração nova', await p.evaluate(() => gs().lancs.filter(l => l.refDivId === 'emp').map(l => l.desc).join(',')), 'Empréstimo Itaú — parcela 1/3');

  // ── 4. Menu ⋯ e limites ──
  await p.evaluate(() => irPagina('contas'));
  eq('menu ⋯ da parcela tem "Excluir parcela"', await p.evaluate(() => { const tr = [...document.querySelectorAll('#cp-tbody tr')].find(t => t.textContent.includes('Empréstimo Itaú — parcela 2/3'));
    return [...tr.querySelectorAll('.cp-acoes-lista button')].map(b => b.textContent).pop(); }), '✕ Excluir parcela');
  await p.evaluate(() => { const d = gs(), dv = d.divs.find(x => x.id === 'emp'); dv.parcelas = dv.parcelas.slice(0, 1); recalcularDivida(dv, d); ss(d); abrirExcluirParcela('emp', dv.parcelas[0].id); });
  eq('a única parcela não se exclui por aqui (exclui-se a dívida)', `${await aberto('m-del-parc')}|${await p.evaluate(() => gs().divs.find(x => x.id === 'emp').parcelas.length)}`, 'false|1');
  await p.evaluate(() => { const d = gs(), dv = d.divs.find(x => x.id === 'emp');
    dv.parcelas.push({ id:'n2', venc:'2027-02-15', valor:300, status:'Pendente' }); recalcularDivida(dv, d); ss(d); abrirExcluirParcela('emp', 'n2'); });
  eq('sem outra parcela em aberto, "dividir" fica desligado', await p.evaluate(() => document.querySelectorAll('#xp-opcoes .btn')[1].disabled), true);

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
