const { chromium } = require('./_pw.js');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = {
  cfg:{sal:5000,si:0,ano:2026,pct:20}, formas:['PIX'], kanban:[], divs:[], lancs:[], orcs:[], contas:[],
  _seeded:true,_bancosSeeded:true,_lancsSeeded:true,_caixaRelinked:true,_orcAnoMigrado:true,
  ccs:[{id:'cc1',nome:'Nubank',band:'Master',lim:3000,venc:10,fech:3,grad:'',ts:1,faturas:[],
          gastos:[{id:'g1',data:'2026-01-05',val:100,desc:'Compra antiga',cat:'Lazer',subcat:'',parc:1,ts:1}]},
       {id:'cc2',nome:'Inter',band:'Visa',lim:2000,venc:20,fech:12,grad:'',ts:2,faturas:[],gastos:[]}],
  bancos:[{id:'bk',nome:'Conta',banco:'Itaú',tipo:'Conta Corrente',saldoInicial:1000,cor:'',ts:1,movs:[]}],
};
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:1440,height:1200}});
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1');
    localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',dl=>dl.accept());
  await p.goto(FILE,{waitUntil:'load'}); await p.waitForTimeout(400);

  const r = await p.evaluate(() => {
    const o={}; const $=i=>document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const hj = today(), mais = n => addDias(hj, n);
    const conta = desc => gs().contas.find(c => c.desc === desc);
    const espelhos = (d, ccId) => (d.ccs.find(c=>c.id===ccId).gastos||[]).filter(g=>g.refContaId);
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));

    // ── modal: categorias do plano, forma de pagamento ──
    openM('m-conta');
    o.catsDoPlano = $('cp-cat').options.length === allCats('Despesa').length;
    o.formaPadrao = $('cp-forma').value + '|' + vis('cp-st-row') + '|' + vis('cp-cc-wrap');
    setCpForma('cartao');
    o.formaCartao = vis('cp-st-row') + '|' + vis('cp-cc-wrap') + '|' + vis('cp-caixa-wrap') + '|' + $('cp-cc').options.length;
    $('cp-desc').value='Netflix'; $('cp-val').value='55.90'; $('cp-venc').value=mais(5);
    $('cp-cat').value='Lazer'; updCpSubcat(); updCpPreview();
    const cc1 = gs().ccs[0];
    const comp = competenciaGasto({data:mais(5)}, cc1);
    o.previewFatura = $('cp-preview-body').textContent.includes(`fatura de ${MESES[comp.mes]}/${comp.ano}`);
    o.aviso = $('cp-cc-aviso').textContent.includes('limite livre');
    const limAntes = limiteUsado(cc1);
    const fatAntes = getFaturaMes(cc1, comp.mes, comp.ano);
    saveConta();
    let d = gs(); let c = conta('Netflix');
    o.fechou = !vis('m-conta');
    o.ccId = c.ccId;
    o.status = statusConta(c) + '|' + contaEmAberto(c);
    o.semLanc = d.lancs.filter(l=>l.refContaId===c.id).length;
    const g = espelhos(d,'cc1')[0];
    o.espelho = [g.id==='cp'+c.id, g.data===c.venc, g.val, g.parc, g.cat, g.origem].join('|');
    o.fatura = +(getFaturaMes(d.ccs[0], comp.mes, comp.ano) - fatAntes).toFixed(2);
    o.limFuturo = +(limiteUsado(d.ccs[0]) - limAntes).toFixed(2);            // cobrança futura: 0
    o.compromissoConta = compromissosFuturos(d).filter(x=>x.tipo==='conta' && x.refId===c.id).length;
    o.compromissoFatura = compromissosFuturos(d).some(x=>x.tipo!=='conta' && x.valor >= 55.9);
    // pílula do menu: a conta no cartão não conta sozinha (vem na fatura); a fatura antiga, vencida, conta
    updSbSaldo();
    o.pill = $('pill-contas').textContent;

    // ── cobrança já feita consome limite ──
    openM('m-conta'); setCpForma('cartao');
    $('cp-desc').value='Academia'; $('cp-val').value='120'; $('cp-venc').value=mais(-2); $('cp-cat').value='Esporte';
    saveConta();
    d = gs();
    o.limPassado = +(limiteUsado(d.ccs[0]) - limAntes).toFixed(2);            // 120
    o.vencidaNao = statusConta(conta('Academia'));                            // No cartão (não "Vencida")

    // ── recorrente no cartão ──
    openM('m-conta'); setCpTipo('recorrente'); setCpForma('cartao'); $('cp-cc').value='cc2';
    $('cp-desc').value='Spotify'; $('cp-val').value='21.90'; $('cp-venc').value=mais(3); $('cp-cat').value='Lazer';
    updCpPreview();
    o.prevRec = $('cp-preview-body').textContent.includes('cada cobrança entra na fatura');
    saveConta();
    d = gs();
    const serie = d.contas.filter(x=>x.desc==='Spotify');
    o.recTodas = serie.length > 10 && serie.every(x=>x.ccId==='cc2');
    o.recEspelhos = espelhos(d,'cc2').length === serie.length;
    o.recLimite = limiteUsado(d.ccs[1]);                                       // tudo futuro: 0
    // materialização recria ocorrências apagadas e os espelhos acompanham (sem órfãos)
    const sid = serie[0].serieId;
    const removidas = d.contas.filter(x => x.serieId===sid && x.serieNum > 10).length;
    d.contas = d.contas.filter(x => !(x.serieId===sid && x.serieNum > 10)); ss(d);
    const criadas = materializarRecorrencias() === removidas && removidas > 0;
    d = gs();
    const serie2 = d.contas.filter(x=>x.serieId===sid);
    o.rematerializa = criadas + '|' + (espelhos(d,'cc2').length === serie2.length) + '|' + serie2.filter(x=>x.serieNum>10).every(x=>x.ccId==='cc2');
    // editar "esta e as próximas" propaga valor aos espelhos
    editConta(serie2.find(x=>x.serieNum===2).id);
    o.editForma = $('cp-forma').value + '|' + $('cp-cc').value;
    setCpEscopo('futuras'); $('cp-val').value='25'; saveConta();
    d = gs();
    const esp2 = espelhos(d,'cc2');
    const porConta = Object.fromEntries(esp2.map(x=>[x.refContaId,x.val]));
    const s3 = d.contas.filter(x=>x.serieId===sid);
    o.futurasVal = s3.filter(x=>x.serieNum>=2).every(x=>porConta[x.id]===25) + '|' + (porConta[s3.find(x=>x.serieNum===1).id]);

    // ── parcelada no cartão: uma parcela por fatura ──
    openM('m-conta'); setCpTipo('parcelada'); setCpForma('cartao'); $('cp-cc').value='cc1';
    $('cp-desc').value='Curso'; $('cp-val').value='300'; $('cp-parc').value='3'; $('cp-venc').value=mais(20); $('cp-cat').value='Educação';
    updCpPreview();
    o.prevParc = $('cp-preview-body').textContent.includes('uma parcela por fatura');
    saveConta();
    d = gs();
    const parc = espelhos(d,'cc1').filter(x=>x.desc.startsWith('Curso'));
    const comps = parc.map(x=>{ const k=competenciaGasto(x,d.ccs[0]); return k.ano*12+k.mes; }).sort();
    o.parcelas = parc.length + '|' + parc.map(x=>x.val).join(',') + '|' + (comps[1]-comps[0]) + ',' + (comps[2]-comps[1]);

    // ── listagem ──
    $('cp-fil-mes').value=''; $('cp-fil-ano').value='';
    renderContas();
    const linhaNet = [...document.querySelectorAll('#cp-tbody tr')].find(tr=>tr.textContent.includes('Netflix'));
    o.badge = linhaNet.querySelector('.badge.bdg-purple')?.textContent;
    o.botaoFatura = !!linhaNet.querySelector('button[onclick^="abrirFaturaDaConta"]') + '|' + !linhaNet.querySelector('button[onclick^="pagarConta"]');
    o.colCartao = linhaNet.textContent.includes('💳 Nubank') && linhaNet.textContent.includes('fatura ');
    o.kpiSub = $('ck-pend-sub').textContent.includes('de cartão');
    // em aberto = só as faturas não pagas (as contas no cartão já estão dentro delas)
    let fatAbertas = 0;
    gs().ccs.forEach(cc => { for(let abs = 2024*12; abs < 2030*12; abs++){ const mm = abs % 12, aa = Math.floor(abs / 12);
      if(!faturaPaga(cc, mm, aa)) fatAbertas += getFaturaMes(cc, mm, aa); } });
    o.kpiPend = $('ck-pend').textContent === fmtR(+fatAbertas.toFixed(2)) && fatAbertas > 0;
    $('cp-fil-st').value='No cartão'; renderContas();
    o.filtro = document.querySelectorAll('#cp-tbody tr').length === gs().contas.length;
    $('cp-fil-st').value=''; renderContas();

    // ── "Pagar" leva à fatura ──
    const net = conta('Netflix');
    pagarConta(net.id);
    o.irFatura = _page + '|' + _ccView + '|' + $('cc-mes').value + '|' + (_ccSel==='cc1');
    o.fatDetalhe = [...document.querySelectorAll('#cc-fatdet-tbody tr')].some(tr=>tr.textContent.includes('Netflix') && tr.textContent.includes('Conta a pagar'));
    o.pagarModal = vis('m-pagar');                                           // não abre pagamento de conta
    // na aba de compras, editar a compra espelho abre a conta
    editGasto('cc1','cp'+net.id);
    o.editGasto = vis('m-conta') + '|' + ($('cp-edit-id').value===net.id) + '|' + !vis('m-gasto');
    closeM('m-conta');

    // ── fatura paga: a conta mostra como paga ──
    d = gs();
    const fN = faturaDaConta(net, d);
    d.ccs[0].faturas.push({id:'fp',mes:fN.mes,ano:fN.ano,valor:999,status:'Pago',dataPg:hj,gerarLanc:false});
    ss(d);
    go('contas', document.querySelector('.nav-btn[onclick*="\'contas\'"]'));
    $('cp-fil-mes').value=''; $('cp-fil-ano').value=''; renderContas();
    const l2 = [...document.querySelectorAll('#cp-tbody tr')].find(tr=>tr.textContent.includes('Netflix'));
    o.fatPaga = l2.querySelector('.badge.bdg-green')?.textContent + '|' + l2.textContent.includes('paga ✓');

    // ── trocar para conta/dinheiro: espelho some e vira obrigação de caixa ──
    editConta(net.id); setCpForma('caixa'); saveConta();
    d = gs(); c = conta('Netflix');
    o.paraCaixa = (c.ccId||'') + '|' + statusConta(c) + '|' + espelhos(d,'cc1').some(x=>x.refContaId===c.id)
      + '|' + compromissosFuturos(d).some(x=>x.tipo==='conta' && x.refId===c.id);

    // ── conta paga pelo caixa trocada para o cartão: desfaz o lançamento ──
    openM('m-conta'); $('cp-desc').value='Luz'; $('cp-val').value='180'; $('cp-venc').value=mais(-1); $('cp-cat').value='Moradia';
    $('cp-st').value='Pago'; toggleCpCaixa(); $('cp-caixa').value='bk'; saveConta();
    d = gs(); c = conta('Luz');
    o.luzPaga = statusConta(c) + '|' + d.lancs.filter(l=>l.refContaId===c.id).length;
    editConta(c.id);
    o.editCaixaForma = $('cp-forma').value;
    setCpForma('cartao'); $('cp-cc').value='cc1'; saveConta();
    d = gs(); c = conta('Luz');
    o.luzCartao = statusConta(c) + '|' + d.lancs.filter(l=>l.refContaId===c.id).length + '|' + (c.dataPg||'') + '|'
      + d.bancos[0].movs.length + '|' + espelhos(d,'cc1').some(x=>x.refContaId===c.id);

    // ── plano de contas: renomear propaga para a conta e o espelho, sem contar em dobro ──
    const usoAntes = mapaUsoCategorias(gs())['Despesa|Moradia'];
    o.usoSemDobro = JSON.stringify(usoAntes.porFonte);
    o.renomeia = planoRenomearCategoria('Despesa','Moradia','Casa');
    d = gs(); c = conta('Luz');
    o.renomeado = c.cat + '|' + espelhos(d,'cc1').find(x=>x.refContaId===c.id).cat;

    // ── excluir a compra espelho pelo cartão = excluir a conta ──
    delGasto('cc1','cp'+c.id);
    o.delGastoModal = vis('m-del-conta') + '|' + ($('del-conta-id').value===c.id);
    execDelConta('uma');
    d = gs();
    o.delConta = !!conta('Luz') + '|' + espelhos(d,'cc1').some(x=>x.refContaId===c.id);

    // ── encerrar recorrência remove futuras e espelhos ──
    encerrarRecorrencia(sid, true);
    d = gs();
    const rest = d.contas.filter(x=>x.serieId===sid);
    o.encerrar = (rest.length < s3.length) + '|' + (espelhos(d,'cc2').length === rest.length);

    // ── validação: cartão sem escolha ──
    openM('m-conta'); setCpForma('cartao'); $('cp-cc').innerHTML='';
    $('cp-desc').value='X'; $('cp-val').value='10'; $('cp-venc').value=hj; saveConta();
    o.validacao = vis('cp-err') + '|' + $('cp-err').textContent.includes('cartão');
    closeM('m-conta');

    // ── excluir o cartão desvincula as contas ──
    const academia = conta('Academia');
    delCC('cc1');
    d = gs(); const ac2 = d.contas.find(x=>x.id===academia.id);
    o.delCC = (ac2.ccId||'') + '|' + statusConta(ac2) + '|' + contaEmAberto(ac2);
    return o;
  });

  eq('categorias do modal vêm do plano', r.catsDoPlano, true);
  eq('forma padrão = caixa, status visível', r.formaPadrao, 'caixa|true|false');
  eq('forma cartão esconde status/caixa, mostra cartões', r.formaCartao, 'false|true|false|2');
  eq('prévia indica a fatura', r.previewFatura, true);
  eq('aviso mostra limite livre', r.aviso, true);
  eq('salvou e fechou', r.fechou, true);
  eq('conta guarda o cartão', r.ccId, 'cc1');
  eq('status "No cartão" e fora do em aberto', r.status, 'No cartão|false');
  eq('não gera lançamento', r.semLanc, 0);
  eq('compra espelho na fatura', r.espelho, 'true|true|55.9|1|Lazer|conta');
  eq('fatura soma a conta', r.fatura, 55.9);
  eq('cobrança futura não usa limite', r.limFuturo, 0);
  eq('não duplica em compromissos como conta', r.compromissoConta, 0);
  eq('entra em compromissos pela fatura', r.compromissoFatura, true);
  eq('pílula: só a fatura vencida, a conta no cartão não soma de novo', r.pill, '1');
  eq('cobrança passada usa limite', r.limPassado, 120);
  eq('conta no cartão nunca fica "Vencida"', r.vencidaNao, 'No cartão');
  eq('prévia recorrente no cartão', r.prevRec, true);
  eq('recorrência toda no cartão', r.recTodas, true);
  eq('um espelho por ocorrência', r.recEspelhos, true);
  eq('assinatura futura não usa limite', r.recLimite, 0);
  eq('rematerialização mantém espelhos', r.rematerializa, 'true|true|true');
  eq('edição carrega forma e cartão', r.editForma, 'cartao|cc2');
  eq('"esta e as próximas" atualiza espelhos', r.futurasVal, 'true|21.9');
  eq('prévia parcelada no cartão', r.prevParc, true);
  eq('parcelas em faturas seguidas', r.parcelas, '3|100,100,100|1,1');
  eq('badge na listagem', r.badge, '💳 No cartão');
  eq('botão Fatura no lugar de Pagar', r.botaoFatura, 'true|true');
  eq('coluna mostra cartão e fatura', r.colCartao, true);
  eq('KPI mostra o que está no cartão', r.kpiSub, true);
  eq('em aberto = faturas não pagas (sem contar a conta duas vezes)', r.kpiPend, true);
  eq('filtro "No cartão"', r.filtro, true);
  eq('pagar leva à fatura certa', r.irFatura.split('|').slice(0,2).join('|') + '|' + r.irFatura.split('|')[3], 'cartoes|fatura|true');
  eq('fatura detalhada marca a conta', r.fatDetalhe, true);
  eq('não abre pagamento de conta', r.pagarModal, false);
  eq('editar compra espelho abre a conta', r.editGasto, 'true|true|true');
  eq('fatura paga reflete na conta', r.fatPaga, '💳 Fatura paga|true');
  eq('voltar para caixa', r.paraCaixa, '|Pendente|false|true');
  eq('conta paga pelo caixa', r.luzPaga, 'Pago|1');
  eq('edição de conta comum = caixa', r.editCaixaForma, 'caixa');
  eq('paga → cartão desfaz lançamento e mov', r.luzCartao, 'No cartão|0||0|true');
  eq('uso da categoria sem dobro', r.usoSemDobro, '{"conta":1}');
  eq('renomear ok', r.renomeia, '');
  eq('renomear propaga ao espelho', r.renomeado, 'Casa|Casa');
  eq('excluir compra espelho abre exclusão da conta', r.delGastoModal, 'true|true');
  eq('excluir conta remove espelho', r.delConta, 'false|false');
  eq('encerrar recorrência limpa espelhos', r.encerrar, 'true|true');
  eq('valida cartão obrigatório', r.validacao, 'true|true');
  eq('excluir cartão desvincula contas', r.delCC, '|Vencida|true');
  eq('sem erros de JS', errs.join(' ; '), '');

  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close();
  process.exit(ok===T.length?0:1);
})();
