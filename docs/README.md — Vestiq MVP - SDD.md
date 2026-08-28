<div align="center">

# Vestiq

### A plataforma que conecta marcas e revendedoras.

O **Vestiq** é uma plataforma B2B2B desenvolvida para fortalecer redes de revendedoras de moda, oferecendo gestão do negócio, controle de estoque e uma rede privada para circulação de mercadorias entre revendedoras vinculadas a uma fábrica.

<br/>

<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />

</div>

---

# 1. Visão do Produto

O **Vestiq** nasce para resolver dois problemas complementares do mercado de revenda de moda.

De um lado, pequenas revendedoras e sacoleiras precisam controlar produtos, estoque, clientes e vendas de maneira mais organizada.

Do outro, peças compradas podem apresentar baixo giro em determinada região ou para determinada revendedora, enquanto outra revendedora da mesma rede pode possuir demanda exatamente por aquele produto.

O Vestiq transforma esse problema em uma rede.

```text
                        FÁBRICA
                           │
                    contrata o Vestiq
                           │
                           ▼
                     REDE VESTIQ
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     Revendedora A    Revendedora B    Revendedora C
          │                │                │
          └──── negociação de estoque ──────┘
```

A **fábrica é o cliente pagante**.

As **revendedoras são as principais usuárias do produto**.

A fábrica disponibiliza o Vestiq como um benefício para sua rede, utilizando a plataforma como ferramenta de:

- atração de novas revendedoras;
- retenção da rede existente;
- fortalecimento do relacionamento com suas revendedoras;
- redução da percepção de risco sobre estoque parado;
- diferenciação comercial da marca.

---

# 2. Proposta de Valor

## Para a fábrica

> Fortaleça sua rede de revendedoras oferecendo uma infraestrutura digital de gestão e circulação de mercadorias.

## Para a revendedora

> Gerencie seu negócio e conecte seu estoque às oportunidades existentes dentro da sua própria rede.

---

# 3. Pilares do Produto

O Vestiq possui três pilares principais.

### GERIR

A revendedora administra seu próprio negócio.

- produtos;
- variações;
- estoque;
- clientes;
- vendas;
- histórico;
- indicadores.

### CONECTAR

A fábrica cria uma rede privada de revendedoras.

- convite de revendedoras;
- vínculo com a fábrica;
- membros da rede;
- controle de acesso;
- ambiente compartilhado de oportunidades.

### NEGOCIAR

As revendedoras podem disponibilizar e procurar mercadorias dentro da rede.

- oferta de peças;
- procura de mercadorias;
- proposta;
- aceite;
- conclusão;
- cancelamento;
- histórico.

---

# 4. Modelo de Negócio

O Vestiq segue inicialmente um modelo **B2B SaaS patrocinado pela fábrica**.

```text
FÁBRICA
   │
   │ assinatura
   ▼
VESTIQ
   │
   │ acesso patrocinado
   ▼
REVENDEDORAS
```

A revendedora não precisa contratar individualmente o sistema.

A fábrica contrata o Vestiq e disponibiliza o serviço para sua rede.

## Monetização inicial

Modelo sugerido:

```text
Mensalidade base da fábrica
+
Quantidade de revendedoras ativas
```

Também poderão existir futuramente:

- planos por quantidade de revendedoras;
- contratos Enterprise;
- personalização de marca;
- integrações;
- analytics avançado;
- contratos de exclusividade territorial, regional ou comercial.

> Valores financeiros não fazem parte da especificação do MVP e deverão ser validados comercialmente.

---

# 5. Escopo do MVP

O objetivo do MVP não é construir todo o ecossistema idealizado.

O objetivo é validar esta hipótese:

> **Uma fábrica percebe valor em disponibilizar uma plataforma de gestão e circulação de mercadorias para fortalecer sua rede de revendedoras?**

O MVP deverá permitir executar de ponta a ponta:

```text
Fábrica cria sua rede
        ↓
Revendedora entra na rede
        ↓
Revendedora cadastra produtos
        ↓
Controla estoque
        ↓
Registra vendas
        ↓
Identifica mercadoria disponível
        ↓
Publica uma oferta na rede
        ↓
Outra revendedora encontra a oferta
        ↓
Envia uma proposta
        ↓
A proposta é aceita
        ↓
Negociação é concluída
        ↓
Estoques são atualizados
        ↓
Histórico é preservado
```

---

# 6. Fora do Escopo do MVP

Não serão implementados inicialmente:

- marketplace público;
- catálogo de atacado da fábrica;
- compra direta da fábrica pelo Vestiq;
- gateway de pagamento;
- split de pagamento;
- comissão por transação;
- emissão fiscal;
- integração com transportadoras;
- rastreamento logístico;
- chat em tempo real;
- inteligência artificial;
- aplicativo mobile nativo;
- múltiplas moedas;
- sistema financeiro completo;
- integração com ERP da fábrica;
- marketplace entre redes diferentes;
- exclusividade automatizada;
- sistema avançado de reputação.

Esses itens pertencem ao roadmap futuro.

---

# 7. Perfis de Usuário

## PLATFORM_ADMIN

Administrador do Vestiq.

Responsável por:

- fábricas;
- organizações;
- usuários;
- redes;
- suporte;
- moderação;
- configurações da plataforma.

---

## FACTORY_ADMIN

Administrador da fábrica contratante.

Responsável por:

- dados da fábrica;
- rede;
- convite de revendedoras;
- membros;
- indicadores permitidos da rede.

---

## RESELLER

Revendedora vinculada a uma fábrica.

Responsável por:

- seus produtos;
- estoque;
- clientes;
- vendas;
- ofertas;
- propostas;
- negociações.

---

# 8. Princípio de Privacidade

Uma revendedora pertence a uma rede, mas seus dados operacionais continuam privados.

Por padrão, outra revendedora **não poderá visualizar**:

- estoque completo;
- clientes;
- vendas;
- faturamento;
- margem;
- histórico comercial privado.

A rede deverá visualizar apenas dados explicitamente disponibilizados para negociação.

Exemplo:

```text
ESTOQUE PRIVADO

Vestido Floral
P: 8
M: 3
G: 1
```

A revendedora decide anunciar:

```text
OFERTA NA REDE

Vestido Floral
Tamanho P
Quantidade disponível: 4
```

A rede visualiza apenas as quatro unidades anunciadas.

---

# 9. Requisitos Funcionais

## Autenticação

### RF-AUTH-001

O sistema deve permitir autenticação de usuários.

### RF-AUTH-002

O sistema deve permitir encerramento da sessão.

### RF-AUTH-003

O sistema deve proteger rotas privadas contra usuários não autenticados.

### RF-AUTH-004

O sistema deve controlar acesso conforme o papel do usuário.

---

# 10. Fábricas e Redes

### RF-NET-001

O sistema deve permitir cadastrar uma fábrica.

### RF-NET-002

O sistema deve permitir criar uma rede vinculada à fábrica.

### RF-NET-003

O administrador da fábrica deve poder convidar revendedoras.

### RF-NET-004

Uma revendedora deve poder aceitar um convite.

### RF-NET-005

O sistema deve registrar o vínculo entre revendedora e fábrica.

### RF-NET-006

A fábrica deve poder visualizar os membros de sua rede.

### RF-NET-007

A fábrica deve poder desativar o acesso de uma revendedora à sua rede.

### RF-NET-008

Revendedoras não devem acessar redes às quais não pertencem.

---

# 11. Gestão de Produtos

### RF-PROD-001

A revendedora deve poder cadastrar categorias.

### RF-PROD-002

A revendedora deve poder cadastrar produtos.

### RF-PROD-003

Produtos devem possuir variações.

### RF-PROD-004

Uma variação poderá possuir:

- tamanho;
- cor;
- SKU.

### RF-PROD-005

A revendedora deve poder editar produtos.

### RF-PROD-006

A revendedora deve poder desativar produtos sem excluir o histórico.

---

# 12. Estoque

### RF-INV-001

O estoque deve ser controlado por variação.

### RF-INV-002

O sistema deve registrar movimentações de:

```text
ENTRADA
SAIDA
AJUSTE
VENDA
CANCELAMENTO
TRANSFERENCIA_ENTRADA
TRANSFERENCIA_SAIDA
```

### RF-INV-003

Toda alteração de estoque deve possuir uma movimentação correspondente.

### RF-INV-004

O sistema deve manter histórico de movimentações.

### RF-INV-005

O sistema deve impedir estoque negativo.

### RF-INV-006

Movimentações concluídas não devem ser silenciosamente apagadas.

---

# 13. Clientes

### RF-CUSTOMER-001

A revendedora deve poder cadastrar clientes.

### RF-CUSTOMER-002

A revendedora deve poder editar seus clientes.

### RF-CUSTOMER-003

Uma revendedora somente poderá acessar seus próprios clientes.

### RF-CUSTOMER-004

O sistema deve permitir consultar o histórico de compras do cliente.

---

# 14. Vendas

### RF-SALE-001

A revendedora deve poder registrar vendas.

### RF-SALE-002

Uma venda poderá possuir múltiplos itens.

### RF-SALE-003

Cada item deve identificar:

- produto;
- variação;
- quantidade;
- preço.

### RF-SALE-004

O sistema deve permitir registrar desconto.

### RF-SALE-005

O sistema deve registrar a forma de pagamento.

### RF-SALE-006

A confirmação da venda deve atualizar o estoque.

### RF-SALE-007

O sistema deve bloquear venda acima do estoque disponível.

### RF-SALE-008

Uma venda cancelada deve permanecer no histórico.

### RF-SALE-009

O cancelamento deve estornar as respectivas unidades ao estoque.

---

# 15. Rede de Oportunidades

### RF-OFFER-001

Uma revendedora deve poder disponibilizar parte de seu estoque para negociação.

### RF-OFFER-002

Uma oferta deverá possuir:

- produto;
- variação;
- quantidade;
- preço ou condição proposta;
- observação;
- status.

### RF-OFFER-003

A quantidade anunciada não pode ser superior ao estoque disponível.

### RF-OFFER-004

Revendedoras da mesma rede devem poder visualizar ofertas ativas.

### RF-OFFER-005

Ofertas de outras redes não devem ser acessíveis.

### RF-OFFER-006

A revendedora proprietária deve poder cancelar uma oferta ainda não negociada.

### RF-OFFER-007

A quantidade ofertada deve ser atualizada quando houver negociação concluída.

---

# 16. Negociação

### RF-NEG-001

Uma revendedora deve poder enviar proposta sobre uma oferta.

### RF-NEG-002

A proposta deve registrar:

- compradora/interessada;
- vendedora;
- oferta;
- quantidade;
- valor;
- mensagem opcional;
- status.

### RF-NEG-003

Estados previstos:

```text
PENDING
ACCEPTED
REJECTED
CANCELLED
COMPLETED
```

### RF-NEG-004

A proprietária da oferta poderá aceitar ou rejeitar a proposta.

### RF-NEG-005

A interessada poderá cancelar proposta pendente.

### RF-NEG-006

Uma negociação aceita deverá poder ser marcada como concluída.

### RF-NEG-007

A conclusão deverá gerar movimentações de estoque.

Na revendedora de origem:

```text
TRANSFERENCIA_SAIDA
```

Na revendedora de destino:

```text
TRANSFERENCIA_ENTRADA
```

### RF-NEG-008

A operação deve ser transacional.

Se uma das movimentações falhar, nenhuma deverá ser persistida.

### RF-NEG-009

O histórico da negociação deve permanecer armazenado.

---

# 17. Dashboard da Revendedora

### RF-DASH-001

Apresentar:

- estoque atual;
- produtos com estoque baixo;
- vendas;
- faturamento;
- ticket médio;
- produtos mais vendidos;
- ofertas ativas;
- negociações pendentes.

---

# 18. Dashboard da Fábrica

### RF-FACTORY-DASH-001

A fábrica deve visualizar:

- quantidade de revendedoras cadastradas;
- revendedoras ativas;
- quantidade de ofertas;
- negociações iniciadas;
- negociações concluídas;
- taxa de utilização da plataforma.

O dashboard da fábrica **não deverá expor automaticamente dados comerciais privados de cada revendedora**.

---

# 19. Requisitos Não Funcionais

Os requisitos não funcionais representam atributos de qualidade do Vestiq.

## Desempenho

### RNF-PERF-001

95% das páginas principais devem apresentar resposta inicial em até 2 segundos sob carga operacional normal.

### RNF-PERF-002

Pesquisas e filtros devem retornar resposta inicial em até 2 segundos em condições normais.

---

## Segurança

### RNF-SEC-001

Todo tráfego de produção deverá utilizar HTTPS.

### RNF-SEC-002

Dados de diferentes organizações devem possuir isolamento lógico.

### RNF-SEC-003

O banco deverá utilizar políticas RLS para isolamento das organizações.

### RNF-SEC-004

Nenhuma Service Role Key poderá ser disponibilizada no cliente.

### RNF-SEC-005

Rotas críticas deverão validar autenticação e autorização.

---

## Confiabilidade

### RNF-REL-001

Operações de venda e transferência de estoque deverão ser atômicas.

### RNF-REL-002

Uma falha intermediária não poderá produzir estoques inconsistentes.

### RNF-REL-003

Operações críticas devem manter histórico auditável.

---

## Usabilidade

### RNF-USA-001

A aplicação deve ser responsiva.

### RNF-USA-002

Todos os fluxos essenciais deverão funcionar em smartphones.

### RNF-USA-003

Interfaces assíncronas deverão apresentar:

- loading;
- empty state;
- success;
- error.

---

## Acessibilidade

### RNF-ACC-001

Os principais fluxos deverão buscar conformidade com WCAG 2.1 AA.

---

## Manutenibilidade

### RNF-MNT-001

Domínios devem possuir responsabilidades separadas.

### RNF-MNT-002

Componentes visuais deverão seguir Atomic Design.

### RNF-MNT-003

Código novo deve seguir tipagem TypeScript estrita sempre que aplicável.

---

## Testabilidade

### RNF-TEST-001

100% dos requisitos funcionais do MVP deverão estar associados a pelo menos um caso de teste.

### RNF-TEST-002

100% das regras críticas de estoque e negociação deverão possuir testes automatizados.

### RNF-TEST-003

Os fluxos críticos deverão possuir testes E2E.

---

# 20. Stack

## Front-end / Full-stack

- Next.js
- React
- TypeScript

## UI

- Tailwind CSS
- Atomic Design

## Backend

- Supabase

## Banco

- PostgreSQL

## Auth

- Supabase Auth

## Segurança de dados

- Supabase Row Level Security

## Versionamento

- Git
- GitHub

---

# 21. Atomic Design

A interface seguirá a metodologia **Atomic Design**.

```text
components/
│
├── atoms/
├── molecules/
├── organisms/
└── templates/
```

## Atoms

Exemplos:

```text
Button
Input
Label
Badge
Avatar
IconButton
Spinner
```

## Molecules

```text
SearchInput
ProductCardHeader
PriceField
StockBadge
UserMenu
```

## Organisms

```text
Sidebar
ProductForm
InventoryTable
OfferCard
NegotiationPanel
SalesTable
```

## Templates

```text
DashboardTemplate
ManagementTemplate
MarketplaceTemplate
AuthTemplate
```

As páginas do App Router deverão compor templates e features, evitando concentração de regras de negócio diretamente nas páginas.

---

# 22. Organização por Domínio

```text
src/
├── app/
│
├── components/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
│
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── products/
│   ├── inventory/
│   ├── customers/
│   ├── sales/
│   ├── network/
│   ├── offers/
│   ├── negotiations/
│   └── dashboard/
│
├── lib/
│   └── supabase/
│
├── services/
├── types/
├── validations/
└── utils/
```

---

# 23. Modelo de Dados Inicial

```text
profiles
organizations
organization_members

factory_networks
network_members

categories
products
product_variants

inventory_movements

customers

sales
sale_items

offers

negotiations
negotiation_events
```

---

# 24. Organizações

```text
organizations

id
name
type
status
created_at
```

Tipos:

```text
FACTORY
RESELLER
PLATFORM
```

---

# 25. Membership

```text
organization_members

id
organization_id
user_id
role
status
```

---

# 26. Rede

```text
factory_networks

id
factory_id
name
status
created_at
```

```text
network_members

id
network_id
reseller_id
status
joined_at
```

---

# 27. Estoque

O saldo não deverá ser tratado como uma informação sem origem.

A fonte de rastreabilidade será:

```text
inventory_movements
```

Exemplo:

```text
ENTRADA               +20
VENDA                   -3
TRANSFERENCIA_SAIDA     -4
AJUSTE                  -1
──────────────────────────
SALDO                   12
```

---

# 28. Isolamento Multi-Tenant

O sistema é multi-organização.

Toda tabela de domínio aplicável deverá possuir uma referência explícita à organização proprietária dos dados.

Exemplo:

```text
organization_id
```

RLS deve garantir:

```text
Revendedora A
    ↓
somente dados da Revendedora A
```

exceto conteúdos explicitamente publicados na rede.

---

# 29. Specification-Driven Development

O desenvolvimento do Vestiq seguirá **SDD — Specification-Driven Development**.

Nenhuma feature deverá começar pela implementação.

Fluxo obrigatório:

```text
PROBLEMA
   ↓
REQUISITO
   ↓
USER STORY
   ↓
CRITÉRIOS DE ACEITAÇÃO
   ↓
CASOS DE TESTE
   ↓
DESIGN TÉCNICO
   ↓
TASKS
   ↓
IMPLEMENTAÇÃO
   ↓
VALIDAÇÃO
```

---

# 30. Estrutura de Especificações

```text
specs/
├── auth/
├── organizations/
├── catalog/
├── inventory/
├── customers/
├── sales/
├── network/
├── offers/
├── negotiations/
└── dashboard/
```

Cada feature deverá possuir:

```text
SPEC.md
ACCEPTANCE.md
TESTS.md
```

Quando necessário:

```text
ADR.md
```

---

# 31. Template de SPEC

```md
# SPEC-XXX — Nome

## Contexto

## Problema

## Objetivo

## Escopo

## Fora do Escopo

## Atores

## Requisitos Relacionados

## Regras de Negócio

## Fluxo Principal

## Fluxos Alternativos

## Estados

## Critérios de Aceitação

## Modelo de Dados

## Segurança

## Casos de Erro

## Testes Esperados
```

---

# 32. Rastreabilidade

Todo requisito deve possuir rastreabilidade completa.

Exemplo:

```text
RF-NEG-007
      ↓
US-NEG-004
      ↓
AC-NEG-007-01
AC-NEG-007-02
      ↓
TC-NEG-007-01
TC-NEG-007-02
      ↓
Implementação
      ↓
Pull Request
```

A meta do MVP é:

> **100% dos requisitos funcionais rastreáveis até seus respectivos critérios de aceitação e testes.**

---

# 33. Critérios de Aceitação

Exemplo:

### US — Concluir negociação

> Como revendedora, quero concluir uma negociação aceita para que a transferência de mercadoria seja registrada.

### AC-001

**Dado** que a negociação esteja `ACCEPTED`  
**E** exista estoque suficiente na origem  
**Quando** a negociação for concluída  
**Então** deverá ser criada uma `TRANSFERENCIA_SAIDA`.

### AC-002

**Então** deverá ser criada uma `TRANSFERENCIA_ENTRADA` correspondente no destino.

### AC-003

As duas movimentações deverão ocorrer na mesma operação transacional.

### AC-004

Se qualquer movimentação falhar:

> nenhuma alteração de estoque deve permanecer salva.

---

# 34. Test Strategy

## Unit

Utilizar para:

- cálculos;
- validações;
- transições de estado;
- regras de estoque;
- regras de negociação.

## Integration

Utilizar para:

- Supabase;
- banco;
- policies;
- repositories;
- operações transacionais.

## Component

Utilizar para:

- formulários;
- componentes interativos;
- estados;
- validações de interface.

## E2E

Utilizar para os principais fluxos de negócio.

---

# 35. Fluxo E2E Principal

```text
Factory Admin faz login
        ↓
Cria rede
        ↓
Convida revendedora
        ↓
Revendedora aceita convite
        ↓
Cadastra categoria
        ↓
Cadastra produto
        ↓
Cria variação
        ↓
Registra entrada de estoque
        ↓
Publica oferta
        ↓
Segunda revendedora encontra oferta
        ↓
Envia proposta
        ↓
Primeira aceita
        ↓
Negociação é concluída
        ↓
Estoque de origem diminui
        ↓
Estoque de destino aumenta
        ↓
Histórico permanece registrado
```

Esse fluxo deverá possuir teste automatizado E2E antes da release do MVP.

---

# 36. Definition of Ready

Uma história somente poderá entrar em desenvolvimento se:

- possuir especificação;
- possuir requisito relacionado;
- possuir ator;
- possuir objetivo;
- possuir critérios de aceitação;
- regras de negócio estiverem claras;
- dependências estiverem identificadas;
- cenários de erro estiverem definidos;
- testes esperados estiverem descritos.

---

# 37. Definition of Done

Uma história somente poderá ser considerada `DONE` quando:

- implementação estiver concluída;
- critérios de aceitação estiverem atendidos;
- TypeScript estiver sem erros;
- lint estiver aprovado;
- testes unitários previstos estiverem aprovados;
- testes de integração previstos estiverem aprovados;
- E2E estiver aprovado quando aplicável;
- RLS tiver sido validada quando aplicável;
- Pull Request estiver revisado;
- documentação estiver atualizada;
- requisito possuir rastreabilidade;
- código estiver integrado.

---

# 38. Política de Cobertura

O projeto possui como objetivo **100% de cobertura de especificação do MVP**.

Isso significa:

```text
100% Requisitos
      ↓
100% Histórias relacionadas
      ↓
100% Critérios de Aceitação
      ↓
100% Casos de Teste definidos
```

Para regras críticas:

```text
Estoque
Negociação
Transferência
Autorização
Isolamento de dados
```

a exigência é de **100% das regras explicitamente cobertas por testes automatizados**.

Cobertura de linhas de código será utilizada como indicador auxiliar e não como substituto para cobertura comportamental.

---

# 39. Sprints do MVP

## Sprint 0 — Discovery & Foundation

### Objetivo

Validar o problema e preparar a fundação técnica.

Entregas:

- entrevistar ao menos uma fábrica;
- entrevistar revendedoras;
- validar fluxo de estoque parado;
- validar troca/venda entre revendedoras;
- validar disposição da fábrica em pagar;
- fechar regras do MVP;
- configurar projeto;
- configurar Supabase;
- configurar CI;
- estabelecer SDD;
- criar backlog.

---

## Sprint 1 — Identity & Network

### Objetivo

Construir a estrutura multi-organização.

Implementar:

- login;
- organizations;
- FACTORY;
- RESELLER;
- memberships;
- network;
- convites;
- RLS.

---

## Sprint 2 — Catalog

### Objetivo

Permitir gestão do catálogo da revendedora.

Implementar:

- categorias;
- produtos;
- variações;
- SKU;
- edição;
- desativação.

---

## Sprint 3 — Operations

### Objetivo

Permitir que a revendedora gerencie seu negócio.

Implementar:

- estoque;
- movimentações;
- clientes;
- vendas;
- cancelamento;
- estorno.

---

## Sprint 4 — Network Marketplace

### Objetivo

Permitir circulação de peças dentro da rede.

Implementar:

- ofertas;
- disponibilidade;
- busca;
- filtros;
- detalhes da oferta;
- privacidade entre revendedoras.

---

## Sprint 5 — Negotiations

### Objetivo

Completar o fluxo de negociação.

Implementar:

- proposta;
- aceite;
- recusa;
- cancelamento;
- conclusão;
- transferência transacional de estoque;
- histórico.

---

## Sprint 6 — Factory Dashboard

### Objetivo

Entregar valor ao cliente pagante.

Implementar:

- revendedoras da rede;
- convites;
- revendedoras ativas;
- indicadores de adoção;
- ofertas;
- negociações;
- informações agregadas permitidas.

---

## Sprint 7 — Stabilization & Pilot

### Objetivo

Preparar o Vestiq para utilização piloto.

Executar:

- testes E2E;
- auditoria de RLS;
- auditoria de segurança;
- responsividade;
- acessibilidade;
- performance;
- correção de Blockers;
- correção de Criticals;
- teste com fábrica;
- teste com revendedoras;
- documentação;
- release.

Release:

```text
v1.0.0
```

---

# 40. Git Workflow

```text
main
  ↑
develop
  ↑
├── feature/*
├── fix/*
├── refactor/*
└── test/*
```

Fluxo:

```text
SPEC
 ↓
Issue
 ↓
Branch
 ↓
Implementation
 ↓
Tests
 ↓
Pull Request
 ↓
Code Review
 ↓
Merge
```

---

# 41. Conventional Commits

```text
feat:
fix:
test:
refactor:
docs:
chore:
perf:
```

Exemplos:

```bash
feat: add reseller network invitations
```

```bash
feat: add inventory transfer workflow
```

```bash
test: cover negotiation completion transaction
```

```bash
fix: prevent cross-organization offer access
```

---

# 42. Pull Request Requirements

Todo PR deve informar:

```text
Spec:
Requirement:
User Story:
Acceptance Criteria:
Tests:
Security impact:
Database impact:
```

Checklist:

- [ ] SPEC implementada
- [ ] critérios atendidos
- [ ] testes aprovados
- [ ] TypeScript aprovado
- [ ] lint aprovado
- [ ] RLS revisada
- [ ] sem secrets
- [ ] migration revisada
- [ ] documentação atualizada

---

# 43. Roadmap Pós-MVP

Possíveis evoluções:

- plano de exclusividade para fábricas;
- múltiplas redes por região;
- reputação;
- chat;
- venda de peças entre revendedoras;
- pagamento dentro da plataforma;
- logística;
- catálogo de fábrica;
- pedidos B2B;
- analytics avançado;
- white-label;
- integração com ERP;
- aplicativo mobile;
- inteligência de mercado.

Esses itens não devem contaminar o escopo do MVP.

---

# 44. North Star do MVP

A principal pergunta que o produto precisa responder não é:

> Quantas telas desenvolvemos?

É:

> **Uma fábrica considera valioso oferecer o Vestiq para fortalecer e diferenciar sua rede de revendedoras?**

E, do outro lado:

> **As revendedoras realmente utilizam a gestão e a rede para diminuir o problema de estoque parado e encontrar oportunidades de circulação das peças?**

---

<div align="center">

# Vestiq

### Sua rede vende melhor conectada.

**Gestão para quem revende.  
Rede para quem cresce.  
Valor para quem fabrica.**

</div>
