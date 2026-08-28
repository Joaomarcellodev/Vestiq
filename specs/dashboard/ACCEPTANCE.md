# ACCEPTANCE — Dashboards

## AC-DASH-001-01 — Indicadores da revendedora

**Dado** uma revendedora com 3 vendas confirmadas somando R$ 12.450,00 no mês
**Quando** ela abre o dashboard
**Então** vê "Vendas no mês: R$ 12.450,00"
**E** "Ticket médio: R$ 4.150,00"
**E** o número de itens em estoque
**E** a contagem de negociações pendentes e ofertas ativas.

## AC-DASH-001-02 — Estoque baixo

**Dado** limiar 3 e 2 variações com saldo ≤ 3 e > 0
**Então** o card "Alerta de Inventário" lista essas 2 com o saldo restante.

## AC-DASH-001-03 — Mais vendidos

**Dado** vendas confirmadas com quantidades por produto
**Então** o card "Mais vendidos" ordena por soma de quantidade, desc.

## AC-DASH-001-04 — Estados vazios

**Dado** uma revendedora sem vendas no mês
**Então** os cards financeiros mostram "R$ 0,00" e "sem dados", sem quebrar.

## AC-DASH-001-05 — Escopo por organização

**Dado** as revendedoras A e B
**Quando** A abre o dashboard
**Então** nenhum número inclui dados de B.

## AC-FACTORY-DASH-001-01 — Indicadores da rede

**Dado** uma fábrica com 10 revendedoras vinculadas, 6 ativas nos últimos 30 dias,
40 ofertas, 25 negociações iniciadas e 12 concluídas
**Quando** o `FACTORY_ADMIN` abre o dashboard
**Então** vê exatamente esses números
**E** "Taxa de utilização: 60%".

## AC-FACTORY-DASH-001-02 — Sem dados comerciais privados

**Dado** o dashboard da fábrica carregado
**Quando** se inspeciona a resposta do servidor
**Então** não há nenhum valor monetário de venda/faturamento/margem
**E** nenhum nome ou id de cliente
**E** nenhum detalhe de item vendido por revendedora.

## AC-FACTORY-DASH-001-03 — Escopo por fábrica

**Dado** as fábricas F1 e F2
**Quando** o admin de F1 abre o dashboard
**Então** os agregados contam apenas a rede de F1.

## AC-FACTORY-DASH-001-04 — Rede vazia

**Dado** uma fábrica sem revendedoras
**Então** o dashboard mostra estado vazio com CTA "Convidar revendedora"
**E** "Taxa de utilização: 0%".
