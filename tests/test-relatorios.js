// Central de Relatórios (hoje = 2026-10-15)
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};Chart.defaults={};`;
const DATA = require('./dados-rel.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});

(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:1440, height:1000 }, acceptDownloads:true });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
  await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);

  const r = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    go('rel', document.querySelector('.nav-btn[onclick*="\'rel\'"]'));
    tglRel('central', document.querySelector('#page-rel .tgl-central'));
    o.aba = vis('rel-central') + '|' + !vis('rel-anual') + '|' + document.querySelector('#page-rel .tgl-central').classList.contains('active');
    o.catalogo = RELATORIOS.length + '|' + document.querySelectorAll('#cr-menu .cr-menu-it').length + '|' + $('cr-sel').options.length + '|' + new Set(RELATORIOS.map(r => r.id)).size;
    o.padrao = _cr.rel + '|' + $('cr-periodo').value + '|' + $('cr-comparar').value;
    // períodos
    const per = c => { _cr.periodo = c; const p = periodoCR(); return `${c}:${rotuloAbs(p.ini,true)}-${rotuloAbs(p.fim,true)}(${p.n})`; };
    _cr.de = '2024-03'; _cr.ate = '2025-08';
    o.periodos = ['mes','mesant','tri','u3','u6','u12','ano','anoant','pers'].map(per).join(' ');
    _cr.periodo = 'u12';
    const p = periodoCR();
    _cr.comparar = 'ano'; const ca = comparacaoCR(p); _cr.comparar = 'anterior'; const cp = comparacaoCR(p); _cr.comparar = 'nenhum'; const cn = comparacaoCR(p); _cr.comparar = 'anterior';
    o.comparacoes = `${rotuloAbs(ca.ini,true)}-${rotuloAbs(ca.fim,true)} ${rotuloAbs(cp.ini,true)}-${rotuloAbs(cp.fim,true)} ${cn}`;
    // executivo bate com a soma independente dos lançamentos pagos
    const soma = (tipo, ini, fim) => +gs().lancs.filter(l => l.tipo === tipo && l.pago === 'Pago' && l.data >= ini && l.data <= fim).reduce((a, l) => a + l.valor, 0).toFixed(2);
    const R = soma('Receita', '2025-11-01', '2026-10-31'), D = soma('Despesa', '2025-11-01', '2026-10-31'), I = soma('Investimento', '2025-11-01', '2026-10-31');
    crAbrir('executivo');
    const kv = () => [...document.querySelectorAll('#cr-rel .cr-kpi')].map(k => k.querySelector('.cr-kpi-v').textContent);
    const k = kv();
    o.exec = (k[0] === fmtR(R)) + '|' + (k[1] === fmtR(D)) + '|' + (k[2] === fmtR(R - D - I)) + '|' + k.length;
    o.execPoup = document.querySelectorAll('#cr-rel .cr-kpi')[3].textContent.includes('p.p.');
    // Previsto inclui o que ainda não foi pago
    setRelView('previsto');
    o.previsto = kv()[1] === fmtR(+gs().lancs.filter(l => l.tipo === 'Despesa' && l.data >= '2025-11-01' && l.data <= '2026-10-31').reduce((a, l) => a + l.valor, 0).toFixed(2)) && kv()[1] !== fmtR(D);
    setRelView('realizado');
    // formatos mudam o gráfico
    const ch = () => CH['ch-cr-main'] && CH['ch-cr-main'].config;
    crAbrir('recdesp');
    o.fmtBarras = ch().data.datasets.map(d => d.type).join(',');
    crSet('fmt', 'linhas'); o.fmtLinhas = ch().data.datasets.every(d => d.type === 'line') + '|' + document.querySelector('#cr-rel .cr-fmts .tgl.active').dataset.fmt;
    crSet('fmt', 'area'); o.fmtArea = ch().data.datasets[0].fill;
    o.umEixo = Object.keys(ch().options.scales).join(',');
    crAbrir('composicao'); o.rosca = ch().type;
    crSet('fmt', 'barh'); o.barh = ch().options.indexAxis;
    crAbrir('cartoes'); o.empilhado = ch().options.scales.y.stacked + '|' + ch().data.datasets.length;
    o.fmtLembra = (crAbrir('composicao'), ch().options.indexAxis);
    // comparação de períodos
    crAbrir('periodos');
    const linhas = () => [...document.querySelectorAll('#cr-rel .cr-tabela tbody tr')];
    o.periodosTab = linhas().length > 3 && linhas().every(tr => tr.cells.length === 5);
    o.periodosTotal = document.querySelector('#cr-rel .cr-tabela tfoot').textContent.includes(fmtR(D));
    crSet('tipo', 'Receita');
    o.tipoReceita = document.querySelector('#cr-rel .cr-tabela tfoot').textContent.includes(fmtR(R)) + '|' + $('cr-rel').querySelector('.cr-sel-mini').value;
    crSet('tipo', 'Despesa');
    // ano a ano: meses futuros em branco
    crAbrir('anoano');
    const nov = linhas()[10];
    o.anoFuturo = nov.cells[0].textContent + '|' + nov.cells[3].textContent + '|' + ch().data.datasets[2].data[10];
    o.anoSeries = ch().data.datasets.map(d => d.label).join(',');
    // projeção = motor de Contas a Pagar
    crAbrir('projecao');
    o.projecao = ch().data.datasets.reduce((a, d) => a + d.data[0], 0).toFixed(2) === projecaoPagar().meses[0].total.toFixed(2);
    // vencimentos: faixas somam o total em aberto
    crAbrir('aging');
    const ab = pagaveis().filter(i => i.soma && i.aberto).reduce((a, i) => a + i.valor, 0);
    o.aging = (Math.abs(ch().data.datasets[0].data.reduce((a, v) => a + v, 0) - ab) < 0.01) + '|' + ch().data.labels.length;
    // dívidas: saldo cai até zero
    crAbrir('dividas');
    const ult = ch().data.datasets.map(d => d.data[d.data.length - 1]);
    o.dividas = ult.every(v => v === 0) + '|' + kv()[0];
    // pareto: classe A soma ≥ 80% com o menor número de categorias
    crAbrir('pareto');
    const cl = linhas().map(tr => tr.cells[5].textContent);
    o.pareto = cl.join('');
    // orçado × realizado
    crAbrir('orcado');
    o.orcado = linhas().some(tr => tr.textContent.includes('Alimentação')) + '|' + ch().data.datasets.map(d => d.label).join('+');
    // compras do cartão por categoria
    crAbrir('formas'); const semCartao = ch().data.labels.join(',');
    crSet('cartao', true); o.cartao = !semCartao.includes('Cartão · Nubank') + '|' + ch().data.labels.some(l => l.startsWith('Cartão · ')) + '|' + $('cr-cartao').checked;
    crSet('cartao', false);
    // período personalizado
    crSet('periodo', 'pers');
    o.pers = vis('cr-pers') + '|' + $('cr-de').value + '|' + $('cr-ate').value;
    crSet('de', '2025-01'); crSet('ate', '2025-03');
    o.persFaixa = $('cr-faixa').textContent.startsWith('Jan/25 a Mar/25');
    crSet('periodo', 'u12');
    // CSV
    crAbrir('recdesp');
    const csv = crCSV();
    o.csv = csv.charCodeAt(0) === 0xfeff ? 'bom' : 'sem';
    o.csvCab = csv.split('\r\n')[0].slice(1);
    o.csvNum = /;\d+,\d+/.test(csv.split('\r\n')[1]) + '|' + csv.split('\r\n').length;
    // imprimir
    let imprimiu = false; window.print = () => { imprimiu = document.body.classList.contains('cr-imprimindo'); };
    crImprimir(); o.imprimir = imprimiu;
    // painel
    localStorage.removeItem(CR_PAINEL_KEY);
    crSet('vista', 'painel');
    o.painelPadrao = [...document.querySelectorAll('#cr-rel .cr-bloco')].map(b => b.dataset.rel).join(',') + '|' + $('cr-v-painel-n').textContent;
    crAbrir('pareto'); crFixar('pareto');
    o.fixou = JSON.parse(localStorage.getItem(CR_PAINEL_KEY)).join(',') + '|' + $('cr-fixar').textContent;
    crMover('pareto', -1);
    o.moveu = painelAtualCR().join(',');
    crSet('vista', 'painel');
    o.painelGraficos = Object.keys(CH).filter(k => k.startsWith('ch-cr-p-')).length;
    crFixar('executivo');
    o.tirou = painelAtualCR().join(',') + '|' + document.querySelectorAll('#cr-rel .cr-bloco').length;
    document.querySelector('#cr-rel .cr-bloco-tit').click();
    o.abrirDoPainel = _cr.vista + '|' + _cr.rel;
    salvarPainelCR([]); crSet('vista', 'painel');
    o.painelVazio = $('cr-rel').textContent.includes('Seu painel está vazio');
    crSet('vista', 'rel');
    // todas as combinações sem texto quebrado
    const ruins = [];
    for(const rel of RELATORIOS) for(const f of rel.formatos){ _cr.fmt[rel.id] = f; crAbrir(rel.id);
      if(/NaN|undefined|Infinity/.test($('cr-rel').textContent)) ruins.push(rel.id + '/' + f); }
    o.semNaN = ruins.join(',') || 'ok';
    return o;
  });
  eq('aba nova abre a central', r.aba, 'true|true|true');
  eq('15 relatórios no catálogo e no seletor do celular', r.catalogo, '15|15|15|15');
  eq('padrão: painel executivo, 12 meses, período anterior', r.padrao, 'executivo|u12|anterior');
  eq('períodos', r.periodos, 'mes:Out/26-Out/26(1) mesant:Set/26-Set/26(1) tri:Out/26-Dez/26(3) u3:Ago/26-Out/26(3) u6:Mai/26-Out/26(6) u12:Nov/25-Out/26(12) ano:Jan/26-Dez/26(12) anoant:Jan/25-Dez/25(12) pers:Mar/24-Ago/25(18)');
  eq('comparações: ano passado, anterior, nenhuma', r.comparacoes, 'Nov/24-Out/25 Nov/24-Out/25 null');
  eq('executivo bate com os lançamentos', r.exec, 'true|true|true|8');
  eq('poupança comparada em pontos percentuais', r.execPoup, true);
  eq('Previsto inclui o não pago', r.previsto, true);
  eq('colunas com o resultado em linha', r.fmtBarras, 'bar,bar,bar,line');
  eq('formato linhas', r.fmtLinhas, 'true|linhas');
  eq('formato área', r.fmtArea, 'origin');
  eq('um eixo só', r.umEixo, 'x,y');
  eq('formato rosca', r.rosca, 'doughnut');
  eq('formato barras horizontais', r.barh, 'y');
  eq('cartões empilhados', r.empilhado, 'true|1');
  eq('o formato escolhido fica guardado', r.fmtLembra, 'y');
  eq('comparação de períodos: tabela', r.periodosTab, true);
  eq('comparação: total = despesas do período', r.periodosTotal, true);
  eq('troca para receitas', r.tipoReceita, 'true|Receita');
  eq('ano a ano: mês futuro em branco', r.anoFuturo, 'Novembro|—|null');
  eq('ano a ano: uma série por ano', r.anoSeries, '2024,2025,2026');
  eq('projeção = Contas a Pagar', r.projecao, true);
  eq('vencimentos: faixas somam o aberto', r.aging, 'true|8');
  eq('dívidas zeram no fim', r.dividas, 'true|R$ 2.122,09');
  eq('curva ABC', r.pareto, 'AAAABBCC');
  eq('orçado × realizado', r.orcado, 'true|Orçado+Realizado');
  eq('compras do cartão por categoria', r.cartao, 'true|true|true');
  eq('personalizado mostra as datas', r.pers, 'true|2024-03|2025-08');
  eq('personalizado aplica', r.persFaixa, true);
  eq('CSV com BOM (Excel)', r.csv, 'bom');
  eq('CSV: cabeçalho', r.csvCab, 'Mês;Receitas;Despesas;Investimentos;Resultado;Poupança');
  eq('CSV: decimal com vírgula, 12 meses + total', r.csvNum, 'true|14');
  eq('imprimir só o relatório', r.imprimir, true);
  eq('painel sugerido', r.painelPadrao, 'executivo,recdesp,projecao,composicao|4');
  eq('fixar no painel e salvar', r.fixou, 'executivo,recdesp,projecao,composicao,pareto|📌 No painel');
  eq('reordenar', r.moveu, 'executivo,recdesp,projecao,pareto,composicao');
  eq('um gráfico por bloco', r.painelGraficos, 5);
  eq('tirar do painel', r.tirou, 'recdesp,projecao,pareto,composicao|4');
  eq('abrir pelo painel', r.abrirDoPainel, 'rel|recdesp');
  eq('painel vazio explica', r.painelVazio, true);
  eq('todos os relatórios e formatos sem NaN', r.semNaN, 'ok');

  // celular
  await p.setViewportSize({ width:390, height:844 });
  const m = await p.evaluate(() => { renderCentral();
    const v = id => getComputedStyle(document.getElementById(id)).display;
    return [document.documentElement.scrollWidth, v('cr-menu'), v('cr-sel')].join('|'); });
  eq('celular: seletor no lugar do menu, sem rolagem lateral', m, '390|none|block');
  eq('sem erros de JS', errs.join(' ; '), '');

  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
