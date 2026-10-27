// Dashboard enxuto: o mês em 4 números, "Precisa de atenção", categorias, próximos pagamentos,
// últimos lançamentos, patrimônio e saúde — hoje = 2026-10-15
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-rel.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const novaPagina = async (opts) => {
    const ctx = await b.newContext(opts);
    await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
    await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
      localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'Alif Costa',perfil:'admin',email:'a@b.c'}));
      localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
    const p = await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
    await p.clock.setFixedTime(new Date('2026-10-15T15:00:00'));
    await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
    await p.evaluate(() => irPagina('dash'));
    return p;
  };
  const txt = (p, sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), sel);

  // ── computador ──
  const p = await novaPagina({ viewport:{ width:1440, height:900 } });
  eq('cabeçalho: saudação e data, sem o banner antigo', await p.evaluate(() => [document.getElementById('dash-welcome-text').textContent.trim(), document.getElementById('dash-welcome-date').textContent,
    !!document.querySelector('#page-dash > #dash-welcome')].join('|')), '🌤️ Boa tarde, Alif!|Quinta-feira, 15 de outubro de 2026|false');
  eq('blocos antigos saíram (painel de cartões, alertas, agenda, ritmo, rosca)', await p.evaluate(() =>
    ['dash-agora-wrap', 'dash-alertas', 'ag-tbody', 'ag-janela', 'ch-dash-semana', 'ch-dash-cat', 'dk-proj', 'dk-pend'].filter(id => document.getElementById(id)).join(',')), '');
  eq('ordem dos blocos', await txt(p, '#page-dash .dash-card .card-title'),
    'Receitas e despesas em 2026 | Precisa de atenção | Despesas por categoria | Próximos pagamentos | Últimos lançamentos | Patrimônio | Saúde financeira');
  eq('página bem mais curta (antes: 2.843px)', await p.evaluate(() => document.documentElement.scrollHeight < 1500), true);

  // 1. o mês em quatro números, uma linha só embaixo de cada
  eq('quatro números do mês', await txt(p, '.dash-kpis .kpi-val'), 'R$ 8.064,00 | R$ 4.566,40 | R$ 0,00 | R$ 3.497,60');
  eq('variação sobre o mês anterior', await txt(p, '.dash-kpis .dk-nota'), 'igual a set | ▼ 16,9% vs set | ▼ 100% vs set | previsto: R$ 3.160,80');
  eq('cor da variação: despesa caindo é boa, investimento caindo é ruim', await p.evaluate(() =>
    ['dk-des-nota', 'dk-inv-nota'].map(id => document.querySelector('#' + id + ' span').className).join(',')), 'bom,ruim');
  eq('mês anterior no detalhe (ao passar o mouse)', await p.evaluate(() => document.getElementById('dk-des-nota').title), 'Setembro: R$ 5.492,00');

  // 2a. gráfico do ano: cores validadas, mês escolhido em destaque, clique escolhe o mês
  eq('gráfico: receitas e despesas com as cores validadas', await p.evaluate(() => { const c = CH['ch-dash-ano'].config, ds = c.data.datasets;
    const cs = getComputedStyle(document.body);
    return [ds.map(x => x.label).join('/'), ds[0].backgroundColor[9] === cs.getPropertyValue('--viz-rec').trim(), ds[1].backgroundColor[9] === cs.getPropertyValue('--viz-des').trim(),
      ds[0].backgroundColor[8].endsWith('73'), c.data.datasets.length].join('|'); }), 'Receitas/Despesas|true|true|true|2');
  eq('tooltip do gráfico mostra o saldo do mês', await p.evaluate(() => CH['ch-dash-ano'].config.options.plugins.tooltip.callbacks.footer([{ dataIndex:9 }])), 'Saldo: R$ 3.497,60');
  await p.evaluate(() => CH['ch-dash-ano'].config.options.onClick(null, [{ index:8 }]));
  eq('clique num mês do gráfico mostra aquele mês', await p.evaluate(() => document.getElementById('dash-mes').value + '|' + document.getElementById('dk-des').textContent), '8|R$ 5.492,00');
  await p.evaluate(() => { document.getElementById('dash-mes').value = '9'; renderDash(); });

  // 2b. precisa de atenção: uma lista só, por gravidade
  eq('precisa de atenção: uma linha por assunto', await txt(p, '#dash-atencao .dk-at-txt b'),
    '4 pagamentos em atraso | 2 vencem em até 7 dias | Alimentação vai passar do orçamento | Nada investido em outubro');
  eq('precisa de atenção: gravidade, valores e contador', await p.evaluate(() => [[...document.querySelectorAll('#dash-atencao .dk-at')].map(e => e.classList[1]).join(','),
    [...document.querySelectorAll('#dash-atencao .dk-at-val')].map(e => e.textContent).join(','), document.getElementById('dk-at-cont').textContent].join('|')),
    'urgente,atencao,atencao,info|R$ 3.050,00,R$ 600,00|4');
  eq('orçamento: avisa antes de estourar, contando os pendentes', await p.evaluate(() => document.querySelectorAll('#dash-atencao .dk-at-txt small')[2].textContent),
    '103% com os pendentes da meta de R$ 1.300,00');
  await p.click('#dash-atencao .dk-at.urgente');
  eq('clicar no atraso leva a Contas a Pagar', await p.evaluate(() => _page + '|' + document.querySelector('.nav-btn.active').getAttribute('onclick')), "contas|go('contas',this)");
  await p.evaluate(() => irPagina('dash'));

  // 3. categorias, próximos pagamentos e últimos lançamentos
  eq('despesas por categoria: as maiores, com o valor', await p.evaluate(() => [...document.querySelectorAll('#dk-cats .dk-cat-l')].map(e => [...e.children].map(c => c.textContent).join(' ')).join(' | ')),
    'Moradia R$ 2.231,00 | Alimentação R$ 1.064,00 | Educação R$ 650,00 | Transporte R$ 582,40 | Serviços & Financeiro R$ 39,00');
  eq('categoria perto do limite do orçamento', await txt(p, '#dk-cats .dk-cat-orc'), '⚠ perto do limite · 97% | ⚠ perto do limite · 82%');
  eq('próximos pagamentos: os 5 primeiros, atrasados antes', await txt(p, '#dk-prox .dk-px-txt b'),
    'Fatura Nubank — Julho/2026 | Fatura Nubank — Agosto/2026 | Aluguel | Fatura Nubank — Outubro/2026 | Empréstimo Itaú — parcela 3/6');
  eq('próximos pagamentos: situação e total', (await txt(p, '#dk-prox .dk-px-txt small')) + ' # ' + (await txt(p, '#dk-prox .dk-px-tot')),
    '97 dias em atraso | 66 dias em atraso | 10 dias em atraso | 5 dias em atraso | vence hoje # 9 pagamentos até 14/11: R$ 5.955,90 · ✓ o caixa cobre');
  await p.click('#dk-prox .dk-px:first-child .btn');
  await p.waitForTimeout(250);
  eq('pagar a fatura atrasada pelo Dashboard', await p.evaluate(() => _page + '|' + getComputedStyle(document.getElementById('m-pag-fat')).display + '|' + document.getElementById('pf-mes').value), 'cartoes|flex|6');
  await p.evaluate(() => { closeM('m-pag-fat'); irPagina('dash'); });
  eq('últimos lançamentos: os 5 mais recentes', await txt(p, '#dash-ultimos .dk-ul-txt b'), 'Aporte | Roupas | Lazer | Freela | Restaurantes');
  eq('últimos lançamentos: data curta, categoria e sinal', (await txt(p, '#dash-ultimos .dk-ul:first-child small')) + ' ' + (await txt(p, '#dash-ultimos .dk-ul:nth-child(4) .dk-ul-val')), '28/10 · Investimentos +R$ 1.680,00');

  // 4. patrimônio e saúde
  eq('patrimônio: valor e composição numa linha', (await txt(p, '#dk-patrimonio')) + ' # ' + (await txt(p, '#dk-patrimonio-sub')),
    'R$ 91.360,41 # caixa R$ 72,6 mil · investido R$ 20,9 mil · dívidas −R$ 2,1 mil');
  eq('patrimônio: meses que ainda não chegaram ficam sem linha', await p.evaluate(() => CH['ch-dash-patrimonio'].config.data.datasets[0].data.map(v => v === null ? '-' : 'v').join('')), 'vvvvvvvvvv--');
  eq('valor curto com sinal', await p.evaluate(() => [fmtRCurto(72602.5), fmtRCurto(-1234), fmtRCurto(999.9), fmtRCurto(-50)].join(' | ')), 'R$ 72,6 mil | −R$ 1,2 mil | R$ 999,90 | −R$ 50,00');
  eq('saúde: nota e o que mais pesa', await txt(p, '#dk-score, #dk-score-label, #dk-score-pior'), '70 | Bom | O que mais pesa: sem investir');
  eq('saúde: no computador, indicadores já abertos', await p.evaluate(() => document.querySelector('#page-dash .dk-ind').open + '|' + document.querySelectorAll('#dash-saude .dk-ind-i').length), 'true|4');

  // previsto: inclui o que está pendente; a nota do saldo volta a ser a variação
  await p.click('#dash-btn-prev');
  eq('previsto: botões e valores', await p.evaluate(() => [document.getElementById('dash-btn-prev').getAttribute('aria-pressed'), document.getElementById('dash-btn-real').classList.contains('on'),
    document.getElementById('dk-des').textContent, document.getElementById('dk-sal').textContent, document.getElementById('dk-sal-nota').textContent].join('|')),
    'true|false|R$ 5.911,20|R$ 3.160,80|▲ 66,4% vs set');
  eq('previsto: a categoria que passa do orçamento fica vermelha', await txt(p, '#dk-cats .dk-cat-orc.acima'), '▲ passou do orçamento · 103%');
  await p.click('#dash-btn-real');

  // mês sem movimento
  await p.evaluate(() => { document.getElementById('dash-mes').value = '10'; renderDash(); });
  eq('mês sem movimento', [await txt(p, '.dash-kpis .kpi-val'), await txt(p, '#dk-cats')].join(' # '), 'R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 # Nenhuma despesa neste mês.');
  await p.evaluate(() => { document.getElementById('dash-mes').value = '9'; renderDash(); });

  // mais de 4 assuntos: "mostrar mais"
  await p.evaluate(() => { const d = gs(); d.kanban = [{ id:'k1', title:'Revisar seguro do carro', col:'todo', due:'2026-10-01' }]; ss(d); renderDash(); });
  eq('mais de 4: mostra 4 e o botão', await p.evaluate(() => document.querySelectorAll('#dash-atencao .dk-at').length + '|' + document.querySelector('#dash-atencao .dash-mais').textContent), '4|Mostrar mais 1');
  await p.click('#dash-atencao .dash-mais');
  eq('mostrar mais: aparece a tarefa atrasada (a dica fica por último)', (await txt(p, '#dash-atencao .dk-at-txt b')) + ' # ' + (await txt(p, '#dash-atencao .dash-mais')),
    '4 pagamentos em atraso | 2 vencem em até 7 dias | Alimentação vai passar do orçamento | 1 tarefa atrasada | Nada investido em outubro # Mostrar menos');

  // tudo em dia
  await p.evaluate(() => { const d = gs();
    d.contas = []; d.divs = []; d.ccs = []; d.kanban = []; d.orcs = [];
    d.lancs = d.lancs.filter(l => l.data < '2026-10-01').concat([
      { id:'z1', data:'2026-10-05', tipo:'Receita', cat:'Receitas', subcat:'Pro-Labore', desc:'Salário', valor:7000, caixaId:'bk', caixaNome:'Itaú', pago:'Pago', obs:'', ts:1, status:'ativo' },
      { id:'z2', data:'2026-10-06', tipo:'Investimento', cat:'Investimentos', subcat:'', desc:'Tesouro', valor:700, caixaId:'bk', caixaNome:'Itaú', pago:'Pago', obs:'', ts:2, status:'ativo' }]);
    ss(d); renderDash(); });
  eq('tudo em dia', await p.evaluate(() => [document.querySelector('#dash-atencao .dk-ok b').textContent, document.getElementById('dk-at-cont').textContent, document.getElementById('dk-prox').textContent.trim()].join('|')),
    'Tudo em dia||Nada a pagar nos próximos 30 dias. 🎉');

  // ── celular ──
  const m = await novaPagina({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  eq('celular: sem rolagem lateral e "precisa de atenção" antes do gráfico', await m.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect().top;
    return [document.documentElement.scrollWidth, r('.dash-atencao-card') < r('.dash-grafico')].join('|'); }), '390|true');
  eq('celular: o botão "+ Lançamento" do topo dá lugar ao ＋ flutuante; mês legível', await m.evaluate(() =>
    [getComputedStyle(document.querySelector('.dash-novo')).display, document.getElementById('dash-mes').getBoundingClientRect().width > 120].join('|')), 'none|true');
  eq('celular: indicadores da saúde recolhidos', await m.evaluate(() => document.querySelector('#page-dash .dk-ind').open), false);
  eq('celular: cartões numa coluna', await m.evaluate(() => { const c = [...document.querySelectorAll('#page-dash .dash-card')].map(e => e.getBoundingClientRect());
    return c.every(r => Math.round(r.width) === Math.round(c[0].width)); }), true);

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
