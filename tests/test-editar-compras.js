// Editar compras dentro das faturas em aberto (Fatura Detalhada e Contas a Pagar) — hoje = 2026-10-27
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = require('./dados-cartao.js');
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport:{ width:1440, height:1000 } });
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1'); localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
  await p.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
  await p.goto(srv.url,{waitUntil:'load'}); await p.waitForTimeout(400);

  // abre a fatura de novembro do Nubank na aba "Fatura Detalhada"
  const abrirFatura = (mes) => p.evaluate(mes => {
    go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]'));
    _ccSel = 'cc1'; verFatura(mes, 2026);
  }, mes);
  const linhas = () => p.evaluate(() => [...document.querySelectorAll('#cc-fatdet-tbody tr')].map(tr => tr.cells[1] ? tr.cells[1].textContent.trim() : tr.textContent.trim()));
  const menuDe = (desc) => p.evaluate(desc => {
    const tr = [...document.querySelectorAll('#cc-fatdet-tbody tr')].find(t => t.textContent.includes(desc));
    return tr ? [...tr.querySelectorAll('.cp-acoes-lista button')].map(x => x.textContent).join(',') : 'sem linha';
  }, desc);
  const acao = async (desc, rotulo) => {
    await p.locator(`#cc-fatdet-tbody tr:has-text("${desc}") .cp-mais`).click();
    await p.locator(`#cp-acoes-pop button:has-text("${rotulo}")`).click();
  };
  const g = (id) => p.evaluate(id => { const x = gs().ccs[0].gastos.find(g => g.id === id); return x ? JSON.stringify({ val:x.val, data:x.data, fatura:x.fatura || '' }) : 'excluída'; }, id);

  await abrirFatura(10);
  const r1 = await p.evaluate(() => {
    const $ = i => document.getElementById(i);
    const trs = [...document.querySelectorAll('#cc-fatdet-tbody tr')];
    return [trs.length, trs.every(t => t.classList.contains('cc-fatdet-ed') && t.tabIndex === 0 && t.querySelector('td.cp-acoes .cp-mais')),
      _ccView, getComputedStyle($('cc-fatura-view')).display, $('cc-fatdet-acts').textContent.includes('+ Adicionar compra')].join('|');
  });
  eq('fatura aberta: 3 compras editáveis', r1, '3|true|fatura|block|true');
  eq('menu de uma compra', await menuDe('Farmácia'), '✎ Editar compra,↪ Passar para a próxima fatura (Dez/26),✕ Excluir compra');

  // clicar na linha abre a edição com o contexto da fatura
  await p.locator('#cc-fatdet-tbody tr:has-text("Mercado") td:nth-child(2)').click();
  const r2 = await p.evaluate(() => { const $ = i => document.getElementById(i); const vis = id => getComputedStyle($(id)).display !== 'none';
    return [vis('m-gasto'), $('m-gasto-titulo').textContent, $('g-edit-ctx').textContent, $('g-val').value, vis('g-excluir'), $('btn-salvar-gasto').textContent].join('|'); });
  eq('clique na linha abre a edição', r2, 'true|Editar compra|Hoje na fatura de Novembro/2026|90|true|Salvar Alterações');
  await p.fill('#g-val', '120');
  await p.click('#btn-salvar-gasto');
  const r3 = await p.evaluate(() => { const $ = i => document.getElementById(i);
    return [getComputedStyle($('m-gasto')).display, $('cc-fatdet-total').textContent, _ccView, $('cc-mes').value, getComputedStyle($('cc-fatura-view')).display].join('|'); });
  eq('salvou: total atualizado e continua na fatura', r3, 'none|R$ 520,00|fatura|10|block');

  // mudar a data avisa para onde a compra vai
  await p.locator('#cc-fatdet-tbody tr:has-text("Mercado") td:nth-child(1)').click();
  await p.fill('#g-data', '2026-11-05'); await p.evaluate(() => updGastoPreview());
  const aviso = await p.evaluate(() => document.querySelector('#g-preview .g-dest-nota.muda')?.textContent);
  eq('aviso: sai desta fatura', aviso, '↪ Ao salvar, a compra sai da fatura de Novembro/2026 e vai para a de Dezembro/2026.');
  await p.click('#btn-salvar-gasto');
  eq('mudou de fatura', (await p.evaluate(() => document.getElementById('cc-fatdet-total').textContent)) + '|' + (await linhas()).some(t => t.includes('Mercado')), 'R$ 400,00|false');

  // passar para a próxima fatura, com desfazer
  await acao('Farmácia', 'Passar para a próxima fatura');
  const r4 = await p.evaluate(() => { const av = document.getElementById('cc-fatdet-aviso');
    return [gs().ccs[0].gastos.find(g => g.id === 'g2').fatura, document.querySelectorAll('#cc-fatdet-tbody tr').length, getComputedStyle(av).display, av.querySelector('span').textContent.trim()].join('|'); });
  eq('passou para a próxima e avisa', r4, '2026-12|1|flex|↪ “Farmácia (depois do fechamento)” foi para a fatura de Dezembro/2026.');
  await p.click('#cc-fatdet-aviso button:has-text("Desfazer")');
  eq('desfazer volta a compra', (await g('g2')) + '|' + (await p.evaluate(() => document.querySelectorAll('#cc-fatdet-tbody tr').length + '|' + getComputedStyle(document.getElementById('cc-fatdet-aviso')).display)),
    '{"val":200,"data":"2026-10-04","fatura":""}|2|none');
  // passa de novo e volta para a automática pela fatura de dezembro
  await acao('Farmácia', 'Passar para a próxima fatura');
  await abrirFatura(11);
  const r5 = await p.evaluate(() => { const tr = [...document.querySelectorAll('#cc-fatdet-tbody tr')].find(t => t.textContent.includes('Farmácia'));
    return [tr.cells[1].textContent.includes('à mão'), getComputedStyle(document.getElementById('cc-fatdet-aviso')).display].join('|'); });
  eq('na fatura de destino: marcada "à mão" e com o aviso', r5, 'true|flex');
  eq('menu com voltar à automática', await menuDe('Farmácia'), '✎ Editar compra,↪ Passar para a próxima fatura (Jan/27),↺ Voltar para a fatura automática (Nov/26),✕ Excluir compra');
  await acao('Farmácia', 'Voltar para a fatura automática');
  eq('voltou para a automática', (await g('g2')) + '|' + (await p.evaluate(() => document.getElementById('cc-fatdet-aviso').querySelector('span').textContent.trim())),
    '{"val":200,"data":"2026-10-04","fatura":""}|↪ “Farmácia (depois do fechamento)” voltou para a fatura automática de Novembro/2026.');

  // compra parcelada: "passar" adia todas as parcelas um mês — e a fatura vista continua com uma parcela dela
  await abrirFatura(10);
  eq('parcelada: menu adia as parcelas', await menuDe('Fone'), '✎ Editar compra,↪ Adiar as parcelas um mês (Nov/26 a Jan/27),✕ Excluir compra');
  await acao('Fone', 'Adiar as parcelas');
  const r5b = await p.evaluate(() => { const tr = [...document.querySelectorAll('#cc-fatdet-tbody tr')].find(t => t.textContent.includes('Fone'));
    return [gs().ccs[0].gastos.find(g => g.id === 'g3').fatura, tr.cells[3].textContent, document.getElementById('cc-fatdet-aviso').querySelector('span').textContent.trim()].join('|'); });
  eq('parcelada: adiada, aqui vira a 1/3', r5b, '2026-11|1/3|↪ “Fone 3x” agora vai da fatura de Novembro/2026 até a de Janeiro/2027.');
  eq('parcelada: menu com voltar às automáticas', await menuDe('Fone'), '✎ Editar compra,↪ Adiar as parcelas um mês (Dez/26 a Fev/27),↺ Voltar às faturas automáticas (Out/26 a Dez/26),✕ Excluir compra');
  await acao('Fone', 'Voltar às faturas automáticas');
  eq('parcelada: voltou às automáticas', (await g('g3')) + '|' + (await p.evaluate(() => document.getElementById('cc-fatdet-aviso').querySelector('span').textContent.trim())),
    '{"val":600,"data":"2026-09-20","fatura":""}|↪ “Fone 3x” voltou às faturas automáticas: de Outubro/2026 até Dezembro/2026.');
  await p.click('#cc-fatdet-aviso button:has-text("Desfazer")');
  eq('parcelada: desfazer o voltar', await g('g3'), '{"val":600,"data":"2026-09-20","fatura":"2026-11"}');
  await p.evaluate(() => moverCompraFatura('cc1', 'g3', 'auto'));

  // compra parcelada com parcela em fatura já paga: a edição avisa
  await p.evaluate(() => { const d = gs(); d.ccs[0].faturas.push({ id:'f10', mes:9, ano:2026, valor:300, status:'Pago', dataPg:'2026-10-09', gerarLanc:false }); ss(d); });
  await abrirFatura(10);
  await p.evaluate(() => editGasto('cc1', 'g3'));
  const r6 = await p.evaluate(() => [document.getElementById('g-edit-ctx').textContent, [...document.querySelectorAll('#g-preview .g-dest-nota.aviso')].map(x => x.textContent).join(' ')].join(' / '));
  eq('parcelada: contexto e um aviso só da fatura paga', r6, 'Hoje: 3x, da fatura de Outubro/2026 até a de Dezembro/2026 / ⚠️ Esta compra tem parcela em fatura já paga (Out/26): mudar valor, data ou parcelas também muda o que aparece nela — o pagamento registrado continua o mesmo.');
  await p.evaluate(() => closeM('m-gasto'));
  // levar para uma fatura já paga: avisa que entra nela e de onde sai
  await p.evaluate(() => editGasto('cc1', 'g2'));
  await p.selectOption('#g-fatura', '2026-10');
  const r6b = await p.evaluate(() => [...document.querySelectorAll('#g-preview .g-dest-nota')].map(x => x.textContent).join(' '));
  eq('levar para fatura paga: avisos', r6b, '✋ Fatura escolhida à mão — pela data, a compra iria para a de Novembro/2026. ⚠️ Esta fatura já foi paga (R$ 300,00 em 09/10/2026): a compra entra nela, mas o pagamento registrado continua o mesmo. ↪ Ao salvar, a compra sai da fatura de Novembro/2026 e vai para a de Outubro/2026.');
  await p.evaluate(() => closeM('m-gasto'));

  // fatura paga: travada, com desfazer pagamento
  await abrirFatura(9);
  const r7 = await p.evaluate(() => { const trs = [...document.querySelectorAll('#cc-fatdet-tbody tr')];
    trs[0].click();
    return [trs.length, trs.every(t => !t.querySelector('.cp-acoes') && t.querySelector('td.cc-trava') && !t.classList.contains('cc-fatdet-ed')),
      document.getElementById('cc-fatdet-acts').textContent.trim(), getComputedStyle(document.getElementById('m-gasto')).display].join('|'); });
  eq('fatura paga: sem edição, com desfazer pagamento', r7, '2|true|🔒 Para editar as compras, desfaça o pagamento↩ Desfazer pagamento|none');
  await p.click('#cc-fatdet-acts button:has-text("Desfazer pagamento")');
  eq('desfeito o pagamento, volta a ser editável', await p.evaluate(() => document.querySelectorAll('#cc-fatdet-tbody tr.cc-fatdet-ed').length), 2);
  await p.evaluate(() => { const d = gs(); d.ccs[0].faturas = d.ccs[0].faturas.filter(f => f.id !== 'f10'); ss(d); });

  // excluir pelo menu e pelo modal
  await abrirFatura(10);
  await acao('Farmácia', 'Excluir compra');
  eq('excluir pelo menu', await g('g2'), 'excluída');
  await abrirFatura(11);
  await p.locator('#cc-fatdet-tbody tr:has-text("Mercado") td:nth-child(2)').click();
  await p.click('#g-excluir');
  eq('excluir pelo modal', (await g('g4')) + '|' + (await p.evaluate(() => getComputedStyle(document.getElementById('m-gasto')).display)), 'excluída|none');
  eq('modal de compra nova não mostra excluir', await p.evaluate(() => { openM('m-gasto'); const v = getComputedStyle(document.getElementById('g-excluir')).display; closeM('m-gasto'); return v; }), 'none');

  // adicionar compra direto numa fatura
  await abrirFatura(10);
  await p.click('#cc-fatdet-acts button:has-text("Adicionar compra")');
  const r8 = await p.evaluate(() => { const $ = i => document.getElementById(i); return [$('m-gasto-titulo').textContent, $('g-fatura').value, $('btn-salvar-gasto').textContent].join('|'); });
  eq('adicionar na fatura aberta (automática)', r8, 'Nova compra · fatura de Novembro/2026||Registrar na fatura de Nov/26');
  await p.fill('#g-desc', 'Pão'); await p.fill('#g-val', '15'); await p.click('#btn-salvar-gasto');
  eq('compra nova entrou na fatura', (await linhas()).some(t => t.includes('Pão')) + '|' + (await p.evaluate(() => gs().ccs[0].gastos.find(g => g.desc === 'Pão').fatura === undefined)), 'true|true');
  await abrirFatura(11);
  await p.click('#cc-fatdet-acts button:has-text("Adicionar compra")');
  const r9 = await p.evaluate(() => { const $ = i => document.getElementById(i); return [$('m-gasto-titulo').textContent, $('g-fatura').value, $('g-preview').textContent.includes('Fatura escolhida à mão')].join('|'); });
  eq('adicionar numa fatura futura: escolhida à mão', r9, 'Nova compra · fatura de Dezembro/2026|2026-12|true');
  await p.fill('#g-desc', 'Livro'); await p.fill('#g-val', '50'); await p.click('#btn-salvar-gasto');
  eq('compra entrou na fatura escolhida', (await linhas()).some(t => t.includes('Livro')) + '|' + (await p.evaluate(() => gs().ccs[0].gastos.find(g => g.desc === 'Livro').fatura)), 'true|2026-12');

  // conta a pagar no cartão: edita e exclui pela conta, sem "passar para a próxima"
  await p.evaluate(() => { openM('m-conta'); setCpForma('cartao'); const $ = i => document.getElementById(i);
    $('cp-cc').value = 'cc1'; $('cp-desc').value = 'Netflix'; $('cp-val').value = '39.9'; $('cp-venc').value = '2026-10-28'; $('cp-cat').value = 'Lazer'; saveConta(); });
  await abrirFatura(10);
  eq('conta no cartão: menu próprio', await menuDe('Netflix'), '✎ Editar conta a pagar,✕ Excluir conta a pagar');
  await p.locator('#cc-fatdet-tbody tr:has-text("Netflix") td:nth-child(2)').click();
  eq('clique na conta abre a conta a pagar', await p.evaluate(() => getComputedStyle(document.getElementById('m-conta')).display + '|' + getComputedStyle(document.getElementById('m-gasto')).display), 'flex|none');
  await p.evaluate(() => closeM('m-conta'));

  // teclado: Enter na linha abre a edição
  await p.locator('#cc-fatdet-tbody tr:has-text("Fone")').focus();
  await p.keyboard.press('Enter');
  eq('Enter na linha edita', await p.evaluate(() => getComputedStyle(document.getElementById('m-gasto')).display + '|' + document.getElementById('g-edit-id').value), 'flex|g3');
  await p.evaluate(() => closeM('m-gasto'));

  // Contas a Pagar: ✎ nas compras da fatura em aberto
  const r10 = await p.evaluate(() => {
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    document.getElementById('cp-fil-ano').value = '2026'; document.getElementById('cp-fil-mes').value = '10'; renderContas();
    const x = pagaveis().find(i => i.tipo === 'fatura' && i.cc.id === 'cc1' && i.mes === 10);
    cpAlternarFatura(x.chave);
    const itens = document.querySelectorAll('#cp-tbody tr.cp-itens-row .cp-item:not(.cab)').length;
    const bts = [...document.querySelectorAll('#cp-tbody tr.cp-itens-row .cp-item-ed')];
    const alvo = bts.find(b => b.getAttribute('onclick').includes("'g1'") || b.getAttribute('onclick').includes("'g3'"));
    alvo.click();
    const aberto = getComputedStyle(document.getElementById('m-gasto')).display + '|' + document.getElementById('g-edit-id').value;
    closeM('m-gasto');
    // fatura paga (setembro): sem ✎
    document.getElementById('cp-fil-mes').value = '8'; renderContas();
    const s = pagaveis().find(i => i.tipo === 'fatura' && i.cc.id === 'cc1' && i.mes === 8);
    cpAlternarFatura(s.chave);
    const paga = document.querySelectorAll('#cp-tbody tr.cp-itens-row .cp-item-ed').length;
    return [itens, bts.length, aberto, paga].join('|');
  });
  eq('contas a pagar: ✎ em cada compra da fatura aberta, nenhum na paga', r10, '3|3|flex|g3|0');

  // celular
  await p.setViewportSize({ width:390, height:844 });
  await abrirFatura(10);
  const m = await p.evaluate(() => { const r = document.querySelector('#cc-fatura-view .tbl-wrap').getBoundingClientRect();
    editGasto('cc1', 'g3'); const mr = document.querySelector('#m-gasto .modal').getBoundingClientRect(); closeM('m-gasto');
    return [Math.round(r.right) <= 390, mr.right <= 390, document.documentElement.scrollWidth].join('|'); });
  eq('celular: tabela e modal cabem', m, 'true|true|390');
  const m2 = await p.evaluate(() => {
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    document.getElementById('cp-fil-ano').value = '2026'; document.getElementById('cp-fil-mes').value = '10'; renderContas();
    const x = pagaveis().find(i => i.tipo === 'fatura' && i.cc.id === 'cc1' && i.mes === 10);
    if(!document.querySelector('#cp-tbody tr.cp-itens-row')) cpAlternarFatura(x.chave);
    const vw = document.documentElement.clientWidth;
    const visivel = () => [...document.querySelectorAll('#cp-tbody .cp-item-ed')].every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= vw; });
    const wrap = document.querySelector('#cp-tbody').closest('.tbl-wrap');
    const antes = visivel(); wrap.scrollLeft = 300; const depois = visivel(); wrap.scrollLeft = 0;
    const ano = getComputedStyle(document.querySelector('#cp-tbody .cp-item:not(.cab) .ano')).display;
    return [wrap.scrollWidth > wrap.clientWidth, antes, depois, ano].join('|');
  });
  eq('celular: ✎ das compras à vista mesmo rolando a tabela', m2, 'true|true|true|none');
  eq('sem erros de JS', errs.join(' ; '), '');

  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
