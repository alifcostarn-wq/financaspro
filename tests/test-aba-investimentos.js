// Aba Investimentos: aplicações com taxa, valor de hoje, juros de cada mês e projeção de lucro — hoje = 2026-10-28
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-aba-invest.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
const perto = (n, g, e, tol = 0.02) => T.push({ n, g:String(g), e:`${e} (±${tol})`, ok:Math.abs(+g - +e) <= tol });

// ── As mesmas contas feitas aqui, sem o código do sistema, para conferir o motor ──
const CDI = 13.65, IPCA = 4.58, TR = 0.17, HOJE = '2026-10-28';
const dias = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const cresce = (v, r, d) => v * Math.pow(1 + r, d / 365);
const rCDI = (pct, cdi = CDI) => Math.pow(1 + (Math.pow(1 + cdi / 100, 1 / 252) - 1) * pct / 100, 252) - 1;
const rIPCA = t => (1 + IPCA / 100) * (1 + t / 100) - 1;
const rPoup = Math.pow(1.005 * (1 + TR / 100), 12) - 1;
const tm = r => Math.pow(1 + r, 1 / 12) - 1;
const c2 = v => Math.round(v * 100) / 100;
const R = v => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
const S = v => (v < 0 ? '−' : '+') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
const E = {};
E.a1 = c2(cresce(10000, rCDI(110), dias('2026-01-10', HOJE)));
E.a2 = c2(cresce(5000, rCDI(90), dias('2026-03-05', '2026-09-05')));        // parou de render no vencimento
E.a3 = c2(cresce(8900, rIPCA(6.2), dias('2026-09-30', HOJE)));             // recomeça do saldo informado
E.a4 = 3150;                                                                 // renda variável: o último saldo informado
const vAgo = cresce(2000, rPoup, dias('2026-07-01', '2026-08-15'));          // poupança: resgate de 510 em 15/08
E.a5 = c2(cresce(vAgo - 510, rPoup, dias('2026-08-15', HOJE)));
E.p5 = c2(2000 * (1 - 510 / vAgo));                                          // o resgate tira do aplicado a mesma proporção
E.V = c2(E.a1 + E.a2 + E.a3 + E.a4 + E.a5 + 1200);
E.P = c2(10000 + 5000 + 8000 + 3000 + E.p5 + 1200);
E.mes = c2(c2(E.a1 * tm(rCDI(110))) + c2(E.a3 * tm(rIPCA(6.2))) + c2(E.a5 * tm(rPoup)));

(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const novaPagina = async (opts, data) => {
    const ctx = await b.newContext(opts);
    await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
    await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
      localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
      localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:data || DATA});
    const p = await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
    await p.clock.setFixedTime(new Date('2026-10-28T12:00:00'));
    await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
    return p;
  };
  const txt = (p, sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), sel);
  const sit = (p, id) => p.evaluate(id => { const s = situacaoAtivo(gs().invAtivos.find(a => a.id === id), gs(), today()); return { V:s.V, P:s.P, ativa:s.ativa, venceu:s.venceu }; }, id);
  const visivel = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && !!e.getClientRects().length; }, id);

  const p = await novaPagina({ viewport:{ width:1400, height:900 } });

  // ── 1. Taxas e imposto ──
  eq('taxa ao ano: 110% do CDI, IPCA + 6,2%, poupança, Selic + 0,1%, prefixado 12%', await p.evaluate(() => { const c = invCfg();
    return [taxaAnualAtivo({ indexador:'cdi', taxa:110 }, c), taxaAnualAtivo({ indexador:'ipca', taxa:6.2 }, c), taxaAnualAtivo({ indexador:'poupanca' }, c),
      taxaAnualAtivo({ indexador:'selic', taxa:0.1 }, c), taxaAnualAtivo({ indexador:'pre', taxa:12 }, c)].map(x => x.toFixed(8)).join('|'); }),
    [rCDI(110), rIPCA(6.2), rPoup, 1.1375 * 1.001 - 1, 0.12].map(x => x.toFixed(8)).join('|'));
  eq('renda variável: sem taxa no valor de hoje, retorno esperado só na projeção', await p.evaluate(() => [taxaAnualAtivo({ indexador:'livre', taxa:12 }, invCfg()), taxaAnualAtivo({ indexador:'livre', taxa:12 }, invCfg(), true)].join('|')), '0|0.12');
  eq('IR regressivo (180, 181, 360, 361, 720, 721 dias)', await p.evaluate(() => [180, 181, 360, 361, 720, 721].map(aliquotaIR).join(',')), '22.5,20,20,17.5,17.5,15');
  eq('IOF nos primeiros 30 dias', await p.evaluate(() => [1, 10, 29, 30, 45].map(aliquotaIOF).join(',')), '96,66,3,0,0');
  eq('taxas de referência padrão', await p.evaluate(() => { const c = invCfg(); return [c.cdi, c.selic, c.ipca, c.tr, c.atualizadoEm].join('|'); }), '13.65|13.75|4.58|0.17|2026-10-28');

  // ── 2. Valor de hoje de cada aplicação ──
  let s = await sit(p, 'a1'); eq('CDB 110% do CDI: rende pela taxa desde a aplicação', `${s.V}|${s.P}`, `${E.a1}|10000`);
  s = await sit(p, 'a2'); eq('LCI vencida: para de render no vencimento e fica marcada', `${s.V}|${s.venceu}`, `${E.a2}|true`);
  s = await sit(p, 'a3'); eq('Tesouro IPCA+: recomeça do saldo informado; aplicado = o que já existia', `${s.V}|${s.P}`, `${E.a3}|8000`);
  s = await sit(p, 'a4'); eq('Ações: o último saldo informado (sem taxa)', `${s.V}|${s.P}`, '3150|3000');
  s = await sit(p, 'a5'); eq('Poupança: o resgate tira o mesmo pedaço do valor e do aplicado', `${s.V}|${s.P}`, `${E.a5}|${E.p5}`);
  eq('sem taxa cadastrada: a previdência antiga, pelo valor aplicado', await p.evaluate(() => gruposSemAtivo(gs(), today()).map(g => `${g.sub}=${g.saldo}`).join(',')), 'Previdência Privada=1200');

  // ── 3. A aba (antes, o Dashboard avisa da aplicação vencida) ──
  await p.evaluate(() => irPagina('dash'));
  eq('Dashboard: "Precisa de atenção" avisa da LCI vencida', await p.evaluate(() => { const b = [...document.querySelectorAll('#dash-atencao .dk-at')].find(x => x.textContent.includes('venceu'));
    return b ? b.querySelector('.dk-at-txt b').textContent + ' # ' + b.querySelector('.dk-at-txt small').textContent : ''; }), '1 aplicação venceu # LCI Caixa — registre o resgate');
  await p.click('#sidebar .nav-btn[onclick*="\'invest\'"]');
  eq('menu: Investimentos abre a aba', await p.evaluate(() => _page + '|' + document.getElementById('page-invest').classList.contains('active')), 'invest|true');
  eq('menu: logo depois de Contas Bancárias', await p.evaluate(() => { const l = [...document.querySelectorAll('#sidebar .nav-btn')].map(b => b.dataset.label); return l[l.indexOf('Contas Bancárias') + 1]; }), 'Investimentos');
  eq('os quatro números', await txt(p, '#ik-valor, #ik-aplic, #ik-rend, #ik-mes'), [R(E.V), R(E.P), S(E.V - E.P), R(E.mes)].join(' | '));
  eq('notas dos números', await txt(p, '#ik-valor-nota, #ik-aplic-nota, #ik-rend-nota'),
    `estimado pelas taxas | em 6 aplicações | +${((E.V - E.P) / E.P * 100).toLocaleString('pt-BR', { maximumFractionDigits:1 })}% sobre o aplicado`);
  eq('aplicações: da maior para a menor, depois as sem taxa e o total', await p.evaluate(() => [...document.querySelectorAll('#inv-lista > .ia-l:not(.cab)')].map(e => e.querySelector('.c-nome b').textContent).join(', ')),
    'CDB Banco Inter, Tesouro IPCA+ 2035, LCI Caixa, Ações (carteira), Poupança, Previdência Privada, Total');
  eq('linha do CDB: taxa, aplicado, valor, rendimento, juros/mês e vencimento', await p.evaluate(() => [...document.querySelector('#inv-lista button.ia-l').children]
    .map(c => [...c.childNodes].map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')).join(' # ')),
    `CDB Banco Inter CDB · Banco Inter # 110% do CDI ≈ ${(rCDI(110) * 100).toLocaleString('pt-BR', { maximumFractionDigits:2 })}% ao ano # R$ 10.000,00 # ${R(E.a1)} estimado # ${S(E.a1 - 10000)} +${((E.a1 - 10000) / 100).toLocaleString('pt-BR', { maximumFractionDigits:1 })}% # ${R(c2(E.a1 * tm(rCDI(110))))} # 10/01/2028 em 1 ano e 2 meses`);
  eq('LCI vencida: sem juros por mês, vencimento em destaque', await p.evaluate(() => { const l = [...document.querySelectorAll('#inv-lista button.ia-l')].find(e => e.textContent.includes('LCI Caixa'));
    return l.querySelector('.c-mes').textContent.trim() + '|' + l.querySelector('.c-venc b').className + '|' + l.querySelector('.c-venc small').textContent; }), '—|alerta|venceu');
  eq('aviso: a LCI venceu', (await txt(p, '#inv-avisos .inv-aviso > span')).startsWith('⏰ LCI Caixa venceu em 05/09/2026.'), true);
  eq('taxas usadas no cálculo', await txt(p, '#inv-taxas-lbl'), 'Estimado com CDI 13,65% · Selic 13,75% · IPCA 4,58% Alterar');
  eq('onde está o dinheiro: por produto', await p.evaluate(() => [...document.querySelectorAll('#inv-comp .dk-cat-l span:first-child')].map(e => e.textContent).join(', ')), 'CDB, Tesouro IPCA+, LCI, Ações, Poupança, Previdência Privada');
  eq('onde está o dinheiro: parte isenta de IR (LCI e poupança)', await txt(p, '#inv-comp .inv-isento'),
    `Isento de IR: ${R(E.a2 + E.a5)} (${((E.a2 + E.a5) / E.V * 100).toLocaleString('pt-BR', { maximumFractionDigits:1 })}%)`);

  // ── 4. Juros de cada mês ──
  const M = await p.evaluate(() => rendimentosMensais(gs(), 2026, today()));
  eq('juros por mês: até hoje rendeu; outubro dividido; depois, a render', M.map(x => (x.rendeu ? 'r' : '-') + (x.previsto ? 'p' : '-')).join(' '), 'r- r- r- r- r- r- r- r- r- rp -p -p');
  // a soma do ano = valor no fim − valor no começo − o que entrou + o que saiu (cada aplicação)
  const fimAno = c2(cresce(10000, rCDI(110), dias('2026-01-10', '2026-12-31'))) + E.a2 + c2(cresce(8900, rIPCA(6.2), dias('2026-09-30', '2026-12-31'))) + 3150
    + c2(cresce(vAgo - 510, rPoup, dias('2026-08-15', '2026-12-31')));
  const iniAno = c2(cresce(8000, rIPCA(6.2), dias('2025-06-01', '2025-12-31')));
  perto('juros do ano batem com a variação do valor', c2(M.reduce((x, m) => x + m.rendeu + m.previsto, 0)), c2(fimAno - iniAno - (10000 + 5000 + 3000 + 2000) + 510), 0.1);
  perto('setembro: acerto pelos saldos informados (Tesouro e ações)', M[8].ajuste, c2(8900 - cresce(8000, rIPCA(6.2), dias('2025-06-01', '2026-09-30')) + 3150 - 3300), 0.02);
  eq('entrou na conta: o lucro do resgate da poupança em agosto', M.map(x => x.recebido).join(','), '0,0,0,0,0,0,0,10,0,0,0,0');
  eq('gráfico: rendeu e a render, 12 meses', await p.evaluate(() => { const c = CH['ch-inv-mes'].config; return c.data.datasets.map(x => x.label + ':' + x.data.length).join(','); }), 'Rendeu:12,A render:12');
  eq('gráfico: tabela com os mesmos valores', await p.evaluate(() => document.querySelectorAll('#inv-rm-tabela tbody tr').length + '|' + [...document.querySelectorAll('#inv-rm-tabela tfoot td')].map(td => td.textContent).join(' ')),
    `12|Total ${R(c2(M.reduce((x, m) => x + m.rendeu, 0)))} ${R(c2(M.reduce((x, m) => x + m.previsto, 0)))} R$ 10,00`);
  eq('anos do seletor: do primeiro movimento ao ano que vem', await p.evaluate(() => [...document.querySelectorAll('#inv-ano option')].map(o => o.value).join(',') + '|' + document.getElementById('inv-ano').value), '2025,2026,2027|2026');

  // ── 5. Projeção de lucro ──
  const fim1 = '2027-10-28', d1 = dias(HOJE, fim1);
  const pj = [[E.a1, rCDI(110)], [E.a2, rCDI(90)], [E.a3, rIPCA(6.2)], [E.a4, 0.12], [E.a5, rPoup]].map(([v, r]) => ({ v, r, f:cresce(v, r, d1) }));
  const totPj = pj.reduce((x, l) => x + l.f, 0) + 1200;
  const irPj = (pj[0].f - pj[0].v) * aliq(dias('2026-01-10', fim1)) / 100 + (pj[2].f - pj[2].v) * aliq(dias('2025-06-01', fim1)) / 100;
  function aliq(d){ return d <= 180 ? 22.5 : d <= 360 ? 20 : d <= 720 ? 17.5 : 15; }
  let r = await p.evaluate(() => { const x = projetarInvest(gs(), { hoje:today(), meses:12, aporte:0, taxaAportes:12 }); return { total:x.total, ir:x.ir, juros:x.juros, n:x.serie.length, fim:x.fim }; });
  perto('projeção de 1 ano: cada aplicação na sua taxa (vencida, reaplicada)', r.total, c2(totPj), 0.03);
  perto('projeção: IR só do CDB (17,5%) e do Tesouro (15%); LCI e poupança isentas, ações fora', r.ir, c2(irPj), 0.03);
  eq('projeção: 12 pontos até 28/10/2027', `${r.n}|${r.fim}`, '12|2027-10-28');
  r = await p.evaluate(() => { const x = projetarInvest(gs(), { hoje:today(), meses:12, aporte:500, taxaAportes:12 }); return x.aportes; });
  const datas = Array.from({ length:12 }, (_, k) => { const dt = new Date(2026, 9 + k + 1, 28); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-28`; });
  perto('aportes de 500 por mês a 12% ao ano', r.fim, c2(datas.reduce((x, dt) => x + cresce(500, 0.12, dias(dt, fim1)), 0)), 0.02);
  eq('projeção na tela: números', await txt(p, '#inv-proj-num > div > small'), 'Valor em out/27 | Juros no período | IR estimado | Lucro líquido | Juros por mês no fim');
  eq('projeção na tela: valor final', await txt(p, '#inv-proj-num .ip-destaque b'), R(c2(totPj)));
  eq('projeção na tela: IR por aplicação (com o grupo sem taxa)', await p.evaluate(() => [...document.querySelectorAll('#inv-proj-tab tbody tr')].map(tr => tr.children[4].textContent).join(',')),
    ['−' + R(c2((pj[0].f - pj[0].v) * 0.175)), '−' + R(c2((pj[2].f - pj[2].v) * 0.15)), 'isento', 'regras próprias', 'isento', '—'].join(','));
  await p.evaluate(() => { document.getElementById('inv-pz').value = '60'; document.getElementById('inv-ap').value = '500'; renderInvProjecao(); });
  eq('5 anos: um ponto por ano; a linha dos aportes aparece', await p.evaluate(() => CH['ch-inv-proj'].config.data.labels.join(',') + '|' + [...document.querySelectorAll('#inv-proj-tab tbody tr')].pop().children[0].firstChild.textContent),
    'out/27,out/28,out/29,out/30,out/31|Aportes de R$ 500,00 por mês');
  eq('taxa dos aportes: a média da carteira quando vazia', await p.evaluate(() => document.getElementById('inv-tx').placeholder === numBR(taxaMediaCarteira(gs(), today()))), true);
  await p.evaluate(() => { document.getElementById('inv-pz').value = '12'; document.getElementById('inv-ap').value = ''; renderInvProjecao(); });

  // ── 6. Detalhe ──
  await p.click('#inv-lista button.ia-l[data-id="a1"]');
  eq('detalhe: abre pelo clique na linha', await visivel(p, 'm-ativo'), true);
  eq('detalhe: aplicado, valor, rendimento e líquido se resgatar hoje (IR 20%)', await txt(p, '#ad-corpo .ad-num b'),
    [R(10000), R(E.a1), S(E.a1 - 10000), R(c2(E.a1 - (E.a1 - 10000) * 0.2))].join(' | '));
  const vVenc = E.a1 * Math.pow(1 + rCDI(110), dias(HOJE, '2028-01-10') / 365);
  eq('detalhe: no vencimento (IR 15%: mais de 2 anos)', await txt(p, '#ad-corpo .ad-info > div:last-child > *'),
    `No vencimento | ${R(vVenc)} | lucro ${R(vVenc - 10000)} · IR −${R((vVenc - 10000) * 0.15)} · líquido ${R(vVenc - (vVenc - 10000) * 0.15)}`);
  eq('detalhe: movimentações', await txt(p, '#ad-corpo .ad-mov-txt small'), '10/01/2026 · Aplicação');

  // ── 7. Aportar pelo detalhe ──
  const caixa0 = await p.evaluate(() => calcSaldoAte(today()));
  await p.click('#m-ativo .modal-ft .btn-green');
  eq('aportar: lançamento já ligado à aplicação, com a categoria dela', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [getComputedStyle($('m-lanc')).display, $('l-tipo').value, $('l-ativo').value, $('l-cat').value, $('l-subcat').value, $('l-desc').value, getComputedStyle($('l-ativo-row')).display].join('|'); }),
    'flex|Investimento|a1|Investimentos|Renda Fixa|Aporte — CDB Banco Inter|grid');
  await p.evaluate(() => { document.getElementById('l-valor').value = '1000'; document.getElementById('l-caixa').value = 'bk'; saveLanc(); });
  s = await sit(p, 'a1'); eq('aportar: o aplicado e o valor sobem 1.000', `${s.P}|${c2(s.V - E.a1)}`, '11000|1000');
  eq('aportar: sai do caixa (não é despesa)', await p.evaluate(c => +(c - calcSaldoAte(today())).toFixed(2), caixa0), 1000);

  // ── 8. Resgate parcial: quanto é rendimento, pela taxa ──
  await p.evaluate(() => { novoLancTipo('Resgate', null, 'a1'); document.getElementById('l-valor').value = '1000'; updLancRendEst(); });
  const rendEst = c2(1000 * (E.a1 - 10000) / (E.a1 + 1000));
  eq('resgate parcial: estimativa do rendimento', await txt(p, '#l-rend-est'), `Pela taxa, cerca de ${R(rendEst)} desse valor é rendimento. Usar`);
  await p.click('#l-rend-est .inv-link');
  eq('resgate parcial: "Usar" preenche o rendimento', await p.evaluate(() => document.getElementById('l-rend').value), rendEst.toFixed(2));
  eq('resgate parcial: opção de resgate total visível', await visivel(p, 'l-resg-total-row'), true);
  await p.evaluate(() => closeM('m-lanc'));

  // ── 9. Resgate total da LCI vencida (pelo aviso) ──
  const caixa1 = await p.evaluate(() => calcSaldoAte(today()));
  await p.click('#inv-avisos .inv-aviso .btn');
  eq('resgate total: valor de hoje e o rendimento já preenchidos', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('l-tipo').value, $('l-ativo').value, $('l-resg-total').checked, $('l-valor').value, $('l-rend').value].join('|'); }),
    `Resgate|a2|true|${E.a2.toFixed(2)}|${(E.a2 - 5000).toFixed(2)}`);
  await p.evaluate(() => { document.getElementById('l-caixa').value = 'bk'; saveLanc(); });
  eq('resgate total: resgate do aplicado + receita do lucro, ligados à LCI', await p.evaluate(() => gs().lancs.filter(l => l.ativoId === 'a2' && l.data === today())
    .map(l => `${l.tipo}:${l.valor}${l.refResgateId ? ':lucro' : ''}`).join(',')), `Resgate:5000,Receita:${c2(E.a2 - 5000)}:lucro`);
  s = await sit(p, 'a2'); eq('resgate total: a LCI acaba (encerrada)', `${s.V}|${s.ativa}|${await p.evaluate(() => gs().invAtivos.find(a => a.id === 'a2').encerradoEm)}`, `0|false|${HOJE}`);
  eq('resgate total: o caixa recebe tudo', await p.evaluate(c => +(calcSaldoAte(today()) - c).toFixed(2), caixa1), E.a2);
  eq('resgate total: aviso some; LCI vai para as encerradas', (await txt(p, '#inv-avisos')) + '|' + (await txt(p, '#inv-lista .ia-enc summary')), '|1 aplicação encerrada');

  // ── 10. Rendimento que entrou na conta (ações) ──
  await p.evaluate(() => { abrirAtivo('a4'); rendimentoAtivo(null); });
  eq('rendimento recebido: receita em Receitas › Rendimentos, ligada às ações', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('l-tipo').value, $('l-cat').value, $('l-subcat').value, $('l-ativo').value, $('l-desc').value, getComputedStyle($('l-ativo-row')).display].join('|'); }),
    'Receita|Receitas|Rendimentos|a4|Rendimento — Ações (carteira)|grid');
  await p.evaluate(() => { document.getElementById('l-valor').value = '45'; document.getElementById('l-caixa').value = 'bk'; saveLanc(); });
  eq('rendimento recebido: entra em "entrou na conta" de outubro', (await p.evaluate(() => rendimentosMensais(gs(), 2026, today())[9].recebido)), c2(45 + E.a2 - 5000));
  await p.evaluate(() => abrirAtivo('a4'));
  eq('rendimento recebido: aparece nas movimentações das ações', (await txt(p, '#ad-corpo .ad-mov-txt small')).split(' | ')[0], '28/10/2026 · Rendimento na conta');
  await p.evaluate(() => closeM('m-ativo'));

  // ── 11. Editar um lançamento mantém a aplicação (até de uma encerrada) ──
  await p.evaluate(() => { openLancOps('i2'); editLanc(); }); await p.waitForTimeout(300);
  eq('editar: o lançamento da LCI encerrada continua ligado', await p.evaluate(() => document.getElementById('l-ativo').value), 'a2');
  await p.evaluate(() => saveLanc());
  eq('editar e salvar: a ligação fica', await p.evaluate(() => gs().lancs.find(l => l.id === 'i2').ativoId), 'a2');

  // ── 12. Atualizar o saldo ──
  await p.evaluate(() => abrirInvSaldo('a1'));
  eq('atualizar saldo: mostra a estimativa para a data', (await txt(p, '#is-dica')).startsWith('Pelas contas do sistema, valeria cerca de R$'), true);
  await p.evaluate(() => { document.getElementById('is-valor').value = '12500'; salvarInvSaldo(); });
  s = await sit(p, 'a1'); eq('atualizar saldo: o valor passa a ser o informado', s.V, 12500);
  eq('atualizar saldo: o detalhe reabre e diz de quando é', await txt(p, '#ad-corpo .ad-num > div:nth-child(2) em'), `informado em ${HOJE.split('-').reverse().join('/')}`);
  await p.evaluate(() => apagarInvSaldo(gs().invAtivos.find(a => a.id === 'a1').saldos[0].id));
  s = await sit(p, 'a1'); eq('apagar o saldo: volta à estimativa', c2(s.V - E.a1), 1000);
  await p.evaluate(() => closeM('m-ativo'));

  // ── 13. Nova aplicação: "Estou aplicando agora" ──
  await p.evaluate(() => abrirAtivoForm(null));
  eq('cadastro: sugestões do CDB (100% do CDI, não isento)', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('af-idx').value, $('af-taxa').value, $('af-isento').checked, $('af-subcat').value, $('af-inicio').value].join('|'); }), `cdi|100|false|Renda Fixa|${HOJE}`);
  eq('cadastro: equivalência ao ano', await txt(p, '#af-equiv'), `≈ ${(rCDI(100) * 100).toLocaleString('pt-BR', { maximumFractionDigits:2 })}% ao ano com o CDI a 13,65% · ≈ ${(tm(rCDI(100)) * 100).toLocaleString('pt-BR', { maximumFractionDigits:2 })}% ao mês`);
  await p.evaluate(() => { document.getElementById('af-taxa').value = ''; salvarAtivo(); });
  eq('cadastro: sem nome', await txt(p, '#af-err'), '⚠️ Dê um nome para a aplicação.');
  await p.evaluate(() => { document.getElementById('af-nome').value = 'CDB Nubank 2027'; salvarAtivo(); });
  eq('cadastro: sem taxa', await txt(p, '#af-err'), '⚠️ Informe a taxa da aplicação.');
  await p.evaluate(() => { const $ = i => document.getElementById(i); $('af-taxa').value = '105'; $('af-venc').value = '2026-01-01'; salvarAtivo(); });
  eq('cadastro: vencimento antes da aplicação', await txt(p, '#af-err'), '⚠️ O vencimento precisa ser depois da data da aplicação.');
  await p.evaluate(() => { const $ = i => document.getElementById(i); $('af-venc').value = '2027-10-28'; salvarAtivo(); });
  eq('cadastro: sem valor', await txt(p, '#af-err'), '⚠️ Informe o valor aplicado.');
  await p.evaluate(() => { const $ = i => document.getElementById(i); $('af-valor').value = '3000'; salvarAtivo(); });
  eq('cadastro: sem a conta', await txt(p, '#af-err'), '⚠️ Escolha a conta de onde sai o dinheiro.');
  const caixa2 = await p.evaluate(() => calcSaldoAte(today()));
  await p.evaluate(() => { const $ = i => document.getElementById(i); $('af-inst').value = 'Nubank'; $('af-conta').value = 'bk'; salvarAtivo(); });
  r = await p.evaluate(() => { const d = gs(), a = d.invAtivos.find(x => x.nome === 'CDB Nubank 2027'), l = d.lancs.find(x => x.ativoId === a.id);
    return [a.produto, a.indexador, a.taxa, a.vencimento, l.tipo, l.valor, l.caixaId, l.pago, d.bancos[0].movs.some(m => m.refLancId === l.id)].join('|'); });
  eq('cadastro: aplicação + lançamento de aplicação na conta', r, 'CDB|cdi|105|2027-10-28|Investimento|3000|bk|Pago|true');
  eq('cadastro: o dinheiro sai da conta', await p.evaluate(c => +(c - calcSaldoAte(today())).toFixed(2), caixa2), 3000);
  eq('cadastro: aparece na lista', (await txt(p, '#inv-lista button.ia-l .c-nome b')).includes('CDB Nubank 2027'), true);

  // ── 14. Nova aplicação: "Já tenho essa aplicação" (não mexe no caixa) ──
  const caixa3 = await p.evaluate(() => calcSaldoAte(today()));
  await p.evaluate(() => { abrirAtivoForm(null); const $ = i => document.getElementById(i);
    $('af-produto').value = 'Tesouro Selic'; afProduto(); $('af-nome').value = 'Tesouro Selic 2029'; $('af-inicio').value = '2026-05-02';
    document.querySelector('input[name="af-modo"][value="existente"]').checked = true; afModo(); $('af-valor').value = '4000'; $('af-atual').value = '4100'; });
  eq('já tenho: pede quanto vale hoje, sem a conta', `${await visivel(p, 'af-atual-fg')}|${await visivel(p, 'af-conta-fg')}|${await txt(p, '#af-valor-lbl')}`, 'true|false|Quanto você aplicou *');
  await p.evaluate(() => salvarAtivo());
  r = await p.evaluate(() => { const d = gs(), a = d.invAtivos.find(x => x.nome === 'Tesouro Selic 2029'); const s = situacaoAtivo(a, d, today());
    return [a.indexador, JSON.stringify(a.base), a.saldos.map(x => x.data + '=' + x.valor).join(), d.lancs.some(l => l.ativoId === a.id), s.V, s.P].join('|'); });
  eq('já tenho: guarda o valor anterior e o saldo de hoje, sem lançamento', r, `selic|{"valor":4000,"data":"2026-05-02"}|${HOJE}=4100|false|4100|4000`);
  eq('já tenho: o caixa não muda', await p.evaluate(c => +(calcSaldoAte(today()) - c).toFixed(2), caixa3), 0);

  // ── 15. Cadastrar a taxa de um grupo antigo ──
  await p.evaluate(() => { renderInvest(); const i = _invGrupos.findIndex(g => g.sub === 'Previdência Privada'); abrirAtivoForm(null, null, i); });
  eq('cadastrar taxa: já vem com o nome, o produto, a data e sem pedir valor', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('af-nome').value, $('af-produto').value, $('af-inicio').value, $('af-subcat').value, getComputedStyle($('af-valor-box')).display, $('af-titulo').textContent].join('|'); }),
    'Previdência Privada|Previdência|2026-04-10|Previdência Privada|none|Cadastrar a taxa');
  await p.evaluate(() => salvarAtivo());
  r = await p.evaluate(() => { const d = gs(), a = d.invAtivos.find(x => x.nome === 'Previdência Privada'); return [d.lancs.find(l => l.id === 'p1').ativoId === a.id, situacaoAtivo(a, d, today()).V, gruposSemAtivo(d, today()).length].join('|'); });
  eq('cadastrar taxa: o lançamento antigo passa a ser da aplicação e rende pelo CDI', r, `true|${c2(cresce(1200, rCDI(100), dias('2026-04-10', HOJE)))}|0`);

  // ── 16. Editar a aplicação ──
  await p.evaluate(() => { abrirAtivoForm('a1'); document.getElementById('af-taxa').value = '120'; salvarAtivo(); });
  s = await sit(p, 'a1');
  eq('editar: nova taxa muda o valor de hoje (e o detalhe reabre)', `${c2(s.V - 1000)}|${await visivel(p, 'm-ativo')}`, `${c2(cresce(10000, rCDI(120), dias('2026-01-10', HOJE)))}|true`);
  await p.evaluate(() => closeM('m-ativo'));

  // ── 17. Taxas de referência ──
  await p.evaluate(() => { abrirInvTaxas(); document.getElementById('it-cdi').value = '10'; salvarInvTaxas(); });
  s = await sit(p, 'a1');
  eq('taxas: CDI novo vale para todas as estimativas', `${c2(s.V - 1000)}|${await p.evaluate(() => invCfg().cdi + '|' + invCfg().atualizadoEm)}`, `${c2(cresce(10000, rCDI(120, 10), dias('2026-01-10', HOJE)))}|10|${HOJE}`);
  await p.evaluate(() => { abrirInvTaxas(); document.getElementById('it-cdi').value = '-1'; salvarInvTaxas(); });
  eq('taxas: valor inválido', await txt(p, '#it-err'), '⚠️ Use números entre 0 e 100.');
  await p.evaluate(() => { restaurarInvTaxas(); salvarInvTaxas(); });
  eq('taxas: voltar aos valores de 28/10/2026', await p.evaluate(() => invCfg().cdi), 13.65);

  // ── 18. Excluir a aplicação: os lançamentos ficam, só perdem a ligação ──
  await p.evaluate(() => { abrirAtivo(gs().invAtivos.find(x => x.nome === 'Previdência Privada').id); excluirAtivo(); });
  r = await p.evaluate(() => { const d = gs(); return [d.invAtivos.some(x => x.nome === 'Previdência Privada'), !!d.lancs.find(l => l.id === 'p1'), d.lancs.find(l => l.id === 'p1').ativoId || '', gruposSemAtivo(d, today()).map(g => g.sub).join()].join('|'); });
  eq('excluir: a aplicação sai; o lançamento volta para "sem taxa"', r, 'false|true||Previdência Privada');

  // ── 19. Dashboard e Lançamentos ──
  await p.evaluate(() => irPagina('dash'));
  const vTot = await p.evaluate(() => valorInvestimentosAte(today(), { somentePagos:true }));
  eq('patrimônio: valor de hoje dos investimentos (com o rendimento)', await p.evaluate(v => document.getElementById('dk-patrimonio-sub').textContent.includes(`investido ${fmtRCurto(v)}`), vTot), true);
  eq('patrimônio = aplicações (valor de hoje) + o que está sem taxa', vTot, await p.evaluate(() => { const d = gs(); return +(d.invAtivos.reduce((x, a) => x + situacaoAtivo(a, d, today()).V, 0) + 1200).toFixed(2); }));
  await p.click('#dk-patrimonio-sub .inv-link');
  eq('patrimônio: "investido" abre a aba', await p.evaluate(() => _page), 'invest');
  await p.evaluate(() => irPagina('lanc'));
  await p.click('#page-lanc .inv-link');
  eq('Lançamentos: "Ver investimentos" abre a aba', await p.evaluate(() => _page), 'invest');

  // ── celular ──
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => { goMob('invest'); window.scrollTo(0, 0); });
  eq('celular: a aba cabe na largura', await p.evaluate(() => document.documentElement.scrollWidth), 390);
  eq('celular: tabela por aplicação só com juros e líquido (cabe sem rolar)', await p.evaluate(() => [...document.querySelectorAll('#inv-proj-tab thead th')].filter(th => th.getClientRects().length).map(th => th.textContent).join(',')
    + '|' + (document.querySelector('#inv-proj-tab .tbl-wrap').scrollWidth <= document.querySelector('#inv-proj-tab .tbl-wrap').clientWidth)), 'Aplicação,Juros,Líquido|true');
  for(const [nome, abre] of [['detalhe', () => abrirAtivo('a1')], ['cadastro', () => abrirAtivoForm(null)], ['saldo', () => abrirInvSaldo('a3')], ['taxas', () => abrirInvTaxas()]]){
    await p.evaluate(abre);
    eq(`celular: ${nome} cabe na tela`, await p.evaluate(() => { const m = [...document.querySelectorAll('.overlay')].find(o => getComputedStyle(o).display === 'flex').querySelector('.modal').getBoundingClientRect();
      return m.left >= 0 && m.right <= 390 && document.documentElement.scrollWidth === 390; }), true);
    await p.evaluate(() => document.querySelectorAll('.overlay').forEach(o => { if(getComputedStyle(o).display === 'flex') closeM(o.id); }));
  }
  // tema claro: as cores dos gráficos vêm do tema
  await p.evaluate(() => { applyTheme('light'); renderInvest(); });
  eq('tema claro: cores validadas do tema', await p.evaluate(() => [CH['ch-inv-proj'].config.data.datasets.map(x => x.borderColor).join(), CH['ch-inv-mes'].config.data.datasets[0].backgroundColor].join('|')), '#2a78d6,#1b9c5b|#1b9c5b');

  // ── sem nada aplicado: tela vazia que explica o que fazer ──
  const vazio = { ...DATA, invAtivos:[], lancs:DATA.lancs.filter(l => l.tipo !== 'Investimento' && l.tipo !== 'Resgate' && !l.ativoId) };
  const pv = await novaPagina({ viewport:{ width:1400, height:900 } }, vazio);
  await pv.evaluate(() => irPagina('invest'));
  eq('vazio: números zerados e convite para cadastrar', (await txt(pv, '#ik-valor, #ik-aplic')) + ' # ' + (await txt(pv, '#inv-lista .ia-vazio b')), 'R$ 0,00 | R$ 0,00 # Nenhuma aplicação ainda');
  eq('vazio: juros por mês e projeção explicam o que falta', `${await visivel(pv, 'inv-rm-vazio')}|${await visivel(pv, 'inv-proj-vazio')}|${await visivel(pv, 'inv-proj-box')}`, 'true|true|false');
  await pv.evaluate(() => { document.getElementById('inv-ap').value = '300'; renderInvProjecao(); });
  eq('vazio: com um aporte por mês, a projeção vira simulador', `${await visivel(pv, 'inv-proj-box')}|${(await txt(pv, '#inv-proj-num .ip-destaque em'))}`, 'true|hoje: R$ 0,00 + aportes de R$ 3.600,00');

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
