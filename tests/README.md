# Testes do FinançasPro

Testes de ponta a ponta que abrem o `index.html` num navegador (Playwright + Chromium), com dados de
exemplo, e conferem cálculos e telas.

```bash
node tests/rodar.js            # todos
node tests/rodar.js cartao     # só os que têm "cartao" no nome
node tests/test-fatura-fechada.js
```

- Precisa do Playwright (`npm i -D playwright` ou o instalado globalmente; veja `_pw.js`).
- `servidor.js` serve o app por HTTP local — no `file://` o Chromium às vezes recarrega a página com o
  armazenamento vazio.
- `dados-*.js` são os cenários de exemplo; os testes congelam a data ("hoje") para os resultados não
  mudarem com o tempo.
- A pasta não vai para o site publicado (`.vercelignore`).
