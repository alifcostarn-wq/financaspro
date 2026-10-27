// Investimentos: aplicação não é despesa, resgate não é receita — em todas as telas — hoje = 2026-10-20
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-invest.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261018<TRNAMT>250.00<FITID>a1<MEMO>RESGATE RDB</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261018<TRNAMT>-600.00<FITID>a2<MEMO>APLICACAO TESOURO DIRETO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261019<TRNAMT>90.00<FITID>a3<MEMO>PIX RECEBIDO JOAO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261019<TRNAMT>12.34<FITID>a4<MEMO>RENDIMENTO POUPANCA</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261019<TRNAMT>-120.00<FITID>a5<MEMO>PAGTO ENERGIA</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
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
    await p.clock.setFixedTime(new Date('2026-10-20T12:00:00'));
    await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
    return p;
  };
  const txt = (p, sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), sel);
  // Linhas do DRE de outubro (valor de cada linha pelo rótulo)
  const dre = (p) => p.evaluate(() => {
    irPagina('rel'); document.getElementById('rel-dre-mes').value = '9';
    tglRel('dre-mensal', document.querySelector('#page-rel .tgl[onclick*="dre-mensal"]'));
    const o = {};
    document.querySelectorAll('#dre-m-body > div').forEach(e => { const s = [...e.querySelectorAll('span')]; if(s.length >= 2) o[s[0].textContent.replace(/\s+/g, ' ').replace(/^↳\s*/, '').trim()] = s[s.length - 1].textContent.trim(); });
    return o;
  });
  const dash = (p) => p.evaluate(() => { irPagina('dash'); return [...document.querySelectorAll('.dash-kpis .kpi-val')].map(e => e.textContent).join(' | '); });

  const p = await novaPagina({ viewport:{ width:1400, height:900 } });

  // ── 1. Movimentações de Bancos: com categoria de investimento são aplicação/resgate, não despesa/receita ──
  let r = await dre(p);
  eq('DRE: receita sem o resgate de RDB feito em Bancos', r['(=) Total de Receitas Brutas'], 'R$ 9.650,00');
  eq('DRE: despesa sem a aplicação em RDB feita em Bancos', r['(=) Total de Despesas'], '-R$ 1.680,00');
  eq('DRE: aplicações e resgates numa seção própria', [r['(−) Aplicação · Investimentos'], r['(+) Resgate · Investimentos'], r['(=) Investido no mês (aplicações − resgates)']].join(' | '),
    '-R$ 2.700,00 | R$ 300,00 | -R$ 2.400,00');
  eq('DRE: o caixa do mês não muda (só a classificação)', [r['(+) Resgates de investimentos'], r['(-) Aplicações em investimentos'], r['(=) Saldo Final (fim de Outubro)']].join(' | '),
    'R$ 300,00 | -R$ 2.700,00 | R$ 12.570,00');

  // ── 2. O que entrou errado antes (extrato): a revisão encontra e corrige com confirmação ──
  eq('candidatos: o resgate e a aplicação do extrato (venda e farmácia não)', await p.evaluate(() => candidatosInvest().map(c => `${c.desc}:${c.de}→${c.para}`).join(', ')),
    'APLICACAO AUTOMATICA:Despesa→Investimento, RESGATE CDB BANCO X:Receita→Resgate');
  await p.evaluate(() => irPagina('lanc'));
  eq('Lançamentos: aviso para revisar', await txt(p, '#l-inv-revisar > span'),
    '🔎 2 movimentações parecem aplicação ou resgate de investimento, mas estão contadas como despesa ou receita.');
  await p.evaluate(() => irPagina('dash'));
  eq('Dashboard: a revisão aparece em "Precisa de atenção"', (await txt(p, '#dash-atencao .dk-at-txt b')).includes('2 movimentações parecem investimento'), true);
  await p.click('#dash-atencao .dk-at.info >> text=parecem investimento');
  eq('revisão: lista o que muda', await txt(p, '#inv-rev-lista .inv-rev-l'),
    '20/10/2026... '.slice(0, 0) + '17/10/2026 APLICACAO AUTOMATICALançamento Despesa → Aplicação R$ 400,00 | 15/10/2026 RESGATE CDB BANCO XLançamento Receita → Resgate R$ 1.500,00');
  // desmarca a aplicação: só o resgate é corrigido; a desmarcada não volta a ser sugerida
  await p.click('#inv-rev-lista input[data-i="0"]');
  await p.click('#inv-rev-ok');
  eq('corrigiu só o marcado', await p.evaluate(() => { const d = gs(), l = id => d.lancs.find(x => x.id === id);
    return [l('l4').tipo, l('l4').cat, l('l4').subcat, l('l4').obs, l('l5').tipo, (d.invNaoSao || []).join(',')].join('|'); }),
    'Resgate|Investimentos|Renda Fixa|corrigido: era receita|Despesa|l:l5');
  eq('sem candidatos: o aviso some', await p.evaluate(() => { irPagina('lanc'); return candidatosInvest().length + '|' + getComputedStyle(document.getElementById('l-inv-revisar')).display; }), '0|none');
  // volta a sugerir a aplicação e corrige
  await p.evaluate(() => { const d = gs(); d.invNaoSao = []; ss(d); abrirRevisarInvest(); });
  await p.click('#inv-rev-ok');
  eq('aplicação do extrato corrigida', await p.evaluate(() => { const l = gs().lancs.find(x => x.id === 'l5'); return [l.tipo, l.cat, l.subcat].join('|'); }), 'Investimento|Investimentos|');

  // depois da correção: receita e despesa sem investimento; o saldo do mês não muda
  eq('Dashboard: receita, despesa, investido líquido e saldo', await dash(p), 'R$ 8.000,00 | R$ 1.200,00 | R$ 900,00 | R$ 5.900,00');
  eq('Dashboard: investido com aplicado e resgatado', await txt(p, '#dk-inv-nota'), 'aplicou R$ 2,4 mil · resgatou R$ 1,5 mil');
  r = await dre(p);
  eq('DRE corrigido: receitas e despesas', [r['(=) Total de Receitas Brutas'], r['(=) Total de Despesas'], r['(=) Resultado Operacional (Lucro / Prejuízo)']].join(' | '),
    'R$ 8.150,00 | -R$ 1.280,00 | R$ 6.870,00');
  eq('DRE corrigido: investimentos e resultado final', [r['(=) Investido no mês (aplicações − resgates)'], r['(=) Resultado Final após Investimentos'], r['(=) Saldo Final (fim de Outubro)']].join(' | '),
    '-R$ 1.300,00 | R$ 5.570,00 | R$ 12.570,00');

  // ── 3. Novo resgate: tipo próprio, categorias de investimento e o lucro como receita ──
  await p.evaluate(() => { irPagina('lanc'); novoLancTipo('Resgate'); });
  eq('resgate: categorias de investimento, dica e campo do rendimento', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('l-tipo').value, [...$('l-cat').options].map(o => o.value).join(','), [...$('l-subcat').options].map(o => o.value).includes('Tesouro Direto'),
      $('l-inv-dica').textContent.includes('Não é receita'), getComputedStyle($('l-rend-row')).display].join('|'); }),
    'Resgate|Investimentos|true|true|grid');
  await p.evaluate(() => { const $ = i => document.getElementById(i);
    $('l-subcat').value = 'Tesouro Direto'; $('l-desc').value = 'Resgate Tesouro'; $('l-valor').value = '1100'; $('l-rend').value = '1100'; $('l-caixa').value = 'bk'; saveLanc(); });
  eq('rendimento maior ou igual ao resgate é recusado', await p.evaluate(() => getComputedStyle(document.getElementById('m-lanc')).display + '|' + document.getElementById('l-lanc-err').textContent),
    'flex|⚠️ O rendimento precisa ser menor que o valor resgatado.');
  const saldoAntes = await p.evaluate(() => calcSaldoAte('2026-10-31'));
  await p.evaluate(() => { document.getElementById('l-rend').value = '100'; saveLanc(); });
  eq('resgate de 1.100 com 100 de lucro: resgate 1.000 + receita 100', await p.evaluate(() => gs().lancs.filter(l => /Resgate Tesouro/.test(l.desc))
    .map(l => `${l.tipo}:${l.desc}:${l.valor}:${l.cat}›${l.subcat}`).join(', ')),
    'Resgate:Resgate Tesouro:1000:Investimentos›Tesouro Direto, Receita:Rendimento — Resgate Tesouro:100:Receitas›Rendimentos');
  eq('o caixa recebe o resgate inteiro', await p.evaluate(a => +(calcSaldoAte('2026-10-31') - a).toFixed(2), saldoAntes), 1100);
  eq('a conta mostra o resgate como entrada', await p.evaluate(() => { const b = gs().bancos[0], l = gs().lancs.find(x => x.desc === 'Resgate Tesouro');
    return b.movs.find(m => m.refLancId === l.id).tipo; }), 'entrada');
  eq('Lançamentos: investido no mês líquido e saldo', await txt(p, '#lk-rec, #lk-des, #lk-sal, #lk-inv, #lk-inv-sub'),
    'R$ 8.100,00 | R$ 1.200,00 | R$ 7.000,00 | -R$ 100,00 | aplicou R$ 2.400,00 · resgatou R$ 2.500,00');
  await p.evaluate(() => { document.getElementById('l-fil-tipo').value = 'Resgate'; renderLanc(); });
  eq('Lançamentos: filtro e selo do resgate', await p.evaluate(() => [...document.querySelectorAll('#l-tbody tr')].filter(tr => tr.querySelector('.badge'))
    .map(tr => [...tr.querySelectorAll('.badge')].map(x => x.textContent.trim()).find(t => t === 'Resgate') + ':' + (tr.textContent.includes('+') ? '+' : '-')).join(',')), 'Resgate:+,Resgate:+');
  await p.evaluate(() => { document.getElementById('l-fil-tipo').value = ''; renderLanc(); });
  // aplicação: dica e sem campo de rendimento; edição de resgate também sem o campo
  await p.evaluate(() => novoLancTipo('Investimento'));
  eq('aplicação: dica "não é despesa", sem rendimento', await p.evaluate(() => document.getElementById('l-inv-dica').textContent.includes('Não é despesa') + '|' + getComputedStyle(document.getElementById('l-rend-row')).display), 'true|none');
  await p.evaluate(() => { closeM('m-lanc'); openLancOps(gs().lancs.find(x => x.desc === 'Resgate Tesouro').id); editLanc(); });
  await p.waitForTimeout(250);
  eq('editar resgate: tipo e categoria mantidos, sem o campo do rendimento', await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [$('l-tipo').value, $('l-cat').value, $('l-subcat').value, getComputedStyle($('l-rend-row')).display].join('|'); }), 'Resgate|Investimentos|Tesouro Direto|none');
  await p.evaluate(() => closeM('m-lanc'));

  // ── 4. Carteira e patrimônio ──
  eq('investido até hoje (lançamentos + Bancos)', await p.evaluate(() => investidoAte('2026-10-31', { somentePagos:true })), 3300);
  await p.click('#page-lanc .inv-link');
  eq('carteira: totais', await txt(p, '#carteira-corpo .cart-tot b'), 'R$ 6.100,00 | R$ 2.800,00 | R$ 3.300,00');
  eq('carteira: por categoria, do maior para o menor', await p.evaluate(() => [...document.querySelectorAll('#carteira-corpo .cart-l:not(.cab)')]
    .map(e => `${e.children[0].firstChild.textContent}=${e.querySelector('.saldo').textContent}`).join(', ')),
    'Renda Fixa=R$ 1.900,00, Tesouro Direto=R$ 1.000,00, Investimentos=R$ 400,00');
  await p.evaluate(() => closeM('m-carteira'));
  await p.evaluate(() => irPagina('dash'));
  eq('Dashboard: patrimônio com o investido de verdade', await txt(p, '#dk-patrimonio-sub'), 'caixa R$ 13,7 mil · investido R$ 3,3 mil');
  await p.click('#dk-patrimonio-sub .inv-link');
  eq('Dashboard: "investido" abre a carteira', await p.evaluate(() => getComputedStyle(document.getElementById('m-carteira')).display), 'flex');
  await p.evaluate(() => closeM('m-carteira'));

  // ── 5. Relatórios e orçamento: investimento líquido; resgate fora da receita ──
  eq('Central de Relatórios: investimentos líquidos e receita sem resgate', await p.evaluate(() => { const a = absMesISO('2026-10'), s = l => +l.reduce((x, y) => x + y.valor, 0).toFixed(2);
    return [s(lancsRC(gs(), a, a, 'Investimento')), s(lancsRC(gs(), a, a, 'Receita'))].join('|'); }), '-100|8100');
  eq('Orçamento: o resgate desconta da meta de investimento', await p.evaluate(() => consolidarOrcamento(gs(), 9, 2026, false).cats.find(g => g.tipo === 'Investimento').real), -100);
  eq('Relatório anual: outubro com investido líquido', await p.evaluate(() => { irPagina('rel'); tglRel('anual', document.querySelector('#page-rel .tgl[onclick*="anual"]'));
    return [...document.querySelectorAll('#rel-ano-tbody tr')][9].textContent.replace(/\s+/g, ' ').trim(); }), 'Outubro R$ 8.100,00 R$ 1.200,00 -R$ 100,00 R$ 7.000,00 86.4%');
  // 5 lançamentos (3 aplicações e 2 resgates) + 2 movimentações de Bancos + 1 meta
  eq('Plano de contas: resgates contam como uso da categoria de investimento', await p.evaluate(() => mapaUsoCategorias(gs())['Investimento|Investimentos'].n), 8);

  // ── 6. Bancos: entrada pode ser resgate; saída pode ser aplicação ──
  await p.evaluate(() => { irPagina('bancos'); selectBanco('bk'); openMBkMov('entrada'); });
  eq('Bancos: entrada oferece "resgate de investimento"', await p.evaluate(() => [...document.querySelectorAll('#bm-cat optgroup')].map(g => g.label).join(' | ')),
    'Receitas | Resgate de investimento (não é receita)');
  await p.evaluate(() => { closeM('m-bk-mov'); openMBkMov('saida'); });
  eq('Bancos: saída oferece "aplicação em investimento"', await p.evaluate(() => [...document.querySelectorAll('#bm-cat optgroup')].map(g => g.label).join(' | ')),
    'Despesas | Aplicação em investimento (não é despesa)');
  await p.evaluate(() => closeM('m-bk-mov'));

  // ── 7. Extrato (OFX): aplicação e resgate reconhecidos; dá para trocar antes de importar ──
  await p.evaluate(() => openOfxImport());
  await p.setInputFiles('#ofx-file-input', { name:'extrato.ofx', mimeType:'application/x-ofx', buffer:Buffer.from(OFX, 'latin1') });
  await p.waitForTimeout(300);
  eq('OFX: sugestão de cada linha', await p.evaluate(() => [...document.querySelectorAll('#ofx-tbody tr')].map(tr => tr.children[2].textContent + '=' + tr.querySelector('.ofx-tipo').value).join(', ')),
    'RESGATE RDB=Resgate, APLICACAO TESOURO DIRETO=Investimento, PIX RECEBIDO JOAO=Receita, RENDIMENTO POUPANCA=Receita, PAGTO ENERGIA=Despesa');
  await p.selectOption('#ofx-tbody tr:nth-child(3) .ofx-tipo', 'Resgate');   // o usuário sabe que esse PIX foi um resgate
  await p.evaluate(() => ofxImportar());
  eq('OFX: importado com o tipo certo', await p.evaluate(() => gs().lancs.filter(l => l.origem === 'ofx' && l.data >= '2026-10-18')
    .map(l => `${l.desc}=${l.tipo}:${l.cat}${l.subcat ? '›' + l.subcat : ''}`).join(', ')),
    'RESGATE RDB=Resgate:Investimentos›Renda Fixa, APLICACAO TESOURO DIRETO=Investimento:Investimentos›Tesouro Direto, PIX RECEBIDO JOAO=Resgate:Investimentos, RENDIMENTO POUPANCA=Receita:Receitas›Importado OFX, PAGTO ENERGIA=Despesa:Outras Despesas›Importado OFX');
  eq('OFX: nada importado vira candidato de revisão', await p.evaluate(() => candidatosInvest().length), 0);

  // ── celular ──
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => { irPagina('lanc'); abrirCarteira(); });
  eq('celular: carteira cabe na tela', await p.evaluate(() => document.querySelector('#m-carteira .modal').getBoundingClientRect().right <= 390 && document.documentElement.scrollWidth === 390), true);
  await p.evaluate(() => { closeM('m-carteira'); const d = gs(); d.lancs.push({ id:'z9', data:'2026-10-20', tipo:'Despesa', cat:'Outras Despesas', subcat:'', desc:'APLIC AUT MAIS', valor:50, caixaId:'bk', caixaNome:'Itaú', pago:'Pago', obs:'', ts:99, status:'ativo' }); ss(d); abrirRevisarInvest(); });
  eq('celular: revisão cabe na tela', await p.evaluate(() => document.querySelector('#m-inv-revisar .modal').getBoundingClientRect().right <= 390 && document.documentElement.scrollWidth === 390), true);

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
