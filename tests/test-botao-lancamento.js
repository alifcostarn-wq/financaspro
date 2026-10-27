// Botão flutuante "Novo lançamento" em todas as telas, no canto inferior direito — hoje = 2026-10-27
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-cartao.js');
const PAGINAS = ['dash', 'rel', 'lanc', 'orc', 'contas', 'dividas', 'cartoes', 'bancos', 'kanban', 'cfg'];
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const novaPagina = async (opts) => {
    const ctx = await b.newContext(opts);
    await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
    await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
      localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
      localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
    const p = await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
    await p.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
    await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
    return p;
  };
  // posição de cada tela: distância das bordas, tamanho e se está por cima do que há embaixo
  const posicoes = (p) => p.evaluate(PAGINAS => PAGINAS.map(pg => {
    go(pg, document.querySelector(`.nav-btn[onclick*="'${pg}'"]`));
    const f = document.getElementById('fab-lanc'), r = f.getBoundingClientRect(), de = document.documentElement;
    const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return `${pg}:${Math.round(de.clientWidth - r.right)},${Math.round(de.clientHeight - r.bottom)},${Math.round(r.width)}x${Math.round(r.height)},${f.contains(topo)}`;
  }).join(' '), PAGINAS);
  // no fim de cada tela, o último conteúdo fica acima do botão
  const cobertas = (p) => p.evaluate(PAGINAS => PAGINAS.filter(pg => {
    go(pg, document.querySelector(`.nav-btn[onclick*="'${pg}'"]`));
    window.scrollTo(0, document.documentElement.scrollHeight);
    const vis = [...document.querySelectorAll('.page.active > *')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0);
    const ult = vis[vis.length - 1], fab = document.getElementById('fab-lanc').getBoundingClientRect();
    return ult && ult.getBoundingClientRect().bottom > fab.top;
  }).join(','), PAGINAS);
  const form = (p) => p.evaluate(() => { const $ = i => document.getElementById(i);
    return [getComputedStyle($('m-lanc')).display, $('m-lanc-titulo').textContent, $('l-edit-id').value, $('l-tipo').value, $('l-desc').value, $('l-valor').value, $('l-data').value].join('|'); });

  // ── computador ──
  const p = await novaPagina({ viewport:{ width:1366, height:900 } });
  eq('computador: em todas as telas, no canto inferior direito', await posicoes(p), PAGINAS.map(pg => `${pg}:28,28,56x56,true`).join(' '));
  eq('computador: o fim de cada tela não fica embaixo do botão', await cobertas(p), '');
  eq('nome escondido até passar o mouse', await p.evaluate(() => getComputedStyle(document.querySelector('#fab-lanc .fab-txt')).opacity), '0');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.hover('#fab-lanc'); await p.waitForTimeout(350);
  eq('passar o mouse mostra "Novo lançamento"', await p.evaluate(() => { const f = document.getElementById('fab-lanc'), t = f.querySelector('.fab-txt');
    return [getComputedStyle(t).opacity, t.textContent, f.getBoundingClientRect().width > 150, Math.round(document.documentElement.clientWidth - f.getBoundingClientRect().right)].join('|'); }), '1|Novo lançamento|true|28');
  await p.mouse.move(400, 300); await p.waitForTimeout(350);
  eq('tirando o mouse, volta a ser só o +', await p.evaluate(() => Math.round(document.getElementById('fab-lanc').getBoundingClientRect().width)), 56);

  // abre o Novo Lançamento limpo, em qualquer tela
  await p.evaluate(() => go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]')));
  await p.click('#fab-lanc');
  eq('clique abre o Novo Lançamento', await form(p), 'flex|Novo Lançamento||Despesa|||2026-10-27');
  eq('com o modal aberto, o botão fica atrás dele', await p.evaluate(() => { const f = document.getElementById('fab-lanc'), r = f.getBoundingClientRect();
    return !f.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), true);
  await p.evaluate(() => { const $ = i => document.getElementById(i);
    $('l-tipo').value = 'Receita'; updLancCats(); $('l-desc').value = 'Salário'; $('l-valor').value = '5000'; $('l-caixa').value = 'bk'; saveLanc(); });
  eq('salvou o lançamento', await p.evaluate(() => gs().lancs.map(l => `${l.tipo}:${l.desc}:${l.valor}`).join(',') + '|' + getComputedStyle(document.getElementById('m-lanc')).display), 'Receita:Salário:5000|none');
  await p.click('#fab-lanc');
  eq('de novo: abre limpo (não repete o último)', await form(p), 'flex|Novo Lançamento||Despesa|||2026-10-27');
  await p.evaluate(() => closeM('m-lanc'));
  // editar um lançamento, cancelar e usar o botão: é um novo, não a edição
  await p.evaluate(() => { const id = gs().lancs[0].id; openLancOps(id); editLanc(); });
  await p.waitForTimeout(250);
  eq('edição carregada', await form(p), 'flex|Editar Lançamento|' + (await p.evaluate(() => gs().lancs[0].id)) + '|Receita|Salário|5000|2026-10-27');
  await p.evaluate(() => closeM('m-lanc'));
  await p.click('#fab-lanc');
  eq('depois de cancelar a edição: abre um novo, limpo', await form(p), 'flex|Novo Lançamento||Despesa|||2026-10-27');
  await p.evaluate(() => { const $ = i => document.getElementById(i);
    $('l-desc').value = 'Mercado'; $('l-valor').value = '80'; $('l-caixa').value = 'bk'; saveLanc(); });
  eq('salvar cria outro e não mexe no editado', await p.evaluate(() => gs().lancs.map(l => `${l.tipo}:${l.desc}:${l.valor}`).sort().join(',')), 'Despesa:Mercado:80,Receita:Salário:5000');

  // ── efeito ao clicar e ao abrir ──
  const animModal = () => { const a = document.querySelector('#m-lanc .modal').getAnimations().find(x => x.effect.getKeyframes()[0].transform);
    return a ? a.effect.getKeyframes()[0].transform : ''; };
  await p.evaluate(() => go('lanc', document.querySelector('.nav-btn[onclick*="\'lanc\'"]')));
  await p.waitForTimeout(750);   // sem onda de cliques anteriores
  await p.click('#fab-lanc');
  eq('clique: onda de luz, o + gira e o botão some', await p.evaluate(() => { const f = document.getElementById('fab-lanc');
    return [f.querySelectorAll('.fab-onda').length, f.querySelector('svg').getAnimations().length, f.classList.contains('fab-aberto')].join('|'); }), '1|1|true');
  eq('o modal cresce a partir do botão (canto inferior direito, começando do tamanho dele)', await p.evaluate(animModal => {
    const t = eval(animModal)(), m = /translate\((-?\d+)px, (-?\d+)px\) scale\(([\d.]+)\)/.exec(t) || [];
    return [+m[1] > 300, +m[2] > 200, +m[3] > 0 && +m[3] < .15].join('|'); }, animModal.toString()), 'true|true|true');
  eq('os campos entram em cascata', await p.evaluate(() => [...document.querySelectorAll('#m-lanc .modal-bd > .form-grid')]
    .map(e => e.getAnimations()[0]?.effect.getTiming().delay).join(',')), '150,190,230,270,310');
  await p.mouse.move(400, 300); await p.waitForTimeout(800);
  eq('no fim: modal no centro, nada animando, onda removida', await p.evaluate(() => { const ov = document.getElementById('m-lanc'), r = ov.querySelector('.modal').getBoundingClientRect();
    return [Math.abs(r.left + r.width / 2 - document.documentElement.clientWidth / 2) <= 1, ov.getAnimations({ subtree:true }).length, document.querySelectorAll('.fab-onda').length].join('|'); }), 'true|0|0');
  await p.evaluate(() => closeM('m-lanc'));
  const voltando = await p.evaluate(() => document.getElementById('fab-lanc').classList.contains('fab-aberto'));
  await p.waitForTimeout(450);
  eq('fechou: o botão volta', voltando + '|' + await p.evaluate(() => { const f = document.getElementById('fab-lanc'); return getComputedStyle(f).opacity + '|' + Math.round(f.getBoundingClientRect().width); }), 'false|1|56');
  // pelos outros botões de lançamento, o modal cresce a partir deles
  await p.click('#page-lanc .topbar-right .btn-green');
  eq('pelo "+ Novo Lançamento" do topo: cresce a partir dele (em cima, à direita)', await p.evaluate(animModal => {
    const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(eval(animModal)()) || []; return [+m[1] > 300, +m[2] < -200].join('|'); }, animModal.toString()), 'true|true');
  await p.evaluate(() => closeM('m-lanc'));
  eq('aberto sem botão: sobe do centro', await p.evaluate(animModal => { openM('m-lanc'); const t = eval(animModal)(); closeM('m-lanc'); return t.startsWith('translateY(16px)'); }, animModal.toString()), true);
  // clique duplo (rápido ou lento) não abre e fecha na hora; clicar fora depois continua fechando
  const fabPos = await p.evaluate(() => { const r = document.getElementById('fab-lanc').getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2 }; });
  await p.mouse.move(fabPos.x, fabPos.y); await p.waitForTimeout(400);
  await p.mouse.dblclick(fabPos.x, fabPos.y); await p.waitForTimeout(100);
  const dbl1 = await p.evaluate(() => getComputedStyle(document.getElementById('m-lanc')).display);
  await p.evaluate(() => closeM('m-lanc')); await p.mouse.move(400, 300); await p.waitForTimeout(500);
  await p.mouse.click(fabPos.x, fabPos.y); await p.waitForTimeout(220); await p.mouse.click(fabPos.x, fabPos.y); await p.waitForTimeout(100);
  const dbl2 = await p.evaluate(() => getComputedStyle(document.getElementById('m-lanc')).display);
  await p.waitForTimeout(400); await p.mouse.click(fabPos.x, fabPos.y); await p.waitForTimeout(100);
  eq('clique duplo não fecha o modal na hora; clicar fora depois fecha', [dbl1, dbl2, await p.evaluate(() => getComputedStyle(document.getElementById('m-lanc')).display)].join('|'), 'flex|flex|none');
  await p.mouse.move(400, 300); await p.waitForTimeout(450);
  // a calculadora aberta no meio do efeito fica no mesmo lugar de quando ele acaba
  const calcNoMeio = await p.evaluate(() => { openM('m-lanc', document.getElementById('fab-lanc')); abrirCalc('l-valor');
    const c = document.getElementById('calc-pop'); return [document.querySelector('#m-lanc .modal').getAnimations().length, c.style.left, c.style.top].join('|'); });
  await p.waitForTimeout(700);
  eq('calculadora aberta durante o efeito: no lugar certo', calcNoMeio, await p.evaluate(() => { posicionarCalc(); const c = document.getElementById('calc-pop');
    const r = ['0', c.style.left, c.style.top].join('|'); fecharCalc(); closeM('m-lanc'); return r; }));
  await p.waitForTimeout(400);

  // teclado: com a tela recém-aberta, o 1º Tab já chega ao botão (mostra o nome) e Enter abre
  await p.reload({ waitUntil:'load' }); await p.waitForTimeout(400);
  await p.mouse.move(400, 300);
  let foco = '', tabs = 0;
  while(tabs < 15 && foco !== 'fab-lanc'){ await p.keyboard.press('Tab'); tabs++; foco = await p.evaluate(() => document.activeElement && document.activeElement.id); }
  await p.waitForTimeout(350);
  eq('teclado: o 1º Tab chega ao botão e mostra o nome', `${foco}|${tabs}|` + await p.evaluate(() => getComputedStyle(document.querySelector('#fab-lanc .fab-txt')).opacity), 'fab-lanc|1|1');
  await p.keyboard.press('Enter');
  eq('teclado: Enter abre o Novo Lançamento', (await form(p)).split('|').slice(0, 2).join('|'), 'flex|Novo Lançamento');
  eq('teclado: a onda sai do centro do botão', await p.evaluate(() => { const f = document.getElementById('fab-lanc'), o = f.querySelector('.fab-onda'), r = f.getBoundingClientRect(), d = parseFloat(o.style.width);
    return [Math.abs(parseFloat(o.style.left) + d / 2 - r.width / 2) <= 1, Math.abs(parseFloat(o.style.top) + d / 2 - r.height / 2) <= 1].join('|'); }), 'true|true');
  await p.evaluate(() => closeM('m-lanc'));

  // impressão: o botão não sai no papel
  await p.emulateMedia({ media:'print' });
  eq('não aparece na impressão', await p.evaluate(() => getComputedStyle(document.getElementById('fab-lanc')).display), 'none');
  await p.emulateMedia({ media:'screen' });
  // tema claro: mesmo lugar
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); if(!document.body.classList.contains('theme-light')) toggleTheme(); });
  await p.waitForTimeout(350);
  eq('tema claro: mesmo lugar e tamanho', (await posicoes(p)).split(' ').filter(x => x.startsWith('lanc:')).join(''), 'lanc:28,28,56x56,true');

  // ── celular (toque) ──
  const m = await novaPagina({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  eq('celular: em todas as telas, no canto inferior direito', await m.evaluate(PAGINAS => PAGINAS.map(pg => {
    go(pg, document.querySelector(`.nav-btn[onclick*="'${pg}'"]`));
    const f = document.getElementById('fab-lanc').getBoundingClientRect(), nav = document.querySelector('.bottom-nav').getBoundingClientRect();
    return `${pg}:${Math.round(document.documentElement.clientWidth - f.right)},${Math.round(f.width)}x${Math.round(f.height)},${nav.top - f.bottom >= 8}`;
  }).join(' '), PAGINAS), PAGINAS.map(pg => `${pg}:18,52x52,true`).join(' '));
  eq('celular: o fim de cada tela não fica embaixo do botão', await cobertas(m), '');
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.tap('#fab-lanc');
  eq('celular: toque abre o Novo Lançamento', await form(m), 'flex|Novo Lançamento||Despesa|||2026-10-27');
  await m.evaluate(() => closeM('m-lanc')); await m.waitForTimeout(350);
  eq('celular: depois do toque o botão continua só com o +', await m.evaluate(() => Math.round(document.getElementById('fab-lanc').getBoundingClientRect().width)), 52);
  eq('celular: sem rolagem lateral', await m.evaluate(() => document.documentElement.scrollWidth), 390);

  // "reduzir movimento" ligado no aparelho: sem onda e sem crescer, o modal só aparece
  const rm = await novaPagina({ viewport:{ width:1366, height:900 }, reducedMotion:'reduce' });
  await rm.click('#fab-lanc');
  eq('"reduzir movimento": sem onda nem crescimento', await rm.evaluate(() => [document.querySelectorAll('.fab-onda').length,
    document.querySelector('#m-lanc .modal').getAnimations().length, document.getElementById('m-lanc').getAnimations().length,
    getComputedStyle(document.getElementById('m-lanc')).display].join('|')), '0|0|1|flex');

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
