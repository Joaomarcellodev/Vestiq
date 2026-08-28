# ACCEPTANCE — Autenticação

## AC-AUTH-001-01 — Login com credenciais válidas

**Dado** um usuário registrado com email `r@marca.com.br` e senha `secreta`
**Quando** ele envia o formulário de login com essas credenciais
**Então** uma sessão é criada
**E** ele é redirecionado para `/dashboard`.

## AC-AUTH-001-02 — Login com credenciais inválidas

**Dado** um usuário na tela de login
**Quando** ele envia email ou senha incorretos
**Então** a mensagem "Email ou senha incorretos." é exibida
**E** nenhuma sessão é criada
**E** o campo de email permanece preenchido.

## AC-AUTH-001-03 — Validação de formato

**Dado** um usuário na tela de login
**Quando** ele envia o email `"nao-e-email"`
**Então** a mensagem "Email inválido." aparece no campo de email
**E** nenhuma requisição de autenticação é feita.

## AC-AUTH-001-04 — Login social

**Dado** um usuário na tela de login
**Quando** ele aciona "Google"
**Então** ele é enviado ao consentimento do provedor
**E** ao retornar com um código válido em `/auth/callback`, a sessão é criada
**E** ele é redirecionado para o destino solicitado (ou `/dashboard`).

## AC-AUTH-001-05 — Falha no callback social

**Dado** um retorno em `/auth/callback` sem `code` ou com código inválido
**Quando** a rota é processada
**Então** o usuário é redirecionado para `/login?error=oauth`
**E** um aviso de falha no login social é exibido.

## AC-AUTH-002-01 — Logout

**Dado** um usuário autenticado
**Quando** ele aciona "Sair da conta"
**Então** a sessão é encerrada
**E** ele é redirecionado para `/login`
**E** acessar `/dashboard` em seguida redireciona de volta para `/login`.

## AC-AUTH-003-01 — Rota privada sem sessão

**Dado** um visitante sem sessão
**Quando** ele acessa `/dashboard`
**Então** ele é redirecionado para `/login?next=/dashboard`.

## AC-AUTH-003-02 — Retorno ao destino após login

**Dado** um visitante redirecionado para `/login?next=/vendas`
**Quando** ele faz login com sucesso
**Então** ele é levado a `/vendas`.

## AC-AUTH-003-03 — Proteção contra open redirect

**Dado** a URL `/login?next=https://malicioso.example`
**Quando** o usuário faz login com sucesso
**Então** ele é redirecionado para `/dashboard`, não para o domínio externo.

## AC-AUTH-003-04 — Usuário autenticado em /login

**Dado** um usuário já autenticado
**Quando** ele acessa `/login`
**Então** ele é redirecionado para `/dashboard`.

## AC-AUTH-004-01 — Acesso negado por papel

**Dado** um usuário com papel `RESELLER`
**Quando** ele tenta executar uma ação restrita a `FACTORY_ADMIN`
**Então** a ação é recusada
**E** nenhum dado é alterado.

## AC-AUTH-004-02 — Acesso negado por organização (RLS)

**Dado** uma revendedora A autenticada
**Quando** ela consulta dados da revendedora B
**Então** o resultado é vazio (RLS), independentemente da UI.

## AC-AUTH-004-03 — Usuário sem organização

**Dado** um usuário autenticado sem `organization_members` ativo
**Quando** ele acessa a área autenticada
**Então** ele vê a tela "aguardando convite"
**E** não consegue ler dados de nenhuma organização.
