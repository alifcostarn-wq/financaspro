# ChangeLog — FinançasPro

Todas as alterações relevantes do sistema são registradas neste arquivo.

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
