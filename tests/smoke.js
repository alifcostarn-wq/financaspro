// Smoke: abre o app com dados de exemplo, passa por todas as páginas e abas, abre todos os modais — sem erro de JS
const { chromium } = require('./_pw.js');
const CHART_STUB = `window.Chart=class Chart{constructor(el,cfg){this.canvas=el;this.config=cfg;}destroy(){}};Chart.defaults={};`;
const base = JSON.parse(JSON.stringify(require('./dados-rel.js')));
base.ccs = base.ccs.concat(JSON.parse(JSON.stringify(require('./dados-cartao.js').ccs)).map(c => ({ ...c, id:'x' + c.id })));
(async () => {
  const srv = await require('./servidor.js')();
  const b = await chromium.launch(); const errs = [];
  for(const vp of [{ width:1440, height:900 }, { width:390, height:844 }]){
    const ctx = await b.newContext({ viewport:vp });
    await ctx.route('**/chart.umd.js', r => r.fulfill({ status:200, contentType:'application/javascript', body:CHART_STUB }));
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await ctx.addInitScript(({ data }) => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s', '1');
      localStorage.setItem('financaspro_auth', '1'); localStorage.setItem('fpro_logged_user', JSON.stringify({ nome:'A', perfil:'admin', email:'a@b.c' }));
      localStorage.setItem('fpro_v2', JSON.stringify(data)); }, { data:base });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${vp.width}: ${e.message}`)); p.on('dialog', d => d.dismiss());
    await p.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
    await p.goto(srv.url, { waitUntil:'load' }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const paginas = [...document.querySelectorAll('.nav-btn[onclick*="go("]')].map(b => (b.getAttribute('onclick').match(/go\('(\w+)'/) || [])[1]).filter(Boolean);
      const visitadas = [];
      for(const pg of [...new Set(paginas)]){ go(pg, document.querySelector(`.nav-btn[onclick*="'${pg}'"]`)); visitadas.push(pg); }
      go('rel', document.querySelector(`.nav-btn[onclick*="'rel'"]`));
      document.querySelectorAll('#page-rel > .toggle-row .tgl').forEach(t => t.click());
      go('cartoes', document.querySelector(`.nav-btn[onclick*="'cartoes'"]`));
      document.querySelectorAll('#page-cartoes .tgl').forEach(t => t.click());
      document.querySelectorAll('#cc-grid .cc-visual').forEach(c => c.click());
      const modais = [...document.querySelectorAll('.overlay[id^="m-"]')].map(m => m.id);
      modais.forEach(id => { try { openM(id); closeM(id); } catch(e){ throw new Error(id + ': ' + e.message); } });
      return visitadas.join(',') + ' | ' + modais.length + ' modais';
    });
    console.log(vp.width, r);
    await ctx.close();
  }
  await b.close(); srv.fechar();
  console.log(errs.length ? 'ERROS:\n' + errs.join('\n') : 'SMOKE OK — nenhum erro de JS');
  process.exit(errs.length ? 1 : 0);
})();
