// Roda todos os testes da pasta e mostra o resumo: node tests/rodar.js  (ou: node tests/rodar.js cartao)
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const filtro = process.argv[2] || '';
const arqs = ['smoke.js', ...fs.readdirSync(__dirname).filter(f => /^test-.*\.js$/.test(f)).sort()].filter(f => f.includes(filtro));
let total = 0, ok = 0; const falhas = [];
for(const f of arqs){
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding:'utf8', timeout:600000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+)\/(\d+) (?:verificações )?passaram/g);
  const ult = m ? m[m.length - 1].match(/(\d+)\/(\d+)/) : null;
  if(ult){ ok += +ult[1]; total += +ult[2]; }
  const passou = r.status === 0;
  console.log(`${passou ? '✓' : '✗'} ${f.padEnd(26)} ${ult ? ult[0] : (passou ? 'ok' : 'falhou')}`);
  if(!passou) falhas.push(f + '\n' + out.split('\n').filter(l => l.startsWith('✗') || /Error|ERRO/.test(l)).slice(0, 8).join('\n'));
}
console.log(`\n${ok}/${total} verificações passaram em ${arqs.length} arquivos`);
if(falhas.length){ console.log('\nFalhas:\n' + falhas.join('\n\n')); process.exit(1); }
