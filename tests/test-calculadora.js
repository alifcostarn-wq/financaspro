const { chromium } = require('./_pw.js');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};`;
const DATA = {
  cfg:{sal:5000,si:0,ano:2026,pct:20}, formas:['PIX'], kanban:[], divs:[], orcs:[], contas:[], lancs:[],
  _seeded:true,_bancosSeeded:true,_lancsSeeded:true,_caixaRelinked:true,_orcAnoMigrado:true,
  ccs:[{id:'cc1',nome:'Nubank',band:'Visa',lim:5000,venc:10,fech:3,grad:'',ts:1,faturas:[],gastos:[]}],
  bancos:[{id:'bk',nome:'Conta',banco:'Itaú',tipo:'Conta Corrente',saldoInicial:1000,cor:'',ts:1,movs:[]}],
};
const T=[]; const eq=(n,g,e)=>T.push({n,g:String(g),e:String(e),ok:String(g)===String(e)});

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:1440,height:1000}});
  await ctx.route('**/chart.umd.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:CHART_STUB}));
  await ctx.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.addInitScript(({data})=>{ if(localStorage.getItem('__semeado')) return; localStorage.setItem('__semeado','1');
    localStorage.setItem('financaspro_auth','1');
    localStorage.setItem('fpro_logged_user',JSON.stringify({nome:'A',perfil:'admin',email:'a@b.c'}));
    localStorage.setItem('fpro_v2', JSON.stringify(data)); },{data:DATA});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE,{waitUntil:'load'}); await p.waitForTimeout(400);

  // ── motor de conta ──
  const motor = await p.evaluate(() => {
    const ok = x => { try { return calcAvaliar(x); } catch(e){ return 'ERRO:' + e.message; } };
    return ['120+35,5','10×3','100÷4','200+10%','200−10%','200×10%','50%','(120+80)÷3','−5+10','1,5+1.5',
            '2+3×4','(2+3)×4','10÷0','2+','((2','1,2,3','','100−(20+30)%'].map(x => x + ' → ' + ok(x));
  });
  const esperado = ['120+35,5 → 155.5','10×3 → 30','100÷4 → 25','200+10% → 220','200−10% → 180','200×10% → 20','50% → 0.5',
    '(120+80)÷3 → 66.6666666667','−5+10 → 5','1,5+1.5 → 3','2+3×4 → 14','(2+3)×4 → 20','10÷0 → ERRO:Não dá para dividir por zero',
    '2+ → ERRO:Conta incompleta','((2 → ERRO:Falta fechar o parêntese','1,2,3 → ERRO:Conta inválida',' → ERRO:Digite uma conta',
    '100−(20+30)% → 50'];
  motor.forEach((m, i) => eq('conta: ' + esperado[i].split(' → ')[0], m, esperado[i]));

  // ── tela ──
  const r = await p.evaluate(() => {
    const o={}; const $=i=>document.getElementById(i);
    const vis = id => $(id) && getComputedStyle($(id)).display !== 'none';
    const tec = s => [...s].forEach(k => calcTecla(k));
    const tela = () => $('calc-expr').textContent + '|' + $('calc-prev').textContent;
    const inst = CAMPOS_CALC.map(id => !!($(id) && $(id).closest('.calc-campo') && $(id).closest('.calc-campo').querySelector('.calc-abrir')));
    o.instalado = inst.join(',');

    // lançamento
    openM('m-lanc');
    const btn = $('l-valor').closest('.calc-campo').querySelector('.calc-abrir');
    btn.click();
    o.abriu = vis('calc-pop') + '|' + btn.classList.contains('on') + '|' + (document.activeElement === $('calc-pop'));
    o.vazio = tela() + '|' + $('calc-usar').disabled;
    tec('120+35,5');
    o.soma = tela() + '|' + $('calc-usar').disabled;
    calcUsar();
    o.usou = $('l-valor').value + '|' + vis('calc-pop') + '|' + (document.activeElement === $('l-valor'));

    // reabrir com o valor do campo; operador continua, número recomeça
    btn.click();
    o.reabre = $('calc-expr').textContent;
    tec('÷2');
    o.continua = tela();
    calcTecla('=');
    o.igual = $('calc-fita').textContent + '|' + $('calc-expr').textContent;
    tec('9');
    o.recomeca = $('calc-expr').textContent + '|' + $('calc-fita').textContent;

    // regras do teclado
    calcTecla('C'); tec('5+×'); o.trocaOp = $('calc-expr').textContent;
    calcTecla('C'); tec('1,,'); o.umaVirgula = $('calc-expr').textContent;
    calcTecla('C'); tec(',5'); o.virgulaInicio = $('calc-expr').textContent;
    calcTecla('C'); tec('2('); o.multImplicita = $('calc-expr').textContent;
    calcTecla('C'); tec('2)'); o.fechaSemAbrir = $('calc-expr').textContent;
    calcTecla('C'); tec('(10+5'); o.autoFecha = tela();
    calcTecla('C'); tec('%+'); o.opNoInicio = _calc.expr || '(vazio)';
    calcTecla('C'); tec('−8'); o.negativoInicio = $('calc-expr').textContent;
    calcTecla('C'); tec('12⌫'); o.apagar = $('calc-expr').textContent;
    calcTecla('C'); tec('10−25');
    o.negativo = tela() + '|' + $('calc-usar').disabled;
    const antes = $('l-valor').value; calcUsar();
    o.negativoNaoUsa = ($('l-valor').value === antes) + '|' + vis('calc-pop');
    calcTecla('C'); tec('7÷0'); o.divZero = tela() + '|' + $('calc-usar').disabled;

    // teclado físico
    calcTecla('C');
    const tecla = k => $('calc-pop').dispatchEvent(new KeyboardEvent('keydown', { key:k, bubbles:true, cancelable:true }));
    ['4','*','2','.','5','-','1'].forEach(tecla);
    o.teclado = $('calc-expr').textContent;
    tecla('Backspace'); tecla('+'); tecla('0'); tecla('Enter');
    o.enter = $('l-valor').value + '|' + vis('calc-pop');
    btn.click(); tecla('Escape');
    o.esc = vis('calc-pop') + '|' + (document.activeElement === $('l-valor'));
    // clique no botão de novo fecha (alterna)
    btn.click(); btn.click();
    o.alterna = vis('calc-pop');
    // clique fora fecha
    btn.click();
    $('l-desc').dispatchEvent(new MouseEvent('mousedown', { bubbles:true }));
    o.foraFecha = vis('calc-pop');
    // fechar o modal fecha a calculadora
    btn.click(); closeM('m-lanc');
    o.modalFecha = vis('calc-pop');

    // atalho: digitar + no campo abre com o valor e o operador
    openM('m-lanc'); $('l-valor').value = '100';
    $('l-valor').dispatchEvent(new KeyboardEvent('keydown', { key:'+', bubbles:true, cancelable:true }));
    o.atalho = vis('calc-pop') + '|' + $('calc-expr').textContent;
    tec('50'); calcUsar();
    // salva o lançamento com o valor calculado
    $('l-desc').value = 'Mercado'; $('l-tipo').value = 'Despesa'; updLancCats(); $('l-caixa').value = 'bk';
    saveLanc();
    o.salvo = (gs().lancs.find(l => l.desc === 'Mercado') || {}).valor;

    // outros campos: prévias escutam o valor calculado
    openM('m-conta'); $('cp-venc').value = '2026-10-05';
    abrirCalc('cp-val'); tec('3×49,9'); calcUsar();
    o.conta = $('cp-val').value + '|' + $('cp-preview-body').textContent.includes('149,70');
    closeM('m-conta');
    _ccSel = 'cc1'; openM('m-gasto');
    abrirCalc('g-val'); tec('(80+40)÷2'); calcUsar();
    o.gasto = $('g-val').value + '|' + $('g-preview').textContent.includes('60,00');
    closeM('m-gasto');
    openM('m-pag-fat'); abrirCalc('pf-val'); tec('300−10%'); calcUsar();
    o.fatura = $('pf-val').value + '|' + ($('pf-val').dataset.tocado === '1');
    closeM('m-pag-fat');
    return o;
  });

  eq('botão nos 6 campos de valor', r.instalado, 'true,true,true,true,true,true');
  eq('abre, marca o botão e recebe o foco', r.abriu, 'true|true|true');
  eq('começa vazia, sem usar', r.vazio, '0|Digite a conta|true');
  eq('soma com vírgula', r.soma, '120+35,5|= R$ 155,50|false');
  eq('usa: grava no campo, fecha e volta o foco', r.usou, '155.5|false|true');
  eq('reabre com o valor do campo', r.reabre, '155,5');
  eq('operador continua a conta', r.continua, '155,5÷2|= R$ 77,75');
  eq('= guarda a conta na fita', r.igual, '155,5÷2 =|77,75');
  eq('número depois do = recomeça', r.recomeca, '9|');
  eq('troca de operador', r.trocaOp, '5×');
  eq('uma vírgula por número', r.umaVirgula, '1,');
  eq('vírgula no início vira 0,', r.virgulaInicio, '0,5');
  eq('2( vira 2×(', r.multImplicita, '2×(');
  eq(') só com parêntese aberto', r.fechaSemAbrir, '2');
  eq('parêntese aberto fecha sozinho no resultado', r.autoFecha, '(10+5|= R$ 15,00');
  eq('% e + no início são ignorados', r.opNoInicio, '(vazio)');
  eq('menos no início é sinal', r.negativoInicio, '−8');
  eq('apagar', r.apagar, '1');
  eq('resultado negativo bloqueado', r.negativo, '10−25|O valor não pode ser negativo|true');
  eq('negativo não vai para o campo', r.negativoNaoUsa, 'true|true');
  eq('divisão por zero', r.divZero, '7÷0|Não dá para dividir por zero|true');
  eq('teclado físico', r.teclado, '4×2,5−1');
  eq('Enter usa o valor', r.enter, '10|false');
  eq('Esc fecha e volta ao campo', r.esc, 'false|true');
  eq('botão alterna', r.alterna, false);
  eq('clique fora fecha', r.foraFecha, false);
  eq('fechar o modal fecha a calculadora', r.modalFecha, false);
  eq('digitar + no campo abre a conta', r.atalho, 'true|100+');
  eq('lançamento salvo com o valor calculado', r.salvo, 150);
  eq('conta a pagar: valor e prévia', r.conta, '149.7|true');
  eq('compra no cartão: valor e prévia', r.gasto, '60|true');
  eq('pagamento de fatura: valor marcado como digitado', r.fatura, '270|true');

  // ── celular: vira folha no rodapé, sem passar da largura ──
  await p.setViewportSize({ width:390, height:844 });
  const m = await p.evaluate(() => {
    openM('m-lanc'); abrirCalc('l-valor');
    const pop = document.getElementById('calc-pop'), r = pop.getBoundingClientRect();
    return [pop.classList.contains('folha'), Math.round(r.left), Math.round(r.right), Math.round(r.bottom), document.documentElement.scrollWidth].join('|');
  });
  eq('celular: folha no rodapé', m, 'true|0|390|844|390');
  eq('sem erros de JS', errs.join(' ; '), '');

  let ok=0; T.forEach(t=>{ if(t.ok) ok++; console.log((t.ok?'✓ ':'✗ ')+t.n+(t.ok?'':`  → obtido: ${t.g} | esperado: ${t.e}`)); });
  console.log(`\n${ok}/${T.length} passaram`);
  await b.close();
  process.exit(ok===T.length?0:1);
})();
