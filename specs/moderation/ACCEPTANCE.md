# ACCEPTANCE — Denúncias e moderação

## AC-MOD-001-01 — Denunciar uma oferta

**Dado** uma revendedora vendo a oferta de outra loja da rede
**Quando** toca em "Denunciar oferta", escolhe "Produto falsificado" e envia
**Então** volta para a oferta com "Denúncia enviada. A moderação do Vestiq vai analisar."
**E** a denúncia fica aberta para o administrador da plataforma.

## AC-MOD-001-02 — Conversa e revendedora

**Dado** uma negociação ou o perfil público de outra revendedora
**Quando** a revendedora usa "Denunciar conversa" ou "Denunciar revendedora"
**Então** a denúncia é registrada contra a outra loja.

## AC-MOD-001-03 — Sigilo

**Dado** duas revendedoras que denunciaram a mesma loja
**Então** cada uma vê só a própria denúncia
**E** a loja denunciada não vê nenhuma.

## AC-MOD-001-04 — Sem repetição e sem alvo invisível

**Dado** uma denúncia aberta da revendedora sobre a oferta X
**Quando** ela denuncia X de novo
**Então** vê "Você já denunciou isto. A moderação vai analisar."
**E** ninguém denuncia o que não vê nem a própria loja.

## AC-MOD-002-01 — Fila restrita

**Dado** um usuário que não é `PLATFORM_ADMIN`
**Quando** abre `/moderacao`
**Então** vê a página de "não encontrado" e as funções de moderação recusam a chamada.

## AC-MOD-002-02 — Fila filtrável

**Dado** o administrador da plataforma
**Quando** entra no Vestiq
**Então** cai em `/moderacao` com as denúncias abertas
**E** alterna entre Abertas, Resolvidas, Arquivadas e Todas.

## AC-MOD-003-01 — Arquivar

**Dado** uma denúncia aberta
**Quando** o admin escreve o motivo e toca em "Arquivar denúncia"
**Então** a denúncia fica "Arquivada" com o motivo e a data.

## AC-MOD-003-02 — Remover oferta

**Dado** uma denúncia aberta de oferta ativa
**Quando** o admin confirma "Remover oferta" com motivo
**Então** a oferta é cancelada e sai da rede
**E** todas as denúncias abertas dela ficam "Resolvida com ação".

## AC-MOD-003-03 — Suspender e reativar

**Dado** uma denúncia aberta
**Quando** o admin confirma "Suspender loja" com motivo
**Então** a loja fica suspensa e entra em "Lojas suspensas"
**E** pode ser reativada com motivo, voltando a ter acesso e ofertas na rede.

## AC-MOD-004-01 — Loja suspensa não entra

**Dado** um usuário de uma loja suspensa
**Quando** tenta entrar
**Então** o login é recusado com a mensagem de suspensão e o motivo
**E** uma sessão que já estava aberta é levada para `/conta-suspensa`.
