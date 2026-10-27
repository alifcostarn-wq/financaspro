// Cartão: fatura fechada (à mão ou pelo dia), ciclo da fatura e destino da compra — hoje = 2026-10-27
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

  const r = await p.evaluate(() => {
    const o = {}; const $ = i => document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const cc = id => gs().ccs.find(c => c.id === id);
    const txt = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
    const comp = (ccId, gId) => { const c = cc(ccId); const k = competenciaGasto(c.gastos.find(g => g.id === gId), c); return `${MESES3[k.mes]}/${k.ano}`; };

    // ── informação: fechada ou aberta, pelo dia do cartão ──
    const iN = infoFatura(cc('cc1'), 10, 2026), iO = infoFatura(cc('cc1'), 9, 2026);
    o.infoNov = [iN.rotulo, iN.ate, iN.fechada, iN.manual, iN.venc, iN.status].join('|');
    o.infoOut = [iO.ate, iO.fechada, iO.status].join('|');
    const k1 = cicloCartao(cc('cc1')), k2 = cicloCartao(cc('cc2')), k3 = cicloCartao(cc('cc3'));
    o.ciclo1 = [k1.anterior.rotulo, k1.aberta.rotulo, k1.melhorDia, k1.faturaMelhor.rotulo, k1.prazo].join('|');
    o.ciclo2 = [k2.anterior.rotulo, k2.aberta.rotulo, k2.aberta.ate, k2.melhorDia, k2.faturaMelhor.rotulo, k2.prazo].join('|');
    o.ciclo3 = [k3.aberta.rotulo, k3.aberta.ate || 'sem', k3.melhorDia || 'sem'].join('|');

    // ── tela: painel do ciclo ──
    go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]'));
    selectCC('cc1');
    o.semAlerta = !document.querySelector('#cc-ciclo .cc-ciclo-alerta');
    o.painel = [txt($('cc-ct-fechada').querySelector('.cc-ct-lbl')), txt($('cc-ct-fechada').querySelector('.cc-ct-tit')),
      txt($('cc-ct-fechada').querySelector('.cc-ct-val')), txt($('cc-ct-fechada').querySelector('.cc-ct-sub'))].join(' / ');
    o.painelAberta = [txt($('cc-ct-aberta').querySelector('.cc-ct-tit')), txt($('cc-ct-aberta').querySelector('.cc-ct-val')), txt($('cc-ct-aberta').querySelector('.cc-ct-sub'))].join(' / ');
    o.painelMelhor = txt($('cc-ct-melhor'));
    o.botoesFechada = [...$('cc-ct-fechada').querySelectorAll('button')].map(b => b.textContent.trim()).join(',');
    selectCC('cc3');
    o.painelSemDia = txt($('cc-ct-aberta').querySelector('.cc-ct-sub')) + ' / ' + txt($('cc-ct-melhor').querySelector('.cc-ct-sub')) + ' / ' + !!$('cc-ct-melhor').querySelector('button[onclick^="editCC"]');
    selectCC('cc1');
    $('cc-mes').value = '9'; renderCartoes();
    o.visual = txt(document.querySelector('.cc-visual[data-cc="cc1"] .cc-fatura-label'));
    $('cc-mes').value = '10'; renderCartoes();
    o.fatdet = txt($('cc-fatdet-sub')) + ' / ' + txt($('cc-fatdet-acts'));

    // ── fechar a fatura aberta à mão ──
    $('cc-ct-aberta').querySelector('button[onclick^="abrirFechamento"]').click();
    o.modal = vis('m-fech-fat') + '|' + txt($('ff-titulo')) + '|' + $('ff-ate').value + '|' + txt($('ff-sub'));
    o.atalhos = [...$('ff-atalhos').querySelectorAll('button')].map(b => b.textContent).join(',');
    o.prevOntem = txt($('ff-prev'));
    $('ff-ate').value = '2026-10-25'; updFechPreview();
    o.prev25 = txt($('ff-prev'));
    // validações
    const tenta = v => { $('ff-ate').value = v; updFechPreview(); return txt($('ff-prev')); };
    o.valAntes = tenta('2026-10-02');
    o.valVenc = tenta('2026-11-10');
    $('ff-ate').value = '2026-10-02'; salvarFechamento();
    o.naoSalva = vis('m-fech-fat') + '|' + vis('ff-err') + '|' + (cc('cc1').fechamentos === undefined);
    $('ff-ate').value = '2026-10-25'; salvarFechamento();
    const f = cc('cc1').fechamentos;
    o.salvou = !vis('m-fech-fat') + '|' + JSON.stringify(f);
    o.depois = [comp('cc1', 'g4'), getFaturaMes(cc('cc1'), 10, 2026), getFaturaMes(cc('cc1'), 11, 2026), statusFatura(cc('cc1'), 10, 2026)].join('|');
    const k1b = cicloCartao(cc('cc1'));
    o.cicloDepois = [k1b.anterior.rotulo, k1b.anterior.manual, k1b.aberta.rotulo, k1b.melhorDia].join('|');
    o.painelDepois = txt($('cc-ct-fechada').querySelector('.cc-ct-lbl')) + ' / ' + txt($('cc-ct-fechada').querySelector('.cc-ct-sub')) + ' / ' + txt($('cc-ct-aberta').querySelector('.cc-ct-tit'));
    o.reabrirNoPainel = !!$('cc-ct-fechada').querySelector('button[onclick^="reabrirFatura"]');
    o.alertaAtraso = txt($('cc-ciclo').querySelector('.cc-ciclo-alerta')) + '|' + !!$('cc-ciclo').querySelector('.cc-ciclo-alerta button[onclick="pagarFatura(\'cc1\',9,2026)"]');
    const linhaNov = [...document.querySelectorAll('#cc-fat-tbody tr')].find(tr => tr.cells[0].textContent.startsWith('Novembro'));
    o.tabNov = txt(linhaNov.cells[1]) + '|' + txt(linhaNov.cells[5]) + '|' + txt(linhaNov.cells[3]);
    o.menuNov = [...linhaNov.querySelectorAll('.cp-acoes-lista button')].map(b => b.textContent).join(',');
    o.contasPagar = (() => { const x = pagaveis().find(i => i.tipo === 'fatura' && i.cc.id === 'cc1' && i.mes === 10); return x.fech + '|' + x.fechManual; })();
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    $('cp-fil-mes').value = '10'; renderContas();
    o.contasLinha = txt([...document.querySelectorAll('#cp-tbody > tr')].find(tr => tr.textContent.includes('Fatura Nubank · Nov/26')).cells[1]);
    go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]')); selectCC('cc1');
    // ajustar: a data não pode invadir a fatura seguinte
    abrirFechamento('cc1', 11, 2026);
    o.ajustaDez = txt($('ff-titulo')) + '|' + $('ff-ate').value;
    o.valSeguinte = tenta('2026-10-20');
    closeM('m-fech-fat');
    // ajustar a fechada à mão: título, data atual e botão de voltar ao automático
    abrirFechamento('cc1', 10, 2026);
    o.ajustaNov = txt($('ff-titulo')) + '|' + $('ff-ate').value + '|' + vis('ff-auto') + '|' + txt($('ff-auto'));
    // reabrir pelo modal
    reabrirFatura();
    o.reabriu = (cc('cc1').fechamentos === undefined) + '|' + comp('cc1', 'g4') + '|' + !vis('m-fech-fat');
    // salvar a mesma data do dia do cartão não guarda nada (continua automático)
    abrirFechamento('cc1', 10, 2026); $('ff-ate').value = '2026-11-03'; salvarFechamento();
    o.igualAuto = cc('cc1').fechamentos === undefined;

    // ── cartão sem dia de fechamento: fecha só à mão ──
    abrirFechamento('cc3', 10, 2026); $('ff-ate').value = '2026-11-05'; salvarFechamento();
    const c3 = cc('cc3');
    const kk = d => { const k = competenciaGasto({ data:d }, c3); return `${MESES3[k.mes]}/${k.ano}`; };
    o.semDia = [kk('2026-10-27'), kk('2026-11-03'), kk('2026-11-05'), kk('2026-11-06'), statusFatura(c3, 10, 2026)].join(',');
    o.semDiaValida = (() => { abrirFechamento('cc3', 9, 2026); return tenta('2026-10-25'); })();
    closeM('m-fech-fat');

    // ── destino da compra no modal ──
    selectCC('cc1'); openM('m-gasto');
    const box = () => txt($('g-preview'));
    $('g-data').value = '2026-10-27'; $('g-val').value = '90'; $('g-parc').value = '1'; updGastoPreview();
    o.destHoje = box();
    o.destDica = txt($('g-data-fat')) + '|' + txt($('btn-salvar-gasto'));
    o.destOpcoes = [...$('g-fatura').options].map(x => `${x.value}=${x.textContent}`).join(',');
    $('g-data').value = '2026-10-02'; updGastoPreview();
    o.destFechada = box();
    $('g-data').value = '2026-09-01'; updGastoPreview();
    o.destPaga = box();
    $('g-data').value = '2026-10-27'; $('g-parc').value = '3'; updGastoPreview();
    o.destParc = box().includes('3x de R$ 30,00 · da fatura de Novembro/2026 até a de Janeiro/2027');
    $('g-parc').value = '1'; $('g-val').value = '2500'; updGastoPreview();
    o.destLimite = $('g-preview').querySelector('.g-dest-lim').className + '|' + txt($('g-preview').querySelector('.g-dest-lim'));
    $('g-val').value = '90'; updGastoPreview();
    // escolher a fatura à mão
    $('g-fatura').value = '2026-12'; $('g-fatura').dispatchEvent(new Event('change'));
    o.escolha = box().includes('Dezembro/2026') + '|' + box().includes('pela data, a compra iria para a de Novembro/2026') + '|' + txt($('btn-salvar-gasto'));
    $('g-desc').value = 'Presente'; saveGasto();
    const pres = cc('cc1').gastos.find(g => g.desc === 'Presente');
    o.salvaEscolha = pres.fatura + '|' + comp('cc1', pres.id) + '|' + getFaturaMes(cc('cc1'), 11, 2026);
    o.comprasMarca = txt([...document.querySelectorAll('#cc-gas-tbody tr')].find(tr => tr.textContent.includes('Presente')).cells[4]);
    editGasto('cc1', pres.id);
    o.editEscolha = $('g-fatura').value + '|' + txt($('btn-salvar-gasto'));
    $('g-fatura').value = ''; $('g-fatura').dispatchEvent(new Event('change')); saveGasto();
    o.voltaAuto = (cc('cc1').gastos.find(g => g.id === pres.id).fatura === undefined) + '|' + comp('cc1', pres.id);
    // escolher a mesma da automática não grava nada
    openM('m-gasto'); $('g-data').value = '2026-10-27'; $('g-val').value = '10'; $('g-desc').value = 'Chiclete'; updGastoPreview();
    $('g-fatura').value = '2026-11'; $('g-fatura').dispatchEvent(new Event('change')); saveGasto();
    o.mesmaAuto = cc('cc1').gastos.find(g => g.desc === 'Chiclete').fatura === undefined;
    // sem data
    openM('m-gasto'); $('g-data').value = ''; updGastoPreview();
    o.semData = box() + '|' + txt($('btn-salvar-gasto'));
    closeM('m-gasto');

    // ── conta a pagar no cartão mostra se a fatura está aberta ou fechada ──
    openM('m-conta'); setCpForma('cartao'); $('cp-cc').value = 'cc1'; $('cp-venc').value = '2026-10-27'; $('cp-val').value = '50'; updCpPreview();
    o.conta = txt($('cp-cc-aviso'));
    $('cp-venc').value = '2026-10-02'; updCpPreview();
    o.contaFechada = txt($('cp-cc-aviso')).includes('🔒 já fechada');
    closeM('m-conta');
    return o;
  });
  eq('nov: aberta até 03/11', r.infoNov, 'Novembro/2026|2026-11-03|false|false|2026-11-10|Aberta');
  eq('out: fechada (e vencida)', r.infoOut, '2026-10-03|true|Vencida');
  eq('ciclo Nubank: fechada, aberta, melhor dia', r.ciclo1, 'Outubro/2026|Novembro/2026|2026-11-04|Dezembro/2026|36');
  eq('ciclo Inter (fecha no mês anterior)', r.ciclo2, 'Outubro/2026|Novembro/2026|2026-10-28|2026-10-29|Dezembro/2026|37');
  eq('ciclo sem dia de fechamento', r.ciclo3, 'Outubro/2026|sem|sem');
  eq('sem alerta quando a única vencida é a fechada', r.semAlerta, true);
  eq('painel: fatura fechada', r.painel, '⚠ Fatura fechada · vencida / Outubro/2026 / R$ 300,00 / Fechou em 03/10/2026 · vence 10/10/2026 (venceu há 17 dias)');
  eq('painel: fatura aberta', r.painelAberta, 'Novembro/2026 / R$ 490,00 até agora / Fecha em 03/11/2026 (em 7 dias) · vence 10/11/2026');
  eq('painel: melhor dia de compra', r.painelMelhor, '⭐ Melhor dia de compra 04/11/2026 · em 8 dias Compras a partir desse dia entram na fatura de Dezembro/2026, que vence 10/12/2026 — até 36 dias para pagar.');
  eq('painel: pagar e ver a fechada', r.botoesFechada, '✓ Pagar,👁 Ver compras');
  eq('cartão sem dia de fechamento', r.painelSemDia, 'Sem dia de fechamento: feche à mão quando o banco avisar · vence 15/10/2026 / Cadastre o dia de fechamento do cartão para saber o melhor dia de compra. / true');
  eq('cartão mostra a situação com ícone', r.visual, 'Out/26 · ⚠ Vencida');
  eq('fatura detalhada: fechamento e botões', r.fatdet, 'Fecha em 03/11/2026 · Vence em 10/11/2026 · 3 item(ns) / + Adicionar compra🔒 Fechar fatura');
  eq('modal: fechar até ontem', r.modal, 'true|🔒 Fechar fatura|2026-10-26|Nubank · fatura de Novembro/2026 · vence 10/11/2026');
  eq('atalhos de data', r.atalhos, 'Até ontem (26/10),Até hoje (27/10),Dia do cartão (03/11)');
  eq('prévia: até ontem', r.prevOntem, 'Ficam nesta fatura as compras feitas até 26/10/2026: R$ 490,00 (3 itens). A partir de 27/10/2026, as compras vão para a fatura de Dezembro/2026 (vence 10/12/2026). 🔒 A fatura fica fechada.');
  eq('prévia: compra que muda de fatura', r.prev25, 'Ficam nesta fatura as compras feitas até 25/10/2026: R$ 400,00 (2 itens). A partir de 26/10/2026, as compras vão para a fatura de Dezembro/2026 (vence 10/12/2026). 🔒 A fatura fica fechada. ↪ 1 compra já lançada muda de fatura: Mercado (26/10/2026, R$ 90,00) → Dezembro/2026');
  eq('valida: depois da fatura anterior', r.valAntes, '⚠️ A fatura de Outubro/2026 vai até 03/10/2026: escolha um dia depois disso.');
  eq('valida: antes do vencimento', r.valVenc, '⚠️ O fechamento precisa ser antes do vencimento (10/11/2026).');
  eq('data inválida não salva', r.naoSalva, 'true|true|true');
  eq('fechou e guardou', r.salvou, 'true|{"2026-11":{"ate":"2026-10-25","em":"2026-10-27"}}');
  eq('compra de 26/10 foi para dezembro', r.depois, 'Dez/2026|400|290|Fechada');
  eq('ciclo depois de fechar', r.cicloDepois, 'Novembro/2026|true|Dezembro/2026|2026-12-04');
  eq('painel depois de fechar', r.painelDepois, '🔒 Fatura fechada · a pagar / Fechada à mão em 27/10/2026 · compras até 25/10/2026 · vence 10/11/2026 (em 14 dias) / Dezembro/2026');
  eq('reabrir no painel', r.reabrirNoPainel, true);
  eq('a vencida mais antiga continua à vista', r.alertaAtraso, '⚠️ 1 fatura mais antiga vencida sem pagamento: Outubro/2026 (R$ 300,00) ✓ Pagar|true');
  eq('faturas do ano: marca "à mão"', r.tabNov, '25/10/2026 à mão|🔒 Fechada|R$ 400,00');
  eq('menu da fatura fechada à mão', r.menuNov, '👁 Ver compras,✓ Pagar fatura,📅 Ajustar fechamento,↺ Voltar ao fechamento automático');
  eq('contas a pagar: fechamento à mão', r.contasPagar, '2026-10-25|true');
  eq('contas a pagar: linha da fatura', r.contasLinha.includes('fechada em 25/10/2026 (à mão)'), true);
  eq('a seguinte vira a aberta: fechar até ontem', r.ajustaDez, '🔒 Fechar fatura|2026-10-26');
  eq('valida: não invade a fatura anterior', r.valSeguinte, '⚠️ A fatura de Novembro/2026 vai até 25/10/2026: escolha um dia depois disso.');
  eq('ajustar a fechada à mão', r.ajustaNov, '📅 Ajustar fechamento|2026-10-25|true|↺ Voltar ao dia 3 do cartão');
  eq('reabrir volta ao automático', r.reabriu, 'true|Nov/2026|true');
  eq('mesma data do cartão = automático', r.igualAuto, true);
  eq('sem dia: fecha à mão e as compras seguem a data', r.semDia, 'Out/2026,Nov/2026,Nov/2026,Dez/2026,Sem movimento');
  eq('sem dia: não fecha depois do vencimento', r.semDiaValida, '⚠️ O fechamento precisa ser antes do vencimento (15/10/2026).');
  eq('destino: compra de hoje', r.destHoje, '💳 Esta compra vai para a fatura de Novembro/2026 aberta Fecha em 03/11/2026 · vence 10/11/2026 À vista: R$ 90,00 ℹ️ A fatura de Outubro/2026 já fechou em 03/10/2026: compras depois disso entram na de Novembro/2026. Limite livre depois desta compra: R$ 1.920,00');
  eq('destino: dica na data e no botão', r.destDica, '💳 fatura de Nov/26 · aberta|Registrar na fatura de Nov/26');
  eq('destino: faturas para escolher', r.destOpcoes, '=Automática — Novembro/2026,2026-10=Outubro/2026 · fechada,2026-11=Novembro/2026 · aberta,2026-12=Dezembro/2026 · próxima,2027-01=Janeiro/2027 · próxima');
  eq('destino: compra antes do fechamento cai na fechada', r.destFechada.includes('Outubro/2026 🔒 fechada') && r.destFechada.includes('a compra foi feita até o dia do fechamento'), true);
  eq('destino: fatura já paga avisa', r.destPaga.includes('Setembro/2026 ✓ paga') && r.destPaga.includes('já foi paga (R$ 150,00 em 09/09/2026)'), true);
  eq('destino: parcelas em faturas', r.destParc, true);
  eq('destino: passa do limite', r.destLimite, 'g-dest-lim estoura|Limite livre depois desta compra: -R$ 490,00 — passa do limite do cartão');
  eq('escolher outra fatura', r.escolha, 'true|true|Registrar na fatura de Dez/26');
  eq('salva a fatura escolhida', r.salvaEscolha, '2026-12|Dez/2026|290');
  eq('compras marca a escolhida', r.comprasMarca, 'Dez/26 à mão');
  eq('editar carrega a escolhida', r.editEscolha, '2026-12|Salvar Alterações');
  eq('voltar à automática', r.voltaAuto, 'true|Nov/2026');
  eq('escolher a automática não grava', r.mesmaAuto, true);
  eq('sem data: pede a data', r.semData, 'Informe a data da compra para ver em qual fatura ela entra.|Registrar Gasto');
  eq('conta no cartão: fatura aberta', r.conta.includes('fatura de Novembro/2026 (aberta, fecha 03/11/2026 · vence 10/11/2026)'), true);
  eq('conta no cartão: fatura fechada', r.contaFechada, true);

  // ── celular ──
  await p.setViewportSize({ width:390, height:844 });
  const m = await p.evaluate(() => {
    go('cartoes', document.querySelector('.nav-btn[onclick*="\'cartoes\'"]')); selectCC('cc1');
    const cols = getComputedStyle(document.querySelector('.cc-ciclo-grid')).gridTemplateColumns.split(' ').length;
    abrirFechamento('cc1', 10, 2026);
    const mr = document.querySelector('#m-fech-fat .modal').getBoundingClientRect();
    const ok = mr.left >= 0 && mr.right <= innerWidth;
    closeM('m-fech-fat');
    openM('m-gasto'); const gr = document.getElementById('g-preview').getBoundingClientRect(); closeM('m-gasto');
    return [cols, ok, gr.right <= innerWidth, document.documentElement.scrollWidth].join('|');
  });
  eq('celular: painel em coluna, modais cabem', m, '1|true|true|390');
  eq('sem erros de JS', errs.join(' ; '), '');

  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close(); srv.fechar();
  process.exit(ok===T.length?0:1);
})();
