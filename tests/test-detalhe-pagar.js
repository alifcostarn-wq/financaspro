// Contas a Pagar: clicar numa conta mostra as informações dela e todas as parcelas (pagas e em aberto) — hoje = 2026-10-15
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = JSON.parse(JSON.stringify(require('./dados-pagar.js')));
// descrição completa: a 1ª parcela da geladeira foi paga com desconto, tem observação e observação do pagamento
Object.assign(DATA.contas.find(c => c.id === 'gel0'), { obs:'Loja Magazine · pedido 48213', obsPagamento:'Pago no PIX com 2% de desconto', valorPago:245, caixaNome:'Itaú' });
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
    await p.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
    await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);
    return p;
  };
  const txt = (p, sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), sel);
  const aberto = (p, id) => p.evaluate(id => getComputedStyle(document.getElementById(id)).display === 'flex', id);
  const info = p => p.evaluate(() => [...document.querySelectorAll('#cpd-corpo .cpd-info > div')].map(d => [...d.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ')).join(' # '));
  const tiles = p => p.evaluate(() => [...document.querySelectorAll('#cpd-corpo .cpd-tiles > div')].map(d => [...d.children].map(c => c.textContent.trim()).join(' / ')).join(' # '));
  const linhas = p => p.evaluate(() => [...document.querySelectorAll('#cpd-lista .cpd-l-main')].map(l => [...l.children].map(c => [...c.childNodes].map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ~ ')).join(' | ')));
  const rodape = p => txt(p, '#cpd-ft .btn');

  const p = await novaPagina({ viewport:{ width:1400, height:900 } });
  await p.evaluate(() => irPagina('contas'));

  // ── 1. Clique na linha da lista abre o detalhe ──
  await p.locator('#cp-tbody tr.cp-clic', { hasText:'Geladeira (2/4)' }).first().locator('td').nth(3).click();
  eq('clique na linha abre o detalhe', await aberto(p, 'm-cp-det'), true);
  eq('título e subtítulo', (await txt(p, '#cpd-titulo')) + ' # ' + (await txt(p, '#cpd-sub')), 'Geladeira # Conta (boleto, PIX…) · Casa · parcelada em 4x');
  eq('informações da parcela clicada', (await txt(p, '#cpd-corpo .cpd-qual')) + ' # ' + (await info(p)),
    'Parcela 2 de 4 # Vencimento / 25/10/2026 # Valor / R$ 250,00 # Situação / Pendente / vence em 10 dias # Pago com / — # Categoria / Casa # Tipo / Parcela 2 de 4');
  eq('resumo do parcelamento', await tiles(p),
    'Total / R$ 995,00 / 4 parcelas # Pagas / R$ 245,00 / 1 de 4 # Em aberto / R$ 750,00 / 3 parcelas # Próxima / 25/10/2026 / R$ 250,00 · 2/4');
  eq('progresso', await txt(p, '#cpd-corpo .cpd-prog span'), '25% pago · 1 de 4 parcelas');
  eq('todas as parcelas, com a descrição completa e a situação', (await linhas(p)).join(' || '),
    ['1/4 | Geladeira (1/4) ~ Loja Magazine · pedido 48213 · previsto R$ 250,00 · Pago no PIX com 2% de desconto | 25/09/2026 | R$ 245,00 | Pago ~ paga em 25/09/2026 · Itaú',
     '2/4 | Geladeira (2/4) | 25/10/2026 | R$ 250,00 | Pendente ~ vence em 10 dias',
     '3/4 | Geladeira (3/4) | 25/11/2026 | R$ 250,00 | Pendente ~ vence em 41 dias',
     '4/4 | Geladeira (4/4) | 25/12/2026 | R$ 250,00 | Pendente ~ vence em 71 dias'].join(' || '));
  eq('a parcela clicada fica marcada', await txt(p, '#cpd-lista .cpd-l.sel .cpd-n'), '2/4');
  eq('ações por parcela: desfazer na paga, pagar nas abertas', await p.evaluate(() => [...document.querySelectorAll('#cpd-lista .cpd-ac')].map(a => a.textContent.trim() || '-').join(',')), '↺,✓,✓,✓');
  eq('rodapé da parcela aberta', await rodape(p), '✕ Excluir | ✎ Editar | ✓ Pagar');
  eq('totais da lista', await txt(p, '#cpd-corpo .cpd-tot span'), 'Mostrando 4 de 4 | Pago: R$ 245,00 · em aberto: R$ 750,00');

  // ── 2. Filtros e escolha de outra parcela ──
  await p.click('#cpd-corpo .cpd-chip:nth-child(3)');
  eq('filtro "Pagas"', (await linhas(p)).map(l => l.split(' | ')[0]).join(',') + ' | ' + await txt(p, '#cpd-corpo .cpd-chip[aria-pressed="true"]'), '1/4 | Pagas 1');
  await p.click('#cpd-corpo .cpd-chip:nth-child(2)');
  eq('filtro "Em aberto"', (await linhas(p)).map(l => l.split(' | ')[0]).join(','), '2/4,3/4,4/4');
  await p.click('#cpd-corpo .cpd-chip:nth-child(1)');
  await p.click('#cpd-lista .cpd-l:nth-child(3) .cpd-l-main');
  eq('clicar noutra parcela mostra as informações dela', (await txt(p, '#cpd-corpo .cpd-qual')) + ' # ' + (await txt(p, '#cpd-lista .cpd-l.sel .cpd-n')), 'Parcela 3 de 4 # 3/4');

  // ── 3. Pagar e desfazer pela própria lista (o pagamento abre por cima e o detalhe acompanha) ──
  eq('o modal de pagamento fica por cima do detalhe', await p.evaluate(() => !!(document.getElementById('m-cp-det').compareDocumentPosition(document.getElementById('m-pagar')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  await p.click('#cpd-lista .cpd-l:nth-child(3) .cpd-ac .btn');
  eq('✓ abre o pagamento da parcela, com o detalhe aberto atrás', `${await aberto(p, 'm-pagar')}|${await aberto(p, 'm-cp-det')}|${await txt(p, '#pg-desc')}`, 'true|true|Geladeira (3/4)');
  await p.evaluate(() => confirmarPagamento());
  eq('depois de pagar: a parcela aparece paga e o resumo muda', (await linhas(p))[2].split(' | ').slice(4).join(' | ') + ' # ' + (await tiles(p)).split(' # ')[1], 'Pago ~ paga em 15/10/2026 # Pagas / R$ 495,00 / 2 de 4');
  await p.click('#cpd-lista .cpd-l:nth-child(3) .cpd-ac .btn');
  eq('↺ desfaz (com confirmação) e a parcela volta a ficar em aberto', (await linhas(p))[2].split(' | ').slice(4).join(' | '), 'Pendente ~ vence em 41 dias');
  eq('desfazer remove o lançamento do pagamento', await p.evaluate(() => gs().lancs.filter(l => l.refContaId === 'gel2').length), 0);
  await p.evaluate(() => closeM('m-cp-det'));

  // ── 4. Dívida: as parcelas dela ──
  await p.evaluate(() => abrirDetalhePagar('divida:emp:ep2'));
  eq('dívida: título e informações', (await txt(p, '#cpd-titulo')) + ' # ' + (await info(p)),
    'Empréstimo Itaú # Vencimento / 15/10/2026 # Valor / R$ 400,00 # Situação / Pendente / vence hoje # Pago com / — # Categoria / Serviços & Financeiro / Pagamento de Dívida # Tipo / Parcela 3 de 6');
  eq('dívida: resumo', await tiles(p),
    'Valor da dívida / R$ 2.400,00 / 6 parcelas # Pagas / R$ 800,00 / 2 de 6 # Saldo devedor / R$ 1.600,00 / 4 parcelas em aberto # Próxima / 15/10/2026 / R$ 400,00 · 3/6');
  eq('dívida: todas as parcelas', (await linhas(p)).map(l => l.split(' | ').slice(0, 2).join(' ') + ' · ' + l.split(' | ')[4].split(' ~ ')[0]).join(', '),
    '1/6 Empréstimo Itaú — parcela 1/6 · Pago, 2/6 Empréstimo Itaú — parcela 2/6 · Pago, 3/6 Empréstimo Itaú — parcela 3/6 · Pendente, 4/6 Empréstimo Itaú — parcela 4/6 · Pendente, 5/6 Empréstimo Itaú — parcela 5/6 · Pendente, 6/6 Empréstimo Itaú — parcela 6/6 · Pendente');
  eq('dívida: rodapé', await rodape(p), '📉 Ver dívida | ✓ Pagar parcela');
  await p.click('#cpd-ft .btn-green');
  eq('dívida: pagar abre o pagamento já na parcela 3', `${await aberto(p, 'm-pg-div')}|${await p.evaluate(() => document.getElementById('pgd-parc').value)}`, 'true|ep2');
  await p.evaluate(() => savePgDiv());
  eq('dívida: depois de pagar, 3 de 6 pagas e o rodapé oferece desfazer', (await tiles(p)).split(' # ')[1] + ' # ' + await rodape(p), 'Pagas / R$ 1.200,00 / 3 de 6 # 📉 Ver dívida | ↩ Desfazer pagamento');
  await p.click('#cpd-ft .cpd-esq');
  eq('"Ver dívida" fecha o detalhe e abre a aba Dívidas', `${await aberto(p, 'm-cp-det')}|${await p.evaluate(() => _page)}`, 'false|dividas');
  await p.evaluate(() => irPagina('contas'));

  // ── 5. Recorrente: as ocorrências ──
  await p.evaluate(() => abrirDetalhePagar('conta:al10'));
  eq('recorrente: título, tipo e regra', (await txt(p, '#cpd-titulo')) + ' # ' + (await info(p)).split(' # ').pop(), 'Aluguel # Tipo / Ocorrência 10 / Mensal · desde 05/01/2026 · sem data para acabar');
  eq('recorrente: resumo (ocorrências dos próximos 12 meses geradas)', await tiles(p),
    'Total / R$ 33.000,00 / 22 ocorrências geradas # Pagas / R$ 13.500,00 / 9 de 22 # Em aberto / R$ 19.500,00 / 13 ocorrências · 1 vencida # Próxima / 05/10/2026 / R$ 1.500,00 · #10');
  eq('recorrente: filtro de vencidas', await txt(p, '#cpd-corpo .cpd-chip'), 'Todas 22 | Em aberto 13 | Pagas 9 | Vencidas 1');
  eq('recorrente: a lista rola até a ocorrência escolhida', await p.evaluate(() => { const l = document.getElementById('cpd-lista'), s = l.querySelector('.cpd-l.sel');
    return l.scrollTop > 0 && s.offsetTop >= l.scrollTop && s.offsetTop + s.offsetHeight <= l.scrollTop + l.clientHeight; }), true);
  await p.click('#cpd-corpo .cpd-chip:nth-child(4)');
  eq('recorrente: só a vencida', (await linhas(p)).join(''), '#10 | Aluguel | 05/10/2026 | R$ 1.500,00 | Vencida ~ venceu há 10 dias');
  await p.evaluate(() => closeM('m-cp-det'));

  // ── 6. Fatura: as compras dela ──
  await p.evaluate(() => abrirDetalhePagar(pagaveis(gs()).find(x => x.tipo === 'fatura' && x.mes === 6).chave));
  eq('fatura: título e cartão', (await txt(p, '#cpd-titulo')) + ' # ' + (await info(p)).split(' # ').slice(4).join(' # '),
    'Fatura Nubank · Julho/2026 # Categoria / Serviços & Financeiro # Cartão / Nubank / competência julho/2026 # Fechamento / 03/07/2026');
  eq('fatura: compras com a parcela de cada uma', await p.evaluate(() => [...document.querySelectorAll('#cpd-corpo .cpd-compra')].map(l => [...l.children]
    .map(c => [...c.childNodes].map(n => n.textContent.trim()).filter(Boolean).join(' ~ ')).join(' | ')).join(' || ')), '1/10 | TV 55" ~ compra em 15/06/2026 · parcela 1 de 10 · total R$ 3.000,00 | R$ 300,00');
  eq('fatura: rodapé', await rodape(p), '💳 Ver fatura no cartão | ✓ Pagar fatura');
  await p.evaluate(() => closeM('m-cp-det'));

  // ── 7. Dívida sem parcelas (estimada), conta única, conta no cartão e conta paga ──
  await p.evaluate(() => abrirDetalhePagar(pagaveis(gs()).find(x => x.tipo === 'divida-est').chave));
  eq('estimada: saldo, parcela mensal e quanto falta', await tiles(p),
    'Saldo devedor / R$ 522,09 / de R$ 586,31 # Parcela mensal / R$ 64,22 # Faltam / 9 meses / até jun/2027 # Próxima / Out/2026 / R$ 64,22');
  eq('estimada: progresso pelo que já foi pago, sem filtros, só "Ver dívida"', `${await txt(p, '#cpd-corpo .cpd-prog span')}|${await p.evaluate(() => document.querySelectorAll('#cpd-corpo .cpd-chip').length)}|${await rodape(p)}`,
    '11% pago · R$ 64,22 de R$ 586,31|0|📉 Ver dívida');
  await p.evaluate(() => abrirDetalhePagar('conta:luz'));
  eq('conta única: sem lista de parcelas', (await txt(p, '#cpd-corpo .cpd-nota')) + ' # ' + (await info(p)).split(' # ').pop() + ' # ' + await rodape(p),
    'Pagamento único: esta conta não é parcelada. # Tipo / Conta única # ✕ Excluir | ✎ Editar | ✓ Pagar');
  await p.evaluate(() => abrirDetalhePagar('conta:nfx'));
  eq('conta no cartão: em qual fatura e o atalho para ela', (await info(p)).split(' # ').slice(2, 4).join(' # ') + ' # ' + await rodape(p),
    'Situação / 💳 No cartão / na fatura de nov/26, que vence 10/11/2026 # No cartão / 💳 Nubank / fatura de novembro/2026 # ✕ Excluir | ✎ Editar | 💳 Ver fatura do cartão');
  await p.evaluate(() => abrirDetalhePagar('conta:net'));
  eq('conta paga: quando, com qual conta e o desfazer', (await info(p)).split(' # ').slice(2, 4).join(' # ') + ' # ' + await rodape(p),
    'Situação / Pago / paga em 08/10/2026 · Itaú # Pago com / 🏦 Itaú # ✕ Excluir | ✎ Editar | ↩ Desfazer pagamento');

  // ── 8. Editar e excluir pelo detalhe ──
  await p.evaluate(() => abrirDetalhePagar('conta:luz'));
  await p.click('#cpd-ft .btn:nth-child(2)');
  eq('editar abre por cima do detalhe', `${await aberto(p, 'm-conta')}|${await aberto(p, 'm-cp-det')}`, 'true|true');
  await p.evaluate(() => { document.getElementById('cp-desc').value = 'Luz (Enel)'; saveConta(); });
  eq('depois de editar, o detalhe mostra a descrição nova', await txt(p, '#cpd-titulo'), 'Luz (Enel)');
  await p.click('#cpd-ft .cpd-esq');
  eq('excluir abre a confirmação por cima', await aberto(p, 'm-del-conta'), true);
  await p.evaluate(() => execDelConta('uma'));
  eq('conta excluída: o detalhe fecha sozinho', `${await aberto(p, 'm-cp-det')}|${await p.evaluate(() => gs().contas.some(c => c.id === 'luz'))}`, 'false|false');

  // ── 9. Outros caminhos: menu ⋯, teclado e cliques que não abrem ──
  const linhaGel = p.locator('#cp-tbody tr.cp-clic', { hasText:'Geladeira (2/4)' }).first();   // a lista abre no mês atual
  await linhaGel.locator('.cp-mais').click();
  eq('clicar no ⋯ não abre o detalhe; o menu tem "Detalhes e parcelas" (o 1º continua sendo "Pagar")', `${await aberto(p, 'm-cp-det')}|${await txt(p, '#cp-acoes-pop .btn')}`, 'false|✓ Pagar | ✎ Editar | 🔎 Detalhes e parcelas | ✕ Excluir');
  await p.locator('#cp-acoes-pop .btn', { hasText:'Detalhes e parcelas' }).click();
  eq('"Detalhes e parcelas" abre o detalhe da parcela', `${await aberto(p, 'm-cp-det')}|${await txt(p, '#cpd-corpo .cpd-qual')}`, 'true|Parcela 2 de 4');
  await p.evaluate(() => closeM('m-cp-det'));
  await linhaGel.locator('.cp-abrir').focus(); await p.keyboard.press('Enter');
  eq('pelo teclado: a descrição é um botão', `${await aberto(p, 'm-cp-det')}|${await txt(p, '#cpd-corpo .cpd-qual')}`, 'true|Parcela 2 de 4');
  await p.evaluate(() => closeM('m-cp-det'));
  const fatLinha = p.locator('#cp-tbody tr.cp-fat-row').filter({ has:p.locator('.cp-ver') }).first();
  await fatLinha.locator('.cp-ver').click();
  eq('na fatura, "▸ compras" continua abrindo as compras na lista (sem o detalhe)', `${await aberto(p, 'm-cp-det')}|${await p.evaluate(() => !!document.querySelector('#cp-tbody .cp-itens-row'))}`, 'false|true');

  // ── celular ──
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => abrirDetalhePagar('divida:emp:ep3')); await p.waitForTimeout(700);   // espera a animação de abertura
  eq('celular: o detalhe cabe na tela e os botões ficam à vista', await p.evaluate(() => { const m = document.querySelector('#m-cp-det .modal').getBoundingClientRect(), f = document.getElementById('cpd-ft').getBoundingClientRect();
    return m.left >= 0 && m.right <= 390 && f.bottom <= window.innerHeight + 1 && document.documentElement.scrollWidth === 390; }), true);

  eq('sem erros de JS', errs.join(' ; '), '');
  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
