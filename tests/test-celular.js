// Celular (390 px): listas em cartões, filtros recolhíveis, extrato em páginas, textos e toques — hoje = 2026-10-15
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-rel.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'Alif',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
  await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
  await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
  const ir = pg => p.evaluate(pg => { goMob(pg); window.scrollTo(0, 0); }, pg);

  // ── nenhuma tela passa da largura ──
  const largos = [];
  for(const pg of ['dash','lanc','orc','contas','dividas','cartoes','bancos','invest','rel','kanban','cfg']){
    await ir(pg); if(await p.evaluate(() => document.documentElement.scrollWidth) > 390) largos.push(pg);
  }
  eq('nenhuma tela passa da largura do celular', largos.join(',') || 'nenhuma', 'nenhuma');

  // ── listas em cartões: o valor, a situação e as ações à vista, sem rolar de lado ──
  const cartao = sel => p.evaluate(sel => {
    const tr = document.querySelector(sel), wrap = tr.closest('.tbl-wrap'), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
    const dentro = e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; };
    return [getComputedStyle(tr.closest('table').querySelector('thead')).display, getComputedStyle(tr).display, wrap.scrollWidth <= wrap.clientWidth + 1,
      [...tr.children].filter(vis).every(dentro)].join('|');
  }, sel);
  await ir('lanc');
  eq('Lançamentos: cartões, sem cabeçalho, tudo dentro da tela', await cartao('#l-tbody tr.l-row'), 'none|grid|true|true');
  eq('Lançamentos: no cartão, descrição, valor, data, categoria, situação e ⋯', await p.evaluate(() => [...document.querySelector('#l-tbody tr.l-row').children]
    .map((td, i) => getComputedStyle(td).display === 'none' ? '' : i + 1).filter(Boolean).join(',')), '1,2,3,4,8,9,11');
  await ir('contas');
  eq('Contas a Pagar: cartões, tudo dentro da tela', await cartao('#cp-tbody tr.cp-clic'), 'none|grid|true|true');
  await p.evaluate(() => { const tr = document.querySelector('#cp-tbody tr.cp-fat-row'); if(tr) tr.querySelector('.cp-ver').click(); });
  eq('Contas a Pagar: as compras da fatura abrem em largura inteira', await p.evaluate(() => getComputedStyle(document.querySelector('#cp-tbody tr.cp-itens-row')).display), 'block');
  await ir('bancos');
  eq('Bancos: extrato em cartões, tudo dentro da tela', await cartao('#bk-extrato-tbody tr.bk-mov'), 'none|grid|true|true');
  eq('Bancos: só o lado com valor (entrada ou saída) aparece', await p.evaluate(() => document.querySelector('#bk-extrato-tbody tr.bk-mov').querySelectorAll('td.bk-val:not(.bk-vazio)').length
    + '|' + getComputedStyle(document.querySelector('#bk-extrato-tbody tr.bk-mov td.bk-vazio')).display), '1|none');
  await ir('cartoes');
  eq('Cartões: faturas do ano em cartões', await cartao('#cc-fat-tbody tr'), 'none|grid|true|true');

  // ── extrato em páginas de 60 ──
  await ir('bancos');
  const nMov = () => p.evaluate(() => document.querySelectorAll('#bk-extrato-tbody tr.bk-mov').length);
  const total = await p.evaluate(() => movimentacoesDaConta(gs().bancos.find(b => b.id === _bkSel), gs()).length);
  eq('extrato: mostra 60 movimentações e o botão das outras', `${await nMov()}|${(await p.textContent('#bk-extrato-tbody .bk-mais')).trim()}`, `60|Mostrar mais 60 · ${total - 60} anteriores ocultas`);
  await p.click('#bk-extrato-tbody .bk-mais button');
  eq('extrato: "mostrar mais" traz mais 60', await nMov(), 120);
  await p.selectOption('#bk-fil-mes', '9');
  eq('extrato: ao filtrar, volta a contar do começo (só o mês)', `${await nMov()}|${await p.evaluate(() => !!document.querySelector('#bk-extrato-tbody .bk-mais'))}`, `${await p.evaluate(() => movimentacoesDaConta(gs().bancos.find(b => b.id === _bkSel), gs()).filter(m => m.data.slice(5, 7) === '10').length)}|false`);   // outubro de todos os anos

  // ── filtros: o essencial à vista, o resto em "Mais filtros" ──
  await ir('lanc');
  const visiveis = () => p.evaluate(() => [...document.querySelectorAll('#page-lanc .fil-mob > *')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className.split(' ')[0]).join(','));
  eq('Lançamentos: à vista só ano, mês, "Mais filtros" e busca', await visiveis(), 'l-fil-ano,l-fil-mes,fil-tgl,l-busca');
  await p.click('#page-lanc .fil-tgl');
  eq('"Mais filtros" abre os outros', (await visiveis()).split(',').length, 8);
  await p.selectOption('#l-fil-tipo', 'Despesa');
  await p.click('#page-lanc .fil-tgl');
  eq('fechado, o botão avisa que há filtro em uso', (await p.textContent('#page-lanc .fil-tgl')).trim(), '⚙ Mais filtros · 1 em uso');
  await ir('contas');
  eq('Contas a Pagar: origem, status e categoria recolhidos', await p.evaluate(() => ['cp-fil-orig','cp-fil-st','cp-fil-cat'].map(i => getComputedStyle(document.getElementById(i)).display).join(',')), 'none,none,none');

  // ── textos, toques e detalhes ──
  await ir('dash');
  eq('rótulos dos números com pelo menos 10,5 px', await p.evaluate(() => getComputedStyle(document.querySelector('.kpi-label')).fontSize), '10.5px');
  eq('saudação alinhada à esquerda', await p.evaluate(() => Math.round(document.getElementById('dash-welcome-text').getBoundingClientRect().left)), 14);
  eq('barra do topo sem o "+" repetido (o botão flutuante faz isso)', await p.evaluate(() => document.querySelectorAll('#mob-topbar .mob-icon-btn').length), 2);
  await ir('lanc');
  eq('botões pequenos com pelo menos 32 px de altura', await p.evaluate(() => Math.round(document.querySelector('#l-tbody .btn-xs').getBoundingClientRect().height) >= 32), true);
  eq('rótulos do eixo dos gráficos sem inclinar', await p.evaluate(() => chartBase.scales.x.ticks.maxRotation), 0);

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
