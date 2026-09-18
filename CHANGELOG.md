# ChangeLog — FinançasPro

Todas as alterações relevantes do sistema são registradas neste arquivo.

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
