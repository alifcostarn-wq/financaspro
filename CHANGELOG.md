# ChangeLog — FinançasPro

Todas as alterações relevantes do sistema são registradas neste arquivo.

---

## [2026-09-23] Calculadora nos campos de valor

### 🎯 O que foi pedido

Na hora de fazer um lançamento, ter a opção de uma **calculadora**.

### ✨ Implementado

- **Botão 🧮 dentro do campo Valor** do lançamento. Abre uma calculadora; o resultado vai direto
  para o campo com **✓ Usar valor** (ou Enter), já arredondado em centavos.
- Também nos outros campos de valor em R$: **conta a pagar**, **registrar pagamento**,
  **compra no cartão**, **pagamento de fatura** e **movimentação bancária**. As prévias desses
  modais (fatura em que a compra cai, juros/desconto do pagamento, parcelas) se atualizam com o
  valor calculado.
- **Contas:** soma, subtração, multiplicação, divisão, parênteses e **porcentagem** como nas
  calculadoras de mesa — `200 + 10%` = 220, `200 − 10%` = 180, `200 × 10%` = 20. Aceita vírgula
  ou ponto como decimal. Exemplo: dividir o almoço — `(85,90 + 64) ÷ 3` = R$ 49,97.
- **Resultado ao vivo** enquanto digita; **=** fecha a conta e guarda o que foi feito na linha de
  cima. Depois do =, um número novo começa outra conta e um operador continua a partir do
  resultado.
- **Abre com o valor que já está no campo**, pronto para continuar a conta.
- **Atalho:** digitar **+**, **\*** ou **/** direto no campo Valor abre a calculadora com o valor
  e a operação.
- **Teclado físico:** números, + − * / ( ) % e vírgula/ponto; **Enter** usa o valor, **Backspace**
  apaga, **Delete** limpa e **Esc** fecha.
- **Proteções:** não deixa usar resultado negativo nem dividir por zero, avisando na tela; a conta
  é calculada sem executar texto como código.
- **Posição:** no computador abre embaixo do campo ou **ao lado do modal**, sem cobrir o
  formulário; no celular vira um painel no rodapé com teclas grandes.
- Fecha ao clicar fora, no ✕, com Esc ou ao fechar o modal. Funciona nos temas claro e escuro.

### 🧪 Testes

- **`test-calculadora.js` — 52 verificações:** 18 contas conferidas (porcentagem, parênteses,
  precedência, vírgula/ponto, erros), regras do teclado da tela, teclado físico, Enter/Esc,
  abrir/fechar, atalho no campo, lançamento salvo com o valor calculado, prévias de conta a pagar
  e compra no cartão, pagamento de fatura e o painel no celular.
- Suítes existentes seguem passando — **646 verificações** no total.

### ⚠️ Impacto nos dados existentes

Nenhum. A calculadora só preenche o campo; o lançamento continua sendo salvo como antes.

---

## [2026-09-23] Relatório por categoria: análise mês a mês

### 🎯 O que foi pedido

Melhorar o relatório **Por Categoria** e colocar opções de analisar **os meses separados** —
antes ele mostrava só o ano inteiro.

### 🐛 O que estava errado

- Só existia a visão do **ano inteiro**: não dava para ver um mês, um trimestre ou comparar períodos.
- Mostrava apenas **despesas**, sem subcategorias e sem o que puxou cada valor.
- A **cor de cada categoria mudava conforme a posição** no ranking (a 1ª era sempre verde, a 2ª
  sempre azul…): a mesma categoria trocava de cor quando mudava de lugar.
- Os valores do eixo apareciam como "R$2.000" (sem espaço).
- No celular, a barra de abas dos Relatórios (Visão Anual, Por Categoria…) deixava a página mais
  larga que a tela, com rolagem lateral. Isso já acontecia antes e foi corrigido junto.

### ✨ Implementado

- **Escolha do período:** botões **Ano · Jan · Fev · … · Dez** (um clique por mês), setas **‹ ›**
  para andar mês a mês — inclusive para o ano anterior — e **Outros períodos**: 1º a 4º trimestre,
  1º e 2º semestre e últimos 3, 6 ou 12 meses. Meses sem lançamento ficam apagados.
- **Comparação:** com o **período anterior** (ex.: julho × junho) ou com o **mesmo período do ano
  passado** (julho/2026 × julho/2025), ou sem comparação.
- **Receitas e investimentos** além de despesas, e opção **Lançamentos + cartão**: cada compra do
  cartão entra na categoria dela, na fatura em que cai, e o pagamento da fatura sai da conta (senão
  a mesma despesa contaria duas vezes).
- **Abrir subcategorias:** clicar numa categoria (no gráfico, na lista ou na tabela) mostra a tela
  inteira por subcategoria — ex.: Transporte → Combustível × Manutenção. "✕ limpar" volta.
- **Indicadores do período:** total com variação, média mensal (ou por dia, quando é um mês),
  maior categoria com % do total, **maior alta** e **maior queda** em relação à comparação, número
  de lançamentos e ticket médio.
- **Comparativo por categoria:** barras do período ao lado das do período comparado, com o valor
  escrito na ponta e a variação no tooltip.
- **Participação no período:** ranking com valor, % e variação (▲ ▼) de cada categoria.
- **Evolução mês a mês:** colunas empilhadas das 5 maiores categorias do ano + "Outras", com os
  meses fora do período em tom mais claro. **Clicar num mês** abre a análise daquele mês.
- **Tabela mês a mês:** categoria × mês com total, média e %, tom mais forte no mês de maior valor
  de cada linha e a coluna do período destacada. Clicar no mês ou na categoria detalha.
- **Maiores lançamentos do período:** os 10 que mais pesaram, com categoria › subcategoria e a
  marca 💳 nas compras de cartão.
- Respeita o seletor **Previsto / Realizado** do topo dos Relatórios.

### 🎨 Gráficos

- **Cor segue a categoria**, não a posição: as 5 categorias com mais gasto no ano têm cor fixa
  enquanto você troca de mês.
- Cores **validadas para daltonismo** nos dois temas; "Outras" em cinza neutro e a comparação em
  cinza, para o período atual se destacar.
- Um eixo só em cada gráfico; a tabela mês a mês traz os números exatos de tudo que está nos
  gráficos.
- No celular, os meses rolam de lado, o mês escolhido fica centralizado e nada passa da largura
  da tela.

### 🧪 Testes

- **`test-rel-cat.js` — 55 verificações:** períodos (mês, trimestre, semestre, móvel, virada do
  ano), comparações, totais e variações conferidos à mão, Previsto × Realizado, lançamentos
  cancelados, modo cartão sem contar a fatura em dobro, subcategorias, cliques no mês e na
  categoria, receitas, eixo único e cores estáveis.
- Suítes existentes seguem passando — **594 verificações** no total.

### ⚠️ Impacto nos dados existentes

Nenhum. É só leitura: nada é gravado ou alterado.

---

## [2026-09-23] Plano de contas editável e conta a pagar no cartão de crédito

### 🎯 O que foi pedido

1. Criar em **Configurações** as opções de criar, editar e gerenciar o **plano de contas**
   (categorias e subcategorias do sistema).
2. Ao criar uma **conta a pagar**, poder **atrelar a despesa a um cartão de crédito**.

### 🐛 O que estava errado

- As categorias eram **fixas no código**: não havia como criar, renomear ou excluir nenhuma.
- Cada tela tinha **sua própria lista**: o modal de Contas a Pagar tinha as categorias escritas à
  mão; o extrato bancário usava listas separadas ("Freelance", "Aluguel"…) que não existiam no
  resto do sistema. Uma movimentação lançada no banco caía em categoria que o DRE e o orçamento não
  conheciam.
- Categorias antigas (ex.: "Assinaturas", "Viagens" de compras de cartão) ficavam **invisíveis**:
  tinham registros, mas não apareciam em nenhuma lista para corrigir.
- Conta a pagar só podia ser paga **pelo caixa**. Uma assinatura cobrada no cartão ou era lançada
  duas vezes (na conta e no cartão), ou ficava fora da fatura.

### ✨ Implementado — Plano de Contas (Configurações)

- **Novo cartão "Plano de Contas"** com abas **Despesas / Receitas / Investimentos** (com a
  contagem de cada uma), busca por categoria ou subcategoria e resumo de uso.
- **Categorias:** criar (com a classe **Essencial / Escolha / Financeiro / Outros**, que define a
  regra 50/30/20 e o relatório de Despesas Pessoais), **renomear** (duplo clique ou ✎), mudar a
  classe, **reordenar** (↑ ↓) e **excluir**.
- **Subcategorias:** criar, renomear e excluir direto nos chips, cada um com a quantidade de
  registros que o usa.
- **Renomear propaga para tudo:** lançamentos, contas a pagar, metas do orçamento, compras de
  cartão, pagamentos de fatura e movimentações bancárias. Renomear para um nome que já existe
  **mescla** as duas categorias (as subcategorias se juntam e metas repetidas do mesmo mês são
  somadas, sem duplicar).
- **Excluir com segurança:** o sistema mostra quantos registros usam a categoria e onde
  (ex.: "6 lançamentos, 2 contas a pagar") e pede o **destino** dos registros antes de apagar —
  com a opção de levar as subcategorias junto. Nada fica órfão.
- **Categorias do sistema protegidas:** as que o sistema usa sozinho (pagamento de fatura, parcela
  de dívida, importação OFX, despesa sem categoria) aparecem com o selo **⚙ sistema**; ao
  renomear, o sistema passa a usar o novo nome; para excluir, é preciso escolher outra categoria
  para assumir a função.
- **"Em uso, mas fora do plano":** lista categorias antigas ou importadas que têm registros mas não
  estão no plano, com **Adicionar ao plano** ou **Mover** os registros para uma categoria existente.
- **Restaurar padrão** volta ao plano original (os registros não são apagados).
- **Uma lista só no sistema inteiro:** Contas a Pagar, lançamentos, cartões, orçamento e o
  **extrato bancário** passam a usar o plano. A movimentação bancária ganhou **subcategoria** e
  separa despesas de investimentos.

### ✨ Implementado — Conta a pagar no cartão de crédito

- **Forma de pagamento** no modal da conta: **🏦 Conta / dinheiro** (como antes) ou
  **💳 Cartão de crédito**, com a escolha do cartão.
- **Prévia da fatura:** ao escolher o cartão, o sistema mostra em qual fatura a cobrança entra
  (respeitando o dia de fechamento), quando ela vence e o **limite livre** — em vermelho se a
  cobrança passar dele.
- Funciona para conta **única, parcelada** (uma parcela por fatura) e **recorrente** (cada
  cobrança entra na fatura do mês em que vence; as próximas ocorrências já nascem no cartão).
- A conta vira uma **compra na fatura** do cartão, marcada com **📄 Conta a pagar**: soma na
  fatura, no limite, no orçamento por categoria (com "incluir cartão") e nos relatórios.
- **Sem contar em dobro:** a conta no cartão **não gera lançamento** nem sai do caixa sozinha —
  o dinheiro sai no **pagamento da fatura**, como qualquer compra no cartão. Ela também sai dos
  alertas de vencimento, do contador do menu, das contas pendentes do painel e dos compromissos
  futuros (onde entra pela fatura).
- **Na lista de Contas a Pagar:** status **💳 No cartão** (ou **💳 Fatura paga** quando a fatura
  daquele mês foi quitada), o cartão e a fatura na coluna de pagamento e o botão **💳 Fatura**,
  que abre a aba Cartões direto na fatura certa. Novo filtro de status "No cartão" e o KPI
  **Em Aberto** mostra à parte quanto está no cartão.
- **Limite:** cobrança futura (ex.: os próximos meses de uma assinatura) **só ocupa o limite
  quando é cobrada**.
- **Tudo sincronizado:** editar a conta (valor, data, categoria, cartão — inclusive "esta e as
  próximas") atualiza a compra na fatura; trocar de volta para caixa remove a compra; trocar uma
  conta **já paga** para o cartão desfaz o lançamento e a movimentação bancária. Na aba Cartões,
  editar ou excluir a compra marcada abre a própria conta. Encerrar a recorrência ou excluir a
  conta limpa as compras; excluir o cartão avisa e devolve as contas para pagamento pelo caixa.

### 🧪 Testes

- **`test-plano.js` — 50 verificações:** criar, duplicar, renomear, mesclar, excluir com destino,
  mover, classes, papéis do sistema, órfãs, restaurar padrão, extrato bancário e propagação para
  todos os módulos.
- **`test-conta-cartao.js` — 50 verificações:** modal, prévia, compra espelho, fatura, limite,
  compromissos, contador do menu, única/parcelada/recorrente, edição em série, lista, filtro,
  KPI, navegação para a fatura, fatura paga, troca caixa ↔ cartão, plano de contas, exclusões e
  validação.
- Suítes existentes seguem passando — **539 verificações** no total. (O antigo `test-contas.js`
  já não roda desde a reformulação de Contas a Pagar — usa um campo que não existe mais; foi
  substituído pelo `test-contas2.js`.)

### ⚠️ Impacto nos dados existentes

- Nenhum dado é apagado. Sem plano salvo, o sistema usa o plano padrão (o mesmo de antes).
- Categorias antigas que estavam fora da lista aparecem em **"Em uso, mas fora do plano"** para
  você decidir o que fazer com elas.
- Contas a pagar existentes continuam como **pagamento pelo caixa**.

---

## [2026-09-23] Gráficos de fluxo de caixa sem eixo duplo

### 🎯 O que foi pedido

Separar o gráfico do Fluxo de Caixa que usava duas escalas verticais no mesmo desenho.

### 🐛 O que estava errado

- **Dois gráficos com eixo duplo** — o do **Fluxo de Caixa** (entradas e saídas à esquerda,
  saldo à direita) e o do **DRE Diário** (o mesmo arranjo). Com duas escalas diferentes no mesmo
  desenho, a altura da linha do saldo e a altura das barras parecem comparáveis, mas não são: o
  ponto onde a linha cruza uma barra não significa nada. É o erro de gráfico mais comum.
- **A curva suavizada do saldo inventava valores.** Entre dois pontos a linha fazia arcos que
  passavam acima ou abaixo do saldo real — no DRE Diário ela mergulhava abaixo do saldo antes de
  um salário; no mensal inchava acima do valor entre setembro e outubro.
- **Área preenchida com eixo que não começa em zero** — a área sugere tamanho a partir do zero,
  mas o eixo começava em R$ 4.000 ou R$ 17.000, exagerando a variação.
- **"R$-2.000"** no eixo, em vez de "-R$ 2.000".
- O gráfico do DRE Diário usava cores fixas do tema escuro também no tema claro.

### ✅ Corrigido

- Cada um virou **dois gráficos empilhados no mesmo eixo do tempo**:
  - em cima, **entradas acima de zero e saídas abaixo**, uma coluna por período, com o
    resultado do período no tooltip;
  - embaixo, o **saldo acumulado** (no Fluxo de Caixa, com o caixa total e o disponível quando há
    contas de reserva; sem reserva, as duas linhas seriam iguais e fica uma só).
- **Alinhamento exato:** eixo vertical com a mesma largura e a mesma folga nos dois, para cada
  período cair na mesma coluna — medido em pixels nos dois temas.
- Saldo em **segmentos retos**, sem valores inventados entre os pontos. Sem área sob a linha;
  **só o trecho abaixo de zero** ganha sombra vermelha.
- **Nome de cada linha escrito na ponta**, em cor de texto — a identificação não depende só da cor.
- **Linha do zero destacada** como referência dos dois gráficos; valores do eixo em pt-BR.
- **Cores validadas para daltonismo** nos dois temas: entradas em verde-água e saídas em laranja
  (mantém a intuição de verde/vermelho sem a dupla verde × vermelho, que some para quem tem
  deuteranopia); saldo total em azul e disponível em âmbar.

### 🧪 Testes

- `test-fluxo-caixa.js` passa de 52 para **71 verificações**: séries, sinal das saídas, um eixo só
  em cada gráfico, eixo x compartilhado, largura e folga iguais, segmentos retos, sombra só no
  negativo, formato do eixo, DRE Diário dividido e uma **varredura de todas as visões de Relatórios
  confirmando que nenhum gráfico do sistema tem mais de um eixo vertical**.
- Suítes existentes seguem passando — **439 verificações** no total.

### ⚠️ Impacto nos dados existentes

Nenhum. Só a forma de desenhar mudou; os números são os mesmos.

---

## [2026-09-23] Orçamento completo: sliders, pizzas, colunas e motor corrigido

### 🎯 O que foi pedido

Melhorar e deixar **completa** a aba de Orçamento, com **gráficos de pizza**, **gráficos de
colunas** e **ajuste de valor por barra que aumenta e diminui**.

### 🐛 O que estava errado (antes de acrescentar qualquer coisa)

1. **Meta não tinha ano.** Guardava só o mês: uma meta de setembro valia para setembro de
   *todos* os anos, e não havia como orçar 2027 diferente de 2026.
2. **"Realizado" contava despesa não paga.** Lançamento pendente entrava como gasto feito.
3. **Meta de categoria + meta de subcategoria somavam em dobro.** Alimentação R$ 1.000 com
   Supermercado R$ 600 e Restaurante R$ 500 aparecia como R$ 2.100 orçados. Na base de teste,
   o KPI mostrava **R$ 5.099** orçados onde o certo era **R$ 3.000** (dupla contagem mais uma
   meta de 2025 vazando para 2026).
4. **Gasto sem meta era invisível.** Se uma categoria não tinha meta, o orçamento nunca a
   mostrava — o dinheiro sumia da análise.
5. **Editar uma meta podia criar duplicata** (a checagem só existia na criação).
6. **O Dashboard comparava meta de subcategoria com o gasto da categoria inteira**, gerando
   alerta falso de "estourou" — em três lugares diferentes (barras, alertas e "O que fazer agora").
7. **A paleta dos gráficos reprovava no teste de daltonismo** (roxo × azul com ΔE 4,3 para
   deuteranopia) e as cores seguiam a *posição* no ranking, não a categoria: ao mudar um valor,
   as categorias trocavam de cor.

### ✅ Motor refeito

- Toda meta passa a ter **mês e ano**. Migração automática: metas antigas são vinculadas ao ano
  de referência das Configurações, uma única vez.
- **Realizado = pago.** O que está em aberto — lançamento pendente **e conta a pagar do mês** —
  vira **Pendente**, mostrado à parte e somado no **Projetado**.
- **Hierarquia sem dupla contagem:** a meta da categoria é o teto da categoria inteira; metas de
  subcategoria são limites dentro dela. Quando as subcategorias somam mais que a categoria, o
  sistema avisa.
- **Gastos sem meta** aparecem em lista própria, com botão para criar a meta no ato.
- Situação de cada meta: *No limite*, *Atenção* (≥ 80%), *Vai estourar* (o pendente passa),
  *Estourou*; para receita e investimento, *Atingida*, *A caminho* ou *Abaixo da meta*.
- Edição recusa duplicata com mensagem clara, sem apagar nada.
- Dashboard (barras, alertas e painel "O que fazer agora") passa a usar o mesmo motor.

### ✅ Ajuste de metas por barra deslizante

- Nova visão **🎚 Ajustar Metas**: **uma barra por meta** — arraste, use **−** / **+** ou digite
  o valor. Grava ao soltar a barra, sem redesenhar a tela (o foco fica onde estava).
- **Tudo recalcula enquanto você arrasta:** KPIs, a barra de distribuição da renda, o total de
  cada categoria e a situação.
- **Cor do trilho diz a situação:** azul dentro do limite, âmbar quando o pendente vai estourar,
  vermelho quando a meta já está abaixo do que foi gasto, verde para receita atingida. Embaixo
  de cada barra, em texto: "sobram R$ X · 84% usado", "já estourou em R$ Y"…
- **Marcadores no trilho:** um traço no valor **realizado + pendente** e um triângulo na **média
  dos últimos 3 meses** — dá para ver onde a meta fica em relação ao seu gasto real.
- A barra cresce sozinha quando você digita um valor acima da escala.
- O modal de nova meta também ganhou a barra, com o gasto do mês e a média de 3 meses da
  categoria escolhida como referência.

### ✅ Gráficos

- **Pizzas** do **orçado** e do **realizado** por categoria, lado a lado, com o total no centro
  e legenda com valor e percentual. As duas usam o **mesmo mapa de cores** (a mesma categoria tem
  a mesma cor nas duas), com as 4 categorias que mais pesam no mês e o resto em **"Outras"**.
- **Colunas "Orçado × Realizado por categoria"**: a coluna do realizado empilha o **pago** e o
  **pendente**; o tooltip mostra a sobra ou o excesso.
- **Colunas "Evolução anual"**: os 12 meses do ano; clicar em um mês abre esse mês.
- **Paleta validada** para daltonismo (protanopia, deuteranopia e tritanopia) nos temas claro e
  escuro, com passos próprios para cada fundo. Um eixo só em todos os gráficos.

### ✅ Visões e ferramentas

- **📊 Visão Geral:** KPIs, distribuição da renda, pizzas, colunas, **regra 50/30/20** (medidores
  de necessidades, desejos e investimentos contra a referência) e **Leitura do orçamento** —
  estouros, o que vai estourar, gastos sem meta, subcategorias acima da categoria, renda sem destino
  e **quanto você pode gastar por dia** até o fim do mês.
- **📋 Acompanhamento:** tabela categoria › subcategoria com meta, realizado, pendente, projetado,
  saldo, % e situação, com barra de progresso em cada linha.
- **📅 Anual:** colunas e tabela mês a mês com totais do ano.
- **Seletor de ano** ao lado das abas de mês; as abas marcam com um ponto os meses que têm metas.
- **Atalhos:** copiar metas do mês anterior · replicar para os próximos meses · **sugerir metas pela
  média de 3 meses** · limpar o mês.
- Novos KPIs: **renda de referência** (receita orçada, ou o salário das Configurações) e
  **livre para orçar** (quanto da renda ainda não tem destino).
- No celular, a barra ocupa a largura toda e o mês ativo fica centralizado na faixa de meses.

### 🧪 Testes

- `test-orcamento.js` — **84 verificações**: migração do ano, isolamento entre anos, hierarquia
  sem dupla contagem, pago × pendente (incluindo conta a pagar), situações, média de 3 meses, KPIs,
  pizzas (fatias, mesma cor por categoria, "Outras"), colunas (séries, empilhamento, eixo único),
  50/30/20, leitura, sliders (pintura na abertura, atualização ao vivo sem gravar, gravação ao
  soltar, botões ± em metas diferentes, arrasto sem reler o armazenamento, valor digitado acima da escala), atalhos, modal, acompanhamento, visão anual e
  os alertas do Dashboard.
- `test-conexoes.js` deixou de depender da data do relógio (a contagem de dias em atraso era fixa).
- Suítes existentes seguem passando — **420 verificações** no total.

### ⚠️ Impacto nos dados existentes

Nenhuma meta é apagada. As metas antigas **ganham o ano de referência** configurado e deixam de
valer para os outros anos. Os números do orçamento mudam onde estavam errados: o orçado deixa de
somar categoria e subcategoria em dobro, e o realizado deixa de contar o que ainda não foi pago.

---

## [2026-09-21] Auditoria geral: os módulos passam a conversar entre si

### 🎯 O que foi pedido

Entender toda a lógica do sistema, corrigir o que está errado e **conectar todos os pontos**.

### 🔍 O diagnóstico

Cada módulo funcionava bem sozinho, mas o sistema não era um sistema: era um conjunto de
ilhas. O padrão comum a quase todos os erros: **Contas a Pagar, Cartões e Dívidas só viram
lançamento quando são pagos.** Antes disso, eram invisíveis para o resto do programa.

Uma sonda automatizada em cima de uma base com uma conta a pagar, uma fatura e uma parcela
de dívida em aberto mostrou o tamanho do buraco:

| O que se esperava | O que o sistema respondia |
|---|---|
| Outubro com R$ 3.300 a sair | resultado **R$ 0,00** |
| Projeção de dezembro realista | **+R$ 10.000** (não sabia de nada que devia) |
| Pagar parcela de dívida move o caixa | **0 lançamentos, 0 movimentos, saldo intacto** |
| Painel avisa sobre fatura e dívida | **só falava de Contas a Pagar** |
| Orçamento de Alimentação vê o mercado do cartão | **R$ 0,00** |

### 🐛 O que estava errado

1. **A projeção de caixa desconhecia os compromissos.** O modo Previsto incluía lançamentos
   não pagos, mas ignorava contas a pagar, faturas de cartão e parcelas de dívida em aberto.
   O saldo projetado era ficção otimista.
2. **Dívidas era uma ilha completa.** `savePgDiv` só mexia em `dv.saldo` e nas parcelas: não
   gerava lançamento, não debitava conta, não aparecia no DRE, no fluxo nem no extrato. O
   dinheiro saía da conta e o sistema não ficava sabendo. Havia ainda um segundo caminho de
   pagamento (`pagarParcela`) que marcava a parcela como paga sem passar por lugar nenhum.
3. **O saldo devedor era acumulado à mão** (`saldo - val`), podendo divergir das parcelas.
4. **O painel "O que fazer agora" só enxergava Contas a Pagar** — fatura vencendo e parcela
   de dívida atrasada não geravam aviso.
5. **O contador de contas pendentes zerava na virada do mês**: filtrava pelo mês exibido, então
   uma conta vencida em agosto sumia do KPI em setembro.
6. **O Orçamento não enxergava o cartão.** Um mercado de R$ 800 pago no cartão não pesava na
   meta de Alimentação — só aparecia, meses depois, como "Serviços & Financeiro" no pagamento
   da fatura.
7. **O Score de Saúde era vaidoso.** Só olhava o fluxo do mês: dava **81/100 "Excelente"** para
   quem tinha patrimônio líquido de **−R$ 11.640**, nenhuma reserva de emergência e R$ 5.319
   de compromissos contra R$ 6.360 em caixa.
8. **`gs()` não inicializava `bancos` nem `kanban`**, o que exigia um monkey-patch de `gs()`
   no fim do arquivo e guardas `(d.bancos||[])` espalhadas pelo código.

### ✅ Corrigido e conectado

**Motor de compromissos — o elo que faltava**
- Nova função `compromissosFuturos(d)`: devolve, numa lista só, tudo o que está em aberto em
  **Contas a Pagar, Cartões e Dívidas**, com data, valor, categoria, tipo e se está vencido.
- Faturas entram pela **competência** (respeitando o fechamento do cartão), inclusive as
  atrasadas dos últimos 6 meses e as projetadas dos próximos 12.
- Compromissos **não entram** em `calcSaldoAte()` nem no DRE: são compromissos, não fatos.
  Entram na projeção e nos avisos. O saldo de hoje continua sendo o saldo de hoje.

**Fluxo de Caixa**
- O modo **Previsto** passa a somar os compromissos em aberto, com uma opção para desligar.
- O detalhamento do período marca cada um com o selo do módulo de origem.
- No exemplo da sonda, a projeção de dezembro saiu de **+R$ 10.000** para **−R$ 4.300**.

**Agenda de Compromissos (nova, no Dashboard)**
- Uma tabela única com contas, faturas e parcelas ordenadas por vencimento, com valor
  **acumulado** linha a linha, situação (em atraso / vence hoje / em N dias) e botão que leva
  direto ao modal de pagamento do módulo certo.
- Janela de 7, 30, 60 ou 90 dias e filtro por tipo.
- KPIs: vencido, a vencer na janela, caixa disponível hoje e **sobra após compromissos** —
  a resposta para "o dinheiro que tenho cobre o que devo?".

**Dívidas conectada ao caixa**
- Pagar uma parcela agora **gera lançamento de despesa** (Serviços & Financeiro › Pagamento de
  Dívida) e pode **debitar uma conta bancária**, aparecendo no DRE, nos relatórios e no extrato.
- Modal com seleção da parcela, valor pré-preenchido, conta de débito e prévia do que sobra.
- **Desfazer pagamento** remove o lançamento e a movimentação e reabre a parcela.
- Caminho único de pagamento: o atalho que marcava a parcela sem avisar o caixa foi eliminado.
- **Saldo devedor recalculado a partir das parcelas** (fonte única), usado também no
  patrimônio líquido.
- Excluir dívida pede confirmação e limpa os lançamentos vinculados.

**Painel "O que fazer agora"**
- Novas ações para **faturas e parcelas vencidas**, **vencendo em 7 dias** e, acima de tudo,
  **"Caixa insuficiente"** quando os compromissos do mês passam do disponível.
- O contador de contas pendentes passa a incluir atrasos de meses anteriores.

**Orçamento**
- Opção **"incluir gastos do cartão de crédito"**: as parcelas do mês entram na categoria da
  compra, substituindo o lançamento de pagamento da fatura para não contar duas vezes.

**Score de Saúde honesto e explicável**
- Passa a penalizar **patrimônio líquido negativo**, **reserva de emergência abaixo de 3 meses**,
  **contas em atraso** e **compromissos maiores que o caixa**.
- Deixa de ser um número solto: o rótulo mostra o fator que mais pesa contra e o tooltip lista
  cada desconto com o motivo. No cenário da sonda o score caiu de 81 para 57.

**Base**
- `gs()` inicializa todas as coleções (`bancos` e `kanban` incluídos), tornando o monkey-patch
  desnecessário.

### 🧪 Testes

- `test-conexoes.js` — **44 verificações**: motor de compromissos nos três módulos, projeção
  com e sem compromissos, isolamento em relação ao saldo real e ao DRE, agenda (ordem, janelas,
  filtros, KPIs), pagamento de dívida gerando lançamento e movimento bancário, desfazer, e
  orçamento com cartão.
- `test-score.js` — **11 verificações** em três cenários (saudável, endividado, em atraso).
- Suítes existentes seguem passando: `test-full` (21), `test-fluxo` (10), `test-contas2` (37),
  `test-reserva` (22), `test-lanc-reserva` (23), `test-extrato` (24), `test-cc` (53),
  `test-despesas` (39), `test-fluxo-caixa` (52) e `test-invariante` (24 cenários).

### ⚠️ Impacto nos dados existentes

Nenhum dado é migrado ou apagado. Os números mudam onde estavam errados: a projeção do fluxo
passa a descontar o que você deve, o score cai para quem tem dívida ou atraso, e o saldo
devedor passa a vir das parcelas. Pagamentos de dívida **já registrados antes desta versão não
geram lançamento retroativo** — para trazê-los ao caixa, desfaça e refaça o pagamento.

---

## [2026-09-18] Fluxo de Caixa: detalhamento, granularidade e correção do motor

### 🎯 O que foi pedido

Melhorar e detalhar a parte de **Fluxo de Caixa**.

### 🐛 O que estava errado

A aba tinha apenas um gráfico de linha e uma lista de 12 valores — e a curva **não batia
com o saldo real do sistema**. O motivo era uma mistura de duas fontes:

- O **saldo de abertura** vinha do motor de saldo (lançamentos + contas bancárias), mas os
  **incrementos mês a mês** vinham só dos lançamentos. Resultado:
  - **movimentação bancária avulsa não mexia na curva** — um reembolso importado por OFX ou
    uma tarifa lançada direto no extrato mudavam o saldo real e não apareciam na projeção;
  - dinheiro que ia para uma **conta de reserva** saía da conta corrente mas a linha não caía;
  - o valor final da projeção **divergia do saldo exibido na barra lateral**.
- **Transferência para a poupança não movia os trilhos.** A transferência é (corretamente)
  neutra no caixa consolidado, mas o dinheiro muda de lugar: o disponível deveria cair e o
  reservado subir. Nenhum dos dois acontecia — nem no fluxo, nem na coluna de saldo da aba
  Lançamentos.
- Só existia visão **anual/mensal**: não dava para olhar o caixa por semana nem por dia.
- Não havia entradas e saídas separadas, saldo de abertura, totais, nem como saber **quais
  movimentações** formavam o resultado de um período.

### ✅ Corrigido e melhorado

**Correção do motor (a parte que muda números)**
- O fluxo de caixa passou a ser calculado **inteiramente a partir de `timelineCaixa()`**, a
  mesma linha do tempo que alimenta o saldo do sistema. Abertura e incrementos vêm da mesma
  fonte, então a curva fecha com o saldo real.
- Cada evento do caixa agora carrega um **`deltaReserva`**: quanto do seu efeito recai sobre
  contas de reserva. Com isso a transferência para a poupança passa a ser neutra no total e a
  **mover corretamente o disponível e o reservado** — no fluxo e também na coluna de saldo da
  aba Lançamentos, que usava a mesma decomposição incompleta.
- Invariantes garantidas por teste: o fechamento de todo período é igual a
  `calcSaldoAte(data)`, o reservado é igual a `calcReservasAte(data)`, o fim de um período é
  o início do seguinte, e abertura + soma dos resultados = saldo final.

**Granularidade**
- Três visões: **Mensal** (os 12 meses do ano), **Semanal** (semanas do mês selecionado) e
  **Diário** (dias do mês selecionado).
- O seletor de mês do topo passou a valer também para o Fluxo de Caixa.

**Indicadores**
- Saldo de abertura, entradas, saídas, resultado (com a média por período), saldo final
  (separando disponível e reservado) e **menor saldo do período**, com o período em que ocorre.

**Gráficos**
- Gráfico combinado: **barras de entradas e saídas** com a **linha do saldo acumulado** em
  eixo próprio — dá para ver o movimento e o acumulado na mesma leitura.
- Segundo gráfico **Caixa Total × Disponível**, mostrando o quanto do saldo está preso em
  reservas ao longo do tempo.

**Tabela período a período**
- Linha de abertura ("saldo anterior ao período"), e para cada período: saldo inicial,
  entradas, saídas, resultado, saldo final, reservado e disponível.
- Selo **"agora"** no período corrente e **"projeção"** nos períodos futuros.
- Rodapé com o total do período.
- **Clicar em um período abre o detalhamento** com todas as movimentações que o compõem:
  data, descrição, categoria, origem (lançamento, conta a pagar, fatura de cartão,
  movimentação bancária ou importação OFX), situação (efetivado / a pagar / reserva),
  entrada, saída e o saldo corrido.

**Leitura do Caixa**
- Texto gerado a partir dos números: se e quando o caixa fica negativo, em quantos períodos
  você gastou mais do que entrou, maior déficit e melhor período, **taxa de queima**
  (quanto saiu para cada R$ 100,00 que entrou), quanto o dinheiro ainda dura no ritmo atual,
  quanto está preso em reservas e quanto o caixa cresceu ou encolheu no período.

**Exportação**
- Botão **CSV** com o fluxo do período na granularidade escolhida.

### 🧪 Testes

- `test-fluxo-caixa.js` — **52 verificações**: abertura com histórico anterior, movimentação
  bancária avulsa entrando na curva, transferência neutra no total movendo os trilhos,
  invariantes contra o motor de saldo nas três granularidades, encadeamento dos períodos,
  KPIs, tabela, rodapé, detalhamento (abrir e fechar) e modo Previsto × Realizado.
- Suítes existentes seguem passando: `test-full` (21), `test-fluxo` (10), `test-contas2` (37),
  `test-reserva` (22), `test-lanc-reserva` (23), `test-extrato` (24), `test-cc` (53),
  `test-despesas` (39) e `test-invariante` (24 cenários).

### ⚠️ Impacto nos dados existentes

Nenhum dado é migrado ou apagado. Os **valores exibidos mudam** onde antes estavam errados:
o fluxo passa a incluir movimentações bancárias avulsas e o efeito das reservas, e a coluna
de saldo da aba Lançamentos passa a refletir transferências para contas de reserva.

---

## [2026-09-18] Cartão de crédito corrigido e relatório de despesas pessoais

### 🎯 O que foi pedido

Acrescentar **relatórios para análise de despesas pessoais** e analisar, melhorar e
**corrigir os problemas da aba Cartão de Crédito**.

---

## Parte 1 — Cartão de Crédito

### 🐛 O que estava errado

- **O dia de fechamento era ignorado.** O campo existia no cadastro, mas nenhum cálculo
  o usava: uma compra feita no dia 25, com fechamento no dia 20, caía na fatura do próprio
  mês em vez da seguinte. Todas as faturas ficavam um mês adiantadas.
- **Não dava para editar nem excluir um cartão.** Errou o limite ou o dia de vencimento?
  Só apagando todos os dados.
- **Não dava para editar um gasto** — só excluir e lançar de novo, perdendo o histórico.
- **Pagar a fatura não gerava lançamento nem debitava conta nenhuma.** O gasto do cartão
  era invisível para o DRE, para o fluxo de caixa e para o extrato bancário: o dinheiro
  saía da conta e o sistema não registrava.
- **Não havia como ver quais compras compunham uma fatura** — só o total.
- **A aba mostrava sempre o mês corrente do ano corrente.** Não havia como olhar a fatura
  de outubro, nem a de dezembro do ano passado.
- **O "próximo vencimento" estourava a data** em meses curtos: vencimento dia 31 em
  fevereiro virava 3 de março (`setDate(31)`).
- **As categorias do gasto eram uma lista própria** ("Assinaturas", "Viagens",
  "Eletrônicos"…), desconectada das categorias do resto do sistema — o que impedia
  qualquer análise cruzada.
- **Excluir gasto ou fatura não pedia confirmação.** Um clique errado e o dado sumia.
- A tabela de faturas só listava faturas **já pagas**; as em aberto não existiam ali.

### ✅ Corrigido e melhorado

**Fechamento e competência (a correção central)**
- Nova noção de **competência**: o mês de vencimento da fatura. Cada compra é associada à
  primeira fatura que **ainda não havia fechado** na data da compra.
- Quando o dia de fechamento é igual ou posterior ao de vencimento, a fatura do mês fecha
  no **mês anterior** (ex.: fecha dia 20, vence dia 5 → a fatura de maio fecha em 20/abril).
- Parcelas seguem a competência da primeira: compra em 3x na fatura de maio pesa em maio,
  junho e julho — inclusive **virando o ano** corretamente.
- O **limite comprometido** passou a considerar a competência de cada parcela.
- Datas de fechamento e vencimento **nunca estouram o mês**: dia 31 em fevereiro vira 28
  (ou 29 em ano bissexto).

**Navegação por competência**
- Seletores de **mês e ano** no topo da aba. Todos os números — KPIs, gráficos, faturas e
  detalhe — seguem a competência escolhida.
- O seletor de ano se popula sozinho com os anos que têm movimento (incluindo os anos
  futuros alcançados por parcelamentos longos).

**Fatura detalhada (nova aba)**
- Mostra **quais compras compõem a fatura** da competência: data da compra, descrição,
  categoria, parcela *x de n*, valor total da compra e quanto pesa naquela fatura.
- Cabeçalho com total, datas de fechamento e vencimento, situação e o pagamento registrado.
- Rodapé fechando com o total da fatura.

**Faturas do ano**
- A tabela agora lista **as 12 competências do ano** (as que têm valor ou registro), não só
  as pagas, cada uma com sua situação: *Aberta*, *Fechada*, *Vencida*, *Paga* ou
  *Sem movimento*.
- Ações por linha: **ver as compras**, **pagar**, **desfazer o pagamento** e **excluir**.

**Pagamento da fatura integrado ao caixa**
- O pagamento agora **gera um lançamento de despesa** (opcional, marcado por padrão) e
  pode **debitar uma conta bancária**, aparecendo no DRE, nos relatórios e no extrato.
- Modal com mês, ano, data, valor pré-preenchido com o total calculado, conta de débito e
  categoria do lançamento — além de uma prévia com fechamento, vencimento e total.
- **Desfazer o pagamento** remove o lançamento e a movimentação bancária gerados e reabre
  a fatura.
- Excluir cartão ou fatura também limpa os lançamentos vinculados — sem sobras órfãs.

**Cadastro e edição**
- **Editar e excluir cartão** (botões no próprio cartão), com confirmação que informa
  quantos gastos, faturas e lançamentos serão afetados.
- **Editar gasto**, com validação inline (nada de `alert`) para nome, limite, dia de
  vencimento e dia de fechamento fora da faixa 1–31.
- Gastos passaram a usar as **categorias e subcategorias do sistema**.
- **Prévia no cadastro do gasto**: "3x de R$ 300,00 · entra na fatura de Julho/2026
  (vence 05/07/2026) · última parcela em Setembro/2026".
- Confirmação antes de excluir gasto e fatura.

---

## Parte 2 — Relatório de Análise de Despesas Pessoais

Nova aba em **Relatórios & DRE → Despesas Pessoais**.

### ✅ O que foi implementado

**Período e fonte**
- Janela de análise de **1, 3, 6 ou 12 meses**, ancorada no mês selecionado.
- Comparação automática com o **período anterior de mesmo tamanho**.
- Fonte alternável: **somente lançamentos** ou **lançamentos + parcelas de cartão**.
- No modo com cartão, as parcelas entram na data de vencimento da fatura e **substituem**
  os lançamentos gerados por pagamento de fatura — nada é contado duas vezes.
- Respeita os modos **Previsto / Realizado** e mantém as contas de reserva fora do resultado.

**Indicadores**
- Total do período, média mensal, média diária, maior despesa, número de despesas e
  **percentual da renda** comprometido, com a variação frente ao período anterior.

**Análises**
- **Evolução mensal** das despesas com a linha da média do período.
- **Essenciais × Escolhas**: classificação por grupo de categoria (moradia, alimentação,
  transporte, saúde, educação e vestuário são essenciais; lazer, beleza, festas e esporte
  são escolhas), com o peso de cada classe sobre o total e sobre a renda.
- **Tabela por categoria** com total, % do total, média mensal, número de lançamentos,
  maior gasto, valor do período anterior e **variação** (▲/▼, "novo", "estável").
- **Subcategorias** — onde o dinheiro realmente escorre, com a contagem de ocorrências.
- **Gasto por dia da semana**.
- **Maiores despesas do período**, com categoria, subcategoria e origem (lançamento ou
  qual cartão).

**Leitura do período**
- Texto gerado a partir dos números: variação total, quanto da renda foi consumido e
  quanto sobrou, proporção entre essencial e escolha, maior categoria, **maior alta**,
  **maior economia** e o dia da semana mais caro.

### 🧪 Testes

- `test-cc.js` — **53 verificações**: competência com fechamento (antes, depois e virada de
  ano), datas de fechamento/vencimento, totais por fatura, limite comprometido, dia seguro
  em meses curtos, composição da fatura, navegação por competência, pagamento gerando
  lançamento e movimento bancário, desfazer pagamento, edição de cartão e de gasto, validação.
- `test-despesas.js` — **39 verificações**: janelas de 1/3/12 meses, comparativo com o
  período anterior, classificação essencial/escolha, tabela por categoria, subcategorias,
  maiores despesas, evolução mensal e ausência de dupla contagem no modo com cartão.
- Suítes existentes seguem passando: `test-full` (21), `test-fluxo` (10), `test-contas2` (37),
  `test-reserva` (22), `test-lanc-reserva` (23), `test-extrato` (24) e `test-invariante`
  (24 cenários DRE × motor de saldo).

### ⚠️ Impacto nos dados existentes

Nenhum dado é migrado ou apagado. Como o **dia de fechamento passou a ser respeitado**,
compras feitas após o fechamento agora aparecem na fatura do mês seguinte — que é o
comportamento correto. Se algum cartão estiver com o dia de fechamento errado no cadastro,
basta editá-lo: os valores se reorganizam sozinhos.

---

## [2026-09-18] Extrato bancário: ordem cronológica e análise do período

### 🎯 O que foi pedido

Melhorar a análise e a visualização das movimentações das contas bancárias — o extrato —
começando da **data mais antiga para a mais atual**.

### 🐛 O que estava errado

- O extrato vinha em ordem **decrescente** (mais recente primeiro) e o saldo era reconstruído
  de trás para frente — o oposto de como se lê um extrato bancário.
- O filtro de mês **ignorava o ano**: setembro de 2025 aparecia junto com setembro de 2026.
- Não havia saldo anterior, totais do período nem qualquer fechamento.
- A análise ao lado (categorias) usava **todas** as movimentações da conta, sem relação com o
  período filtrado na tabela.

### ✅ Corrigido e melhorado

**Ordem e saldo**
- Extrato em **ordem cronológica**: da movimentação mais antiga para a mais recente, com o
  saldo corrido acumulando linha a linha, como em um extrato de banco.
- Linha de abertura **"Saldo anterior ao período"**, para o saldo corrido começar do lugar certo.
- Botão para **inverter a ordem** quando quiser ver primeiro o mais recente.

**Leitura**
- Colunas **Entrada** e **Saída** separadas (antes um único campo com sinal).
- **Separadores por mês** com o subtotal de entradas, saídas e o resultado daquele mês.
- Data com o **dia da semana**, destaque para a linha de **hoje**, e selo de origem da
  movimentação (lançamento, transferência ou OFX).
- Cabeçalho da tabela **fixo** ao rolar extratos longos.

**Resumo do período**
- Faixa com **Saldo anterior → Entradas → Saídas → Resultado → Saldo final**.
- Rodapé com o total do que está listado e a contagem de movimentações.
- Quando um filtro de tipo ou busca reduz a lista, o resumo continua mostrando o período
  inteiro e o cabeçalho indica *"X de Y exibidas"* — sem números contraditórios.

**Filtros**
- Novo **filtro de ano** (o de mês deixou de misturar anos diferentes).
- O extrato passa a abrir com o **histórico completo** em ordem cronológica, em vez de já vir
  preso ao mês atual.
- **Exportar CSV** do que está sendo exibido.

**Análise**
- "Saídas por Categoria" agora reflete o **período filtrado**, e não a conta inteira.
- "Top Categorias" deu lugar a **Maiores Movimentações** do período, com valor, barra
  proporcional e data.
- Os gráficos **Evolução do Saldo** e **Entradas vs Saídas** passam a seguir o **ano escolhido
  no extrato**, com o ano no título.

### 🧪 Verificação

**24 verificações automatizadas** cobrindo a ordem cronológica, o saldo corrido acumulado, a
linha de saldo anterior, os separadores de mês, o resumo do período, o rodapé de totais, a
inversão da ordem, os filtros de ano/mês/tipo/busca (inclusive a independência entre o resumo
do período e o filtro de exibição) e a análise acompanhando o período. As suítes anteriores
seguem passando: **19/19** (saldo), **10/10** (fluxo), **37/37** (contas a pagar), **22/22**
(contas de reserva), **23/23** (lançamentos × reservas) e **24/24** (invariante DRE).

---

## [2026-09-18] Lançamentos: reservas separadas do resultado

### 🎯 O que foi pedido

Na aba **Lançamentos**, separar as contas de reserva dos resultados — elas ainda apareciam
misturadas ali.

### 🐛 O que estava misturado

Os KPIs de Receitas/Despesas já excluíam as reservas, mas o resto da aba continuava somando
tudo junto:

- o **Saldo Acumulado** incluía o dinheiro da poupança;
- a coluna **Saldo Caixa** corria um único trilho, misturando conta corrente e reserva;
- a **lista** trazia as linhas de reserva no meio das demais, com apenas um selo pequeno;
- o **rodapé de seleção** somava as linhas de reserva no saldo líquido.

### ✅ Corrigido

**Dois blocos de KPI, com papéis distintos**
- **Resultado do mês** (primeira linha): Receitas, Despesas, Saldo Líquido e Investimentos —
  todos com a nota *"sem contas de reserva"*.
- **Saldos** (segunda linha), separados:
  - **Saldo Disponível** — o que está nas contas que entram no resultado (o "Anterior" do mês
    passado agora também é o disponível, não o total);
  - **🔒 Em Reservas** — quanto está guardado, com o movimento do mês ao lado
    (*+R$ 36,50 no mês*). O cartão só aparece quando existe alguma conta de reserva;
  - **Patrimônio em Caixa** — disponível + reservas, para o total continuar visível.

**Filtro de visão no extrato**
- Novo seletor com três opções:
  - **📈 Resultado (sem reservas)** — padrão, mostra só o que compõe o resultado;
  - **🔒 Somente reservas** — o extrato da poupança;
  - **Tudo** — a lista completa.

**Coluna de saldo em dois trilhos**
- Cada linha passa a mostrar o saldo acumulado **do seu próprio trilho**: linhas de conta
  corrente seguem o saldo disponível, linhas de reserva seguem o saldo da reserva (com o
  cadeado 🔒). Antes um único trilho misturava os dois, e a coluna "pulava" valores quando as
  reservas estavam ocultas.

**Seleção de linhas**
- Ao marcar linhas, as de reserva passam a ser somadas em um bloco próprio (**🔒 Em reservas**)
  e não entram mais no saldo líquido. A contagem indica quantas das selecionadas são de reserva.

### 🧪 Verificação

**23 verificações automatizadas** cobrindo os três modos do filtro, os valores dos três KPIs de
saldo, o "anterior" usando o disponível, o movimento de reservas no mês, os dois trilhos da
coluna de saldo e a separação no rodapé de seleção. As suítes anteriores seguem passando:
**19/19** (saldo), **10/10** (fluxo), **37/37** (contas a pagar), **22/22** (contas de reserva)
e **24/24** (invariante DRE × motor de saldo).

### ℹ️ Observações

- A aba abre por padrão na visão **Resultado**. Se sentir falta das linhas da poupança, troque
  o seletor para *Somente reservas* ou *Tudo* — nada foi apagado.

---

## [2026-09-18] Contas de reserva: poupança fora do resultado

### 🎯 O que foi pedido

Ter contas **corrente** e **poupança**, e uma forma de as movimentações da poupança **não
entrarem na contabilidade do sistema** (DRE, relatórios financeiros mensais e afins).

### ✨ Implementado

**Tipo de conta**
- O cadastro de contas bancárias já oferecia Corrente e Poupança; a lista foi reorganizada
  (Corrente e Poupança primeiro) e ganhou **Carteira / Dinheiro**.

**Conta de reserva (o pedido principal)**
- Nova opção **🔒 Conta de reserva — fora do resultado** no cadastro da conta.
- Ao escolher **Conta Poupança** ou **Conta Investimento**, a opção já vem marcada
  automaticamente — e pode ser desmarcada. Qualquer conta pode ser marcada como reserva.
- O que entra e sai de uma conta de reserva **não aparece em**:
  - DRE (mensal, semanal e diário);
  - Relatórios (visão anual, por categoria e fluxo de caixa);
  - Dashboard (receitas, despesas, investimentos, gráficos, score e saúde financeira);
  - Orçamento (realizado por categoria);
  - KPIs de Receitas/Despesas/Saldo Líquido da aba Lançamentos.
- O **saldo continua contando no patrimônio** — o dinheiro não some do sistema, apenas deixa
  de ser tratado como receita ou despesa do mês.
- Vale tanto para **lançamentos vinculados à conta** quanto para **movimentações lançadas
  direto nela** (incluindo importação OFX).
- Transferência entre a conta corrente e a poupança continua **neutra**: sai de um lado, entra
  no outro, sem virar receita nem despesa em lugar nenhum.

**Onde isso aparece na tela**
- **Sidebar**: abaixo do saldo, quanto está guardado em reservas (o disponível fica no tooltip).
- **Dashboard**: o detalhamento do patrimônio passou a separar **Caixa** e **🔒 Reservas**.
- **Contas Bancárias**: novo KPI **"Em Reservas"**, selo **🔒 RESERVA** no card da conta e um
  aviso no detalhe explicando a regra.
- **Lançamentos**: as linhas de conta de reserva ganham a marca **🔒 reserva** — continuam
  visíveis no extrato, mas não entram nos totais do mês.

### ✅ Corrigido de quebra

- **Editar conta bancária** abria apenas um `prompt()` que mexia no saldo inicial e nada mais.
  Agora abre o cadastro completo (nome, banco, tipo, saldo inicial, agência, conta, cor e a
  marcação de reserva) — necessário, entre outras coisas, para marcar uma conta já existente
  como reserva.

### 🧪 Verificação

**22 verificações automatizadas** cobrindo: marcação automática por tipo, exclusão do DRE, dos
relatórios, do orçamento, do dashboard e dos KPIs de lançamentos, permanência do saldo no
patrimônio, transferências entre corrente e poupança, movimentações avulsas na reserva,
marcar/desmarcar contas manualmente e preservação dos dados na edição. As suítes anteriores
seguem passando: **19/19** (saldo), **10/10** (fluxo), **37/37** (contas a pagar) e **24/24**
(invariante DRE × motor de saldo).

### ℹ️ Observações

- Contas de poupança **já cadastradas** passam a ser tratadas como reserva automaticamente.
  Se você preferir que alguma delas continue entrando no resultado, basta editá-la e
  desmarcar a opção.

---

## [2026-09-18] Contas a Pagar: recorrência funcional e módulo reconstruído

### 🐛 Problema relatado

As **funções de recorrência não funcionavam**. O campo "Recorrência" (Única / Mensal / Anual)
era gravado na conta, mas **nada no sistema o utilizava**: nenhuma conta futura era criada.
Na prática o campo era decorativo. Pior, quando a conta era parcelada o sistema sobrescrevia
a escolha do usuário (`rec: parc>1 ? 'Mensal' : rec`), confundindo dois conceitos diferentes:

- **Parcelamento** — um valor total dividido em N parcelas (R$ 1.200 em 12x de R$ 100);
- **Recorrência** — a mesma despesa que se repete indefinidamente (aluguel de R$ 1.500/mês).

### ✅ Corrigido

**Recorrência de verdade**
- Contas recorrentes agora **geram as próximas ocorrências automaticamente**, mantendo sempre
  os **12 meses à frente** preenchidos. A geração roda ao abrir o sistema e ao entrar na aba.
- Periodicidades: **Semanal, Quinzenal, Mensal, Bimestral, Trimestral, Semestral e Anual**.
- **Término configurável**: sem data final, até uma data, ou após N ocorrências.
- **Encerrar recorrência**: para de gerar novas e remove as futuras em aberto, preservando
  todo o histórico já pago.
- Ocorrências excluídas manualmente **não são recriadas**.
- Editar uma ocorrência permite escolher o escopo: **somente esta** ou **esta e as próximas**
  (as já pagas nunca são alteradas). Novas ocorrências herdam o valor atualizado.

**Datas de vencimento (bug que afetava também os parcelamentos)**
- A soma de meses estourava o fim do mês: **31/01 + 1 mês virava 03/03**, pulando fevereiro.
  Um parcelamento em 3x a partir de 31/01 gerava 31/01, 03/03 e 31/03 — fevereiro sem parcela e
  março com duas. Agora o dia é preservado e, quando não existe no mês de destino, usa o último
  dia dele: **31/01 → 28/02 → 31/03**.

**Status das contas**
- Uma conta que vencia **hoje** era marcada como **Vencida** (a comparação usava a hora atual
  contra a meia-noite do vencimento). A mesma linha exibia "Vence hoje" e o selo "Vencida".
  Agora o status é derivado por data: vence hoje = **Pendente**.
- A mesma correção foi aplicada aos alertas do Dashboard, ao painel "O que fazer agora" e às
  parcelas de dívidas.

**Pagamento**
- Antes o botão "Pagar" quitava a conta com a data de hoje, valor cheio e **sem conta bancária**.
  Agora abre um modal onde se informa **data do pagamento, valor pago e conta bancária**, com
  aviso automático de **juros/multa ou desconto** quando o valor difere do previsto.
- O lançamento gerado passa a usar o valor efetivamente pago, herda a **subcategoria** e fica
  **vinculado à conta bancária** (antes ficava sem caixa, distorcendo o saldo por conta).
- Novo botão **desfazer pagamento**: a conta volta a Pendente e o lançamento (com a
  movimentação bancária) é removido.

**Edição e exclusão**
- Voltar uma conta de **Pago para Pendente deixava o lançamento de despesa ativo** — o dinheiro
  continuava debitado. Agora o lançamento e a movimentação são removidos junto.
- A exclusão usava dois `confirm()` encadeados **sem opção de cancelar**. Agora há um modal
  com as opções corretas conforme o caso: somente esta conta, todo o parcelamento, ou encerrar
  a recorrência.

### ✨ Melhorado

- **Modal reorganizado** com escolha explícita do tipo — Única / Parcelada / Recorrente — e
  campos que mudam conforme a escolha (nada de campo que não se aplica).
- **Prévia antes de salvar**: quantas contas serão criadas, de que valor, em que datas e o
  total do compromisso.
- **Validação inline** no lugar de `alert()`, apontando os campos que faltam.
- **KPIs**: "Vencidas" passou a mostrar o **valor** em atraso (antes só a quantidade) e foi
  adicionado **"Vence em 7 dias"**.
- **Filtros** por categoria e **busca por texto**, somados aos de ano, mês e status.
- **Tabela**: selo de recorrência com a periodicidade, destaque das contas de série, conta
  bancária usada no pagamento e o valor previsto quando o pago foi diferente.
- **Badge do menu lateral** passou a contar apenas o que exige ação (vencidas + a vencer em 7
  dias). Com recorrências geradas para 12 meses, contar tudo inflava o número sem motivo.

### 🧪 Verificação

**37 verificações automatizadas** no app real cobrindo: datas de fim de mês, geração das
ocorrências (mensal, semanal, com término por data e por quantidade), não duplicação ao rodar
novamente, parcelamento com fechamento exato de centavos, status de contas que vencem hoje,
pagamento com juros e vínculo bancário, desfazer pagamento, edição com escopo, encerramento de
recorrência, exclusões por escopo, filtros e busca. As suítes anteriores (saldo, fluxo e
invariante DRE) continuam passando: **19/19**, **10/10** e **24/24**.

### ℹ️ Observações

- Contas já cadastradas continuam funcionando normalmente. O campo "Recorrência" antigo não
  gerava nada, então nenhuma conta existente passa a se multiplicar sozinha — para ativar,
  basta cadastrar a conta como **Recorrente**.

---

## [2026-09-18] Correção dos cálculos de saldo, DRE, faturas e parcelamentos

### 🐛 Problema relatado

Na aba **Lançamentos**, o **saldo do mês anterior** aparecia **negativo mesmo quando era
positivo**.

**Causa raiz:** o saldo era recalculado do zero a cada ano (partindo apenas do "Saldo Inicial
em Conta" das Configurações) e **ignorava as contas bancárias**. Assim, o resultado de
dezembro não era transportado para janeiro do ano seguinte e todo o dinheiro das contas ficava
de fora — o que fazia um saldo real positivo ser exibido como negativo.

Além disso, o sistema tinha **três cálculos de saldo diferentes e divergentes** (sidebar,
KPI de Lançamentos e coluna "Saldo Caixa"), que mostravam três valores distintos para a
mesma coisa.

### ✅ Corrigido

**Saldo (o problema relatado)**
- **Saldo do mês anterior agora é o saldo real de fechamento do mês anterior**, com transporte
  contínuo entre anos — dezembro fecha e janeiro seguinte abre com esse valor.
- Criado um **motor de saldo único** (`calcSaldoAte`), usado por todas as telas, que:
  - parte da soma dos saldos iniciais das contas bancárias (ou do saldo inicial das
    Configurações, quando não há contas cadastradas);
  - considera lançamentos **e** movimentações bancárias;
  - **nunca conta o mesmo dinheiro duas vezes** (lançamento pago com conta vinculada gera uma
    movimentação espelhada — agora contada uma única vez);
  - trata **transferência entre contas como neutra**: o dinheiro muda de lugar, o total não muda.
- Sidebar, KPI "Saldo Acumulado" e coluna "Saldo Caixa" passam a usar esse mesmo motor —
  os três valores agora batem entre si.
- O subtítulo do KPI mostra o saldo do mês anterior **com o mês de referência** e o
  **saldo realizado** (só o que já foi efetivamente pago), lado a lado.
- **Saldo atual (sidebar)** = caixa consolidado já efetivado até hoje. Havia duas
  implementações duplicadas e esquecidas que somavam transferências como saída (descontavam
  o valor duas vezes); foram removidas.

**Meses misturando anos**
- Dashboard, Relatórios, Orçamento, Cartões, Dívidas e Contas Bancárias filtravam **apenas pelo
  mês**, somando, por exemplo, setembro de 2025 junto com setembro de 2026. Todos os
  agrupamentos mensais agora consideram **mês + ano de referência**.
- Comparativos de "mês anterior" agora atravessam corretamente a virada de ano
  (janeiro compara com dezembro do ano anterior).
- Adicionado **filtro de ano** na aba Contas a Pagar.
- Os filtros de ano passam a preservar a opção "Todos os anos" (antes voltavam sozinhos para o
  ano corrente a cada atualização da tela).

**DRE / Relatórios**
- **Contagem dupla eliminada**: no DRE Mensal e Semanal, um lançamento pago por uma conta
  bancária era somado duas vezes (como lançamento e como movimentação). Agora conta uma vez.
- O DRE Mensal deixou de descartar valores bancários quando a categoria já existia nos
  lançamentos — agora soma corretamente.
- "Saldo Inicial" do DRE deixou de usar o valor fixo das Configurações e passa a ser o
  **saldo real de fechamento do mês anterior**; incluída a linha **"Saldo Final"** do mês.
- DRE Diário passa a abrir com o saldo do mês anterior em vez de começar do zero.
- DRE Semanal passou a descontar investimentos do resultado da semana.
- Fluxo de Caixa anual abre com o saldo do fim do ano anterior (antes reiniciava no valor fixo).
- **Sinal dos valores**: valores negativos eram exibidos como positivos (só uma setinha
  indicava a diferença). Agora o sinal aparece no número.

**Cartões de crédito**
- **Parcelas passam a cair nos meses corretos.** Uma compra em 10x lançada em março pesava
  apenas na fatura de março; agora entra em cada uma das 10 faturas seguintes.
- "Limite usado" e "Disponível" passam a considerar **todas as parcelas em aberto**, e não
  apenas a fatura do mês.
- Pagamento de fatura passa a registrar o **ano**, e o histórico de 6 meses atravessa a virada
  de ano corretamente.

**Parcelamentos (centavos)**
- Contas a pagar, dívidas e compras parceladas usavam `total ÷ parcelas` arredondado, e a soma
  das parcelas não fechava com o total (R$ 100 em 3x virava R$ 99,99). Agora a diferença de
  centavos vai para a última parcela e **a soma fecha exatamente com o valor total**.

**Contas bancárias**
- O saldo da conta ignorava os lançamentos vinculados a ela (campo "Caixa/Conta"), mostrando
  apenas o saldo inicial. Agora o saldo e o extrato da conta incluem esses lançamentos,
  identificados com a etiqueta *lançamento*.
- KPIs de entradas/saídas do mês deixam de contar transferências internas como movimento.
- O gráfico de evolução do saldo passa a abrir com o que ocorreu antes de janeiro do ano exibido.
- **Correção de vínculo:** lançamentos importados podiam ficar presos à conta errada quando um
  nome era prefixo de outro ("Conta Nubank" × "Conta Nubank Poliana"). O vínculo passa a ser
  resolvido pelo nome exato, e uma migração automática corrige os registros já salvos
  (executa uma única vez, sem alterar valores — apenas a conta a que pertencem).

**Patrimônio líquido (Dashboard)**
- Passa a usar o caixa consolidado no fim do mês exibido (respeitando Previsto/Realizado),
  somado aos investimentos acumulados e subtraídas as dívidas.
- Corrigida a falha em que um saldo bancário de exatamente R$ 0,00 fazia o sistema voltar a
  usar o valor das Configurações.
- O gráfico de evolução do patrimônio passa a usar o mesmo motor de saldo.
- Os valores do detalhamento (Caixa / Investimentos / Dívidas) mostram o sinal correto.

### 🧪 Verificação

Suite de testes automatizados executada sobre o app real (navegador headless):

- **19 verificações** de cálculo (saldo entre anos, transferências, parcelamentos, faturas
  parceladas, contagem dupla no DRE, consistência entre contas e consolidado);
- **10 verificações** de fluxo ponta a ponta (criar lançamento, parcelar conta, transferir,
  excluir, extrato);
- **24 verificações de invariante**: o DRE e o motor de saldo fecham no mesmo valor em todos os
  12 meses, nos modos Previsto e Realizado;
- navegação completa por todas as abas sem erros de JavaScript.

### ℹ️ Observações

- Nenhum dado é apagado ou recalculado de forma destrutiva: as correções alteram apenas a
  **forma de calcular e exibir**. A única alteração em dados é a migração de vínculo de conta
  descrita acima.
- Os totais podem mudar em relação ao que era exibido antes — porque antes estavam errados.
  O "Saldo atual" da sidebar, por exemplo, agora considera todo o histórico efetivado, e não
  apenas os saldos iniciais das contas.
