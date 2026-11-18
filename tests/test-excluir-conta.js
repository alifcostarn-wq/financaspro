// Contas a Pagar: conta paga fica travada e excluir o parcelamento não leva as parcelas pagas — hoje = 2026-10-15
// Geladeira (4×250): a 1ª paga. Internet: paga. Netflix: no cartão.
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
  const opcoes = () => txt('#del-conta-opcoes .btn > div > div:first-child');
  const gel = () => p.evaluate(() => gs().contas.filter(c => c.grupoId === 'gGel').map(c => `${c.parcela}${statusConta(c) === 'Pago' ? '✓' : ''}`).join(','));
  await p.evaluate(() => irPagina('contas'));

  // ── 1. Excluir o parcelamento a partir de uma parcela em aberto: a paga fica ──
  await p.evaluate(() => delConta('gel1'));
  eq('aviso diz que a paga fica', (await txt('#del-conta-aviso')).includes('sendo 1 já paga(s). As pagas ficam'), true);
  eq('opções: esta parcela ou só as em aberto', await opcoes(), 'Excluir somente esta parcela | Excluir as 3 parcela(s) em aberto');
  await p.evaluate(() => execDelConta('grupo'));
  eq('excluir o parcelamento não apaga a parcela paga', await gel(), '1✓');
  eq('o lançamento do pagamento continua', await p.evaluate(() => gs().contas.find(c => c.id === 'gel0') && true), true);

  // ── 2. Conta paga: travada até desfazer o pagamento ──
  await p.evaluate(() => delConta('gel0'));
  eq('parcela paga: travada, a única opção é desfazer', `${(await txt('#del-conta-aviso')).includes('Conta paga não pode ser excluída')}|${await opcoes()}`, 'true|↩ Desfazer o pagamento');
  await p.evaluate(() => execDelConta('uma'));
  eq('nem chamando a exclusão direto ela sai', await gel(), '1✓');
  await p.evaluate(() => delConta('net'));
  eq('conta única paga também fica travada', `${(await txt('#del-conta-aviso')).includes('(em 08/10/2026)')}|${await opcoes()}`, 'true|↩ Desfazer o pagamento');
  await p.click('#del-conta-opcoes .btn');
  eq('desfeito o pagamento, a conta volta a ficar em aberto e a exclusão aparece', `${await p.evaluate(() => statusConta(gs().contas.find(c => c.id === 'net')) !== 'Pago')}|${await opcoes()}`, 'true|Excluir conta');
  await p.evaluate(() => execDelConta('uma'));
  eq('em aberto, aí sim se exclui', await p.evaluate(() => gs().contas.some(c => c.id === 'net')), false);

  // ── 3. Recorrência: encerrar não apaga as ocorrências pagas; a paga fica travada ──
  await p.evaluate(() => delConta('al5'));
  eq('ocorrência paga da recorrência: travada', await opcoes(), '↩ Desfazer o pagamento');
  await p.evaluate(() => { delConta('al10'); execDelConta('serie'); });
  eq('encerrar a recorrência mantém as 9 pagas', await p.evaluate(() => gs().contas.filter(c => c.serieId === 'sAlug').map(c => statusConta(c) === 'Pago' ? '✓' : 'x').join('')), '✓✓✓✓✓✓✓✓✓');

  // ── 4. Conta no cartão cuja fatura já foi paga ──
  await p.evaluate(() => { const d = gs(); const c = d.contas.find(x => x.id === 'nfx'); c.venc = '2026-09-02'; sincronizarContasNoCartao(d); ss(d); delConta('nfx'); });
  eq('no cartão, com a fatura paga: travada, com o atalho para a fatura', `${(await txt('#del-conta-aviso')).includes('paga junto com a fatura do cartão')}|${await opcoes()}`, 'true|💳 Ver a fatura do cartão');

  // ── 5. Pelo detalhe: o "Excluir" de uma conta paga leva à mesma trava ──
  await p.evaluate(() => { closeM('m-del-conta'); abrirDetalhePagar('conta:gel0'); });
  await p.click('#cpd-ft .cpd-esq');
  eq('detalhe: excluir conta paga mostra a trava', await opcoes(), '↩ Desfazer o pagamento');

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
