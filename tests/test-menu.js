const { chromium } = require('./_pw.js');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = { cfg:{sal:5000,si:0,ano:2026,pct:20}, formas:['PIX'], kanban:[], divs:[], orcs:[], lancs:[], ccs:[], bancos:[],
  contas:[{id:'c1',desc:'Luz',valor:120,venc:'2026-01-05',cat:'Moradia',status:'Pendente',dataPg:'',ts:1}],
  _seeded:true,_bancosSeeded:true,_lancsSeeded:true,_caixaRelinked:true,_orcAnoMigrado:true };
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});

async function abrir(b, vp, pref){
  const ctx = await b.newContext({ viewport:vp });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data,pref})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1');
    localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'Ana',perfil:'admin',email:'a@b.c'}));
    if(pref) localStorage.setItem('fpro_menu', pref); else localStorage.removeItem('fpro_menu');
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA,pref});
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.goto(FILE, { waitUntil:'load' }); await p.waitForTimeout(350);
  return { ctx, p };
}
const estado = p => p.evaluate(() => {
  const w = s => Math.round(document.querySelector(s).getBoundingClientRect().width);
  return [document.body.classList.contains('menu-recolhido'), w('#sidebar'), Math.round(parseFloat(getComputedStyle(document.querySelector('.main')).marginLeft))].join('|');
});

(async () => {
  const b = await chromium.launch();
  const errs = [];

  // ── padrão sem escolha salva: depende da largura ──
  let { ctx, p } = await abrir(b, { width:1366, height:768 });
  eq('1366px sem escolha: aberto', await estado(p), 'false|240|240');
  errs.push(...p._errs); await ctx.close();
  ({ ctx, p } = await abrir(b, { width:1024, height:768 }));
  eq('1024px sem escolha: recolhido', await estado(p), 'true|68|68');
  errs.push(...p._errs); await ctx.close();
  ({ ctx, p } = await abrir(b, { width:1024, height:768 }, 'aberto'));
  eq('escolha salva vale mais que a largura', await estado(p), 'false|240|240');
  errs.push(...p._errs); await ctx.close();

  // ── alternar, salvar, acessibilidade, dicas ──
  ({ ctx, p } = await abrir(b, { width:1366, height:768 }));
  const r = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const btn = $('sb-recolher');
    const contas = document.querySelector('.nav-btn[onclick*="\'contas\'"]');
    o.inicio = btn.getAttribute('aria-expanded') + '|' + btn.title + '|' + vis(contas.querySelector('.nav-txt'));
    // sem recolher, não há dica
    contas.dispatchEvent(new MouseEvent('mouseenter'));
    o.semDica = !vis($('menu-dica'));
    btn.click();
    o.recolheu = document.body.classList.contains('menu-recolhido') + '|' + localStorage.getItem('fpro_menu') + '|' + btn.getAttribute('aria-expanded') + '|' + btn.title;
    o.textoSome = !vis(contas.querySelector('.nav-txt')) + '|' + vis(contas.querySelector('svg'));
    o.secoesViramLinha = getComputedStyle(document.querySelector('.nav-section')).fontSize;
    o.saldoSome = !vis($('sb-saldo'));
    updSbSaldo();
    contas.dispatchEvent(new MouseEvent('mouseenter'));
    o.dica = vis($('menu-dica')) + '|' + $('menu-dica').textContent;
    const rc = contas.getBoundingClientRect(), rd = $('menu-dica').getBoundingClientRect();
    o.dicaAoLado = (rd.left >= rc.right) + '|' + (Math.abs((rd.top + rd.height/2) - (rc.top + rc.height/2)) <= 2);
    contas.dispatchEvent(new MouseEvent('mouseleave'));
    o.dicaSome = !vis($('menu-dica'));
    $('sb-user-info').dispatchEvent(new MouseEvent('mouseenter'));
    o.dicaAvatar = $('menu-dica').textContent.includes('Saldo R$');
    $('sb-user-info').dispatchEvent(new MouseEvent('mouseleave'));
    // teclado: Tab chega nos itens e Enter navega
    const orc = document.querySelector('.nav-btn[onclick*="\'orc\'"]');
    o.foco = orc.tabIndex + '|' + orc.getAttribute('role') + '|' + orc.getAttribute('aria-label');
    orc.focus();
    o.dicaFoco = $('menu-dica').textContent;
    orc.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
    o.enterNavega = _page + '|' + orc.classList.contains('active');
    // Sair dentro do menu; o botão solto não aparece mais
    const sair = document.querySelector('#sidebar .sb-sair');
    o.sair = !!sair + '|' + vis(sair) + '|' + !vis($('logout-btn'));
    // expandir de novo
    btn.click();
    o.expandiu = document.body.classList.contains('menu-recolhido') + '|' + localStorage.getItem('fpro_menu') + '|' + vis(contas.querySelector('.nav-txt'));
    o.labels = [...document.querySelectorAll('#sidebar .nav-btn')].map(b => b.dataset.label).join(',');
    return o;
  });
  eq('início: aberto e com nomes', r.inicio, 'true|Recolher menu|true');
  eq('aberto: sem dica', r.semDica, true);
  eq('recolher: classe, salva e aria', r.recolheu, 'true|recolhido|false|Expandir menu');
  eq('recolhido: só ícones', r.textoSome, 'true|true');
  eq('recolhido: seções viram linha', r.secoesViramLinha, '0px');
  eq('recolhido: saldo sai do rodapé', r.saldoSome, true);
  eq('dica com nome e contador', r.dica, 'true|Contas a Pagar · 1');
  eq('dica ao lado do ícone, centralizada', r.dicaAoLado, 'true|true');
  eq('dica some ao sair', r.dicaSome, true);
  eq('avatar mostra o saldo na dica', r.dicaAvatar, true);
  eq('itens acessíveis pelo teclado', r.foco, '0|button|Orçamento');
  eq('dica no foco do teclado', r.dicaFoco, 'Orçamento');
  eq('Enter navega', r.enterNavega, 'orc|true');
  eq('Sair dentro do menu', r.sair, 'true|true|true');
  eq('expandir: salva e mostra nomes', r.expandiu, 'false|aberto|true');
  eq('nomes de todos os itens', r.labels, 'Dashboard,Relatórios,Lançamentos,Orçamento,Contas a Pagar,Dívidas,Cartões de Crédito,Contas Bancárias,Kanban,Configurações,Sair');
  // largura ganha
  await p.evaluate(() => alternarMenu()); await p.waitForTimeout(300);
  eq('recolhido: conteúdo ganha 172px', await estado(p), 'true|68|68');
  errs.push(...p._errs); await ctx.close();

  // ── celular: gaveta normal mesmo com a escolha "recolhido" ──
  ({ ctx, p } = await abrir(b, { width:390, height:844 }, 'recolhido'));
  const m = await p.evaluate(() => {
    const vis = el => el && getComputedStyle(el).display !== 'none';
    openDrawer();
    const sb = document.getElementById('sidebar');
    return [vis(document.getElementById('sb-recolher')), Math.round(sb.getBoundingClientRect().width),
      vis(document.querySelector('.nav-btn .nav-txt')), Math.round(parseFloat(getComputedStyle(document.querySelector('.main')).marginLeft)),
      vis(document.querySelector('#sidebar .sb-sair'))].join('|');
  });
  eq('celular: sem botão, gaveta com nomes, Sair no menu', m, 'false|240|true|0|true');
  errs.push(...p._errs); await ctx.close();

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close();
  process.exit(ok===T.length?0:1);
})();
