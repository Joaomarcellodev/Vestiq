# ACCEPTANCE — Rede da Fábrica

## AC-NET-001-01 — Cadastrar fábrica

**Dado** um `PLATFORM_ADMIN`
**Quando** ele cadastra uma organização `FACTORY` com nome válido
**Então** a fábrica é criada com `status = ACTIVE`.

## AC-NET-002-01 — Criar rede

**Dado** um `FACTORY_ADMIN` da fábrica X sem rede
**Quando** ele cria a rede "Rede X"
**Então** existe uma `factory_networks` com `factory_id = X` e `status = ACTIVE`.

## AC-NET-002-02 — Só fábrica pode ter rede

**Dado** um `FACTORY_ADMIN`
**Quando** o sistema tenta vincular a rede a uma organização `RESELLER`
**Então** a operação é rejeitada.

## AC-NET-003-01 — Convidar revendedora

**Dado** um `FACTORY_ADMIN` da rede X
**Quando** ele convida `loja@exemplo.com`
**Então** há um `network_members` `status = INVITED` com token
**E** um email de convite é enviado.

## AC-NET-004-01 — Aceitar convite

**Dado** um convite válido para `loja@exemplo.com`
**Quando** o usuário autenticado com esse email abre `/convite/[token]` e aceita
**Então** o `network_members` fica `ACTIVE` com `joined_at` preenchido
**E** a revendedora passa a ver a rede X.

## AC-NET-004-02 — Convite expirado

**Dado** um convite com mais de 14 dias
**Quando** o usuário tenta aceitar
**Então** a mensagem "Convite inválido ou expirado" é exibida
**E** nenhum vínculo é criado.

## AC-NET-004-03 — Email divergente

**Dado** um convite para `a@x.com`
**Quando** um usuário `b@y.com` autenticado tenta aceitar
**Então** o aceite é recusado.

## AC-NET-005-01 — Registro do vínculo

**Dado** um aceite bem-sucedido
**Então** existe `organization_members` ativo da revendedora
**E** `network_members` ativo ligando revendedora e rede.

## AC-NET-006-01 — Listar membros

**Dado** um `FACTORY_ADMIN` da rede X com 3 revendedoras (2 ativas, 1 convidada)
**Quando** ele abre a lista de membros
**Então** vê as 3 com seus status.

## AC-NET-007-01 — Desativar acesso

**Dado** uma revendedora ativa na rede X
**Quando** o `FACTORY_ADMIN` a desativa
**Então** `status = DISABLED`
**E** ela deixa de ver ofertas/negociações e o diretório da rede X
**E** seus próprios produtos/estoque/vendas continuam acessíveis a ela.

## AC-NET-008-01 — Isolamento entre redes

**Dado** as redes X e Y e uma revendedora só na X
**Quando** ela tenta acessar dados/ofertas da rede Y
**Então** o resultado é vazio.

## AC-NET-008-02 — Diretório não expõe operação

**Dado** uma revendedora navegando o diretório da rede X
**Quando** ela abre o perfil de outra revendedora
**Então** vê dados públicos (nome, localização, vitrine de ofertas)
**E não** vê estoque completo, clientes, vendas ou faturamento.
