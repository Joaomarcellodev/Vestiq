# ACCEPTANCE — Organizações e Membros

## AC-ORG-01 — Organização ativa resolvida no login

**Dado** um usuário membro ativo de exatamente uma organização
**Quando** ele autentica
**Então** essa organização é a ativa
**E** as telas mostram apenas dados dela.

## AC-ORG-02 — Usuário sem membership

**Dado** um usuário autenticado sem `organization_members` com `status = ACTIVE`
**Quando** ele acessa a área autenticada
**Então** ele vê "aguardando convite"
**E** nenhuma query de domínio retorna linhas.

## AC-ORG-03 — Papel efetivo

**Dado** um usuário com `role = RESELLER` na organização ativa
**Quando** o sistema resolve seu papel
**Então** o papel efetivo é `RESELLER`.

## AC-ORG-04 — Autorização por papel

**Dado** um usuário `RESELLER`
**Quando** ele chama uma Action que exige `FACTORY_ADMIN`
**Então** a Action retorna erro de permissão
**E** nada é persistido.

## AC-ORG-05 — Isolamento por organização

**Dado** as organizações A e B, e um usuário membro só de A
**Quando** ele tenta `select` em uma tabela de domínio filtrando por B
**Então** o resultado é vazio.

## AC-ORG-06 — Revogação de acesso

**Dado** um membro `ACTIVE` da organização A
**Quando** seu membership passa a `DISABLED`
**Então** na requisição seguinte ele perde acesso aos dados de A.

## AC-ORG-07 — Cadastro de fábrica pelo PLATFORM_ADMIN

**Dado** um usuário `PLATFORM_ADMIN`
**Quando** ele cadastra uma organização `type = FACTORY`
**Então** a organização é criada com `status = ACTIVE`.

## AC-ORG-08 — Troca de organização ativa

**Dado** um usuário membro ativo de A e B
**Quando** ele seleciona B como ativa
**Então** as telas passam a mostrar dados de B
**E** a preferência persiste entre sessões.
