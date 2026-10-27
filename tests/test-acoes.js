// Menu de ações (⋯) das linhas de Contas a Pagar (hoje = 2026-10-15)
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-pagar.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  for(const vp of [{ width:1366, height:768 }, { width:390, height:844 }]){
    const ctx = await b.newContext({ viewport:vp });
    await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
    await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
      localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
      localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
    await p.goto(srv.url, { waitUntil:'load' }); await p.waitForTimeout(300);
    const tag = vp.width < 500 ? 'celular: ' : '';
    await p.evaluate(() => go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]')));
    const linha = t => `#cp-tbody > tr:has-text("${t}")`;
    // uma única coluna de ação, com um botão só por linha
    const r0 = await p.evaluate(() => {
      const ls = [...document.querySelectorAll('#cp-tbody > tr')];
      return [ls.every(tr => tr.querySelectorAll('.tbl-actions > button').length === 1 && tr.querySelector('.cp-mais')),
        ls.every(tr => tr.querySelector('.cp-acoes-lista').hidden), Math.round(document.querySelector('#cp-tbody td.cp-acoes').getBoundingClientRect().width)].join('|');
    });
    eq(tag + 'um botão ⋯ por linha, lista escondida', r0.split('|').slice(0, 2).join('|'), 'true|true');
    if(!tag) eq('coluna de ações estreita', +r0.split('|')[2] <= 60, true);
    // abre o menu da Luz com o mouse
    await p.locator(linha('Luz') + ' .cp-mais').click();
    const m = await p.evaluate(() => { const pop = document.getElementById('cp-acoes-pop'), btn = document.querySelector('.cp-mais.on');
      const r = pop.getBoundingClientRect();
      return [!pop.hidden, [...pop.querySelectorAll('button')].map(b => b.textContent).join(','), btn.getAttribute('aria-expanded'),
        document.activeElement === pop.querySelector('button'), r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight].join('|'); });
    eq(tag + 'menu com rótulos completos, foco no 1º, dentro da tela', m, 'true|✓ Pagar,✎ Editar,✕ Excluir|true|true|true');
    // teclado: seta e Esc
    await p.keyboard.press('ArrowDown');
    const k = await p.evaluate(() => document.activeElement.textContent);
    await p.keyboard.press('Escape');
    const esc = await p.evaluate(() => [document.getElementById('cp-acoes-pop').hidden, document.activeElement.classList.contains('cp-mais')].join('|'));
    eq(tag + 'setas e Esc', k + '|' + esc, '✎ Editar|true|true');
    // clicar de novo no ⋯ fecha; clique fora fecha
    await p.locator(linha('Luz') + ' .cp-mais').click();
    await p.locator(linha('Luz') + ' .cp-mais').click();
    const alterna = await p.evaluate(() => document.getElementById('cp-acoes-pop').hidden);
    await p.locator(linha('Luz') + ' .cp-mais').click();
    await p.mouse.click(5, vp.height - 5);
    const fora = await p.evaluate(() => document.getElementById('cp-acoes-pop').hidden);
    eq(tag + 'alterna e fecha ao clicar fora', alterna + '|' + fora, 'true|true');
    // executa: Pagar abre o modal de pagamento e o menu some
    await p.locator(linha('Luz') + ' .cp-mais').click();
    await p.locator('#cp-acoes-pop button:has-text("Pagar")').click();
    const pagar = await p.evaluate(() => [getComputedStyle(document.getElementById('m-pagar')).display !== 'none', document.getElementById('cp-acoes-pop').hidden].join('|'));
    eq(tag + 'Pagar abre o pagamento', pagar, 'true|true');
    await p.evaluate(() => closeM('m-pagar'));
    // fatura e dívida têm as ações delas
    const ops = async t => { await p.locator(linha(t) + ' .cp-mais').first().click(); const v = await p.evaluate(() => [...document.querySelectorAll('#cp-acoes-pop button')].map(b => b.textContent).join(',')); await p.keyboard.press('Escape'); return v; };
    eq(tag + 'fatura', await ops('Fatura Nubank · Out/26'), '✓ Pagar fatura,💳 Ver fatura no cartão');
    eq(tag + 'parcela de dívida', await ops('parcela 3/6'), '✓ Pagar parcela,📉 Ver dívida');
    eq(tag + 'conta no cartão', await ops('Netflix'), '💳 Ver fatura do cartão,✎ Editar,✕ Excluir');
    eq(tag + 'conta paga', await ops('Internet'), '↩ Desfazer pagamento,✎ Editar,✕ Excluir');
    eq(tag + 'dívida estimada', await ops('Renner'), '📉 Ver dívida');
    // excluir pede confirmação (cancelada) e nada some
    await p.locator(linha('Luz') + ' .cp-mais').click();
    await p.locator('#cp-acoes-pop button:has-text("Excluir")').click();
    eq(tag + 'excluir confirma antes', await p.evaluate(() => !!gs().contas.find(c => c.id === 'luz')), true);
    await p.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.style.display = 'none'); });
    // menu perto do fim da tela abre para cima
    const cima = await p.evaluate(() => { const ls = [...document.querySelectorAll('#cp-tbody .cp-mais')]; const b = ls[ls.length - 1];
      b.scrollIntoView({ block:'end' }); cpAcoes(b); const pop = document.getElementById('cp-acoes-pop').getBoundingClientRect();
      const ok = pop.bottom <= innerHeight && pop.top >= 0; cpFecharAcoes(); return ok; });
    eq(tag + 'no rodapé da tela o menu não sai da tela', cima, true);
    eq(tag + 'sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth), vp.width);
    await ctx.close();
  }
  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar(); process.exit(ok===T.length?0:1);
})();
