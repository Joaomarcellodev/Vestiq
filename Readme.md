<div align="center">

# Vestiq

### Gestão inteligente para lojas de moda.

Centralize produtos, estoque, clientes e vendas em uma plataforma simples, moderna e eficiente.

<br />

<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />

</div>

---

## Sobre o Vestiq

O **Vestiq** é uma plataforma de gestão desenvolvida para simplificar a operação de lojas de moda.

Produtos, variações, estoque, clientes e vendas são centralizados em um único ambiente, proporcionando maior controle sobre a operação e informações mais claras para tomada de decisão.

O produto foi projetado com foco em **simplicidade, confiabilidade e escalabilidade**.

---

## Funcionalidades

* **Produtos** — cadastro e gerenciamento do catálogo.
* **Variações** — controle individual por tamanho, cor e SKU.
* **Estoque** — entradas, saídas, ajustes e histórico de movimentações.
* **Clientes** — cadastro e histórico de compras.
* **Vendas** — registro de itens, descontos e formas de pagamento.
* **Dashboard** — indicadores essenciais da operação.
* **Relatórios** — acompanhamento de vendas e estoque.
* **Controle de acesso** — autenticação e permissões por perfil.

---

## Stack

| Tecnologia       | Utilização                                     |
| ---------------- | ---------------------------------------------- |
| **Next.js**      | Framework principal da aplicação               |
| **React**        | Construção da interface                        |
| **TypeScript**   | Tipagem e segurança do código                  |
| **Tailwind CSS** | Interface e responsividade                     |
| **Supabase**     | PostgreSQL, autenticação e serviços de backend |
| **Git**          | Controle de versão                             |
| **GitHub**       | Colaboração, revisão e gerenciamento do código |

---

## Arquitetura

O Vestiq utiliza uma arquitetura modular, mantendo responsabilidades bem definidas entre interface, domínio, serviços e infraestrutura.

```text
src/
├── app/
├── components/
├── features/
├── services/
├── lib/
├── types/
└── utils/
```

Essa organização favorece **manutenção, reutilização, testabilidade e evolução contínua** do produto.

### Domínio

O catálogo diferencia **produtos** de suas **variações comerciais**.

```text
Camiseta Básica
│
├── Preto / P
├── Preto / M
├── Preto / G
│
├── Branco / P
├── Branco / M
└── Branco / G
```

Cada variação possui seu próprio identificador e controle de estoque, permitindo maior precisão sobre a disponibilidade dos produtos.

---

## Estrutura de Dados

Principais entidades do domínio:

```text
stores
profiles

categories
products
product_variants

inventory_movements

customers

sales
sale_items
payments
```

---

## Segurança

A aplicação adota práticas de segurança como:

* autenticação de usuários;
* autorização baseada em perfis;
* Row Level Security (RLS);
* validação de operações críticas;
* proteção de rotas;
* gerenciamento seguro de variáveis de ambiente;
* separação entre credenciais públicas e privilegiadas.

---

## Executando localmente

### 1. Clone o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd vestiq
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie o arquivo `.env.local` com base no `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 4. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:3000
```

---

## Desenvolvimento

O projeto utiliza Pull Requests e revisão de código para integração de novas funcionalidades.

```text
main
 ↑
develop
 ↑
├── feature/*
├── fix/*
└── refactor/*
```

Os commits seguem o padrão **Conventional Commits**:

```text
feat:     nova funcionalidade
fix:      correção
refactor: refatoração
test:     testes
docs:     documentação
chore:    manutenção
```

---

## Roadmap

O desenvolvimento do Vestiq está concentrado inicialmente nos principais fluxos da operação:

* [ ] Autenticação e controle de acesso
* [ ] Produtos e categorias
* [ ] Variações e SKUs
* [ ] Controle de estoque
* [ ] Clientes
* [ ] Vendas
* [ ] Dashboard
* [ ] Relatórios
* [ ] Estabilização do MVP

Evoluções posteriores poderão incluir gestão de fornecedores, compras, inventário, código de barras, múltiplas lojas e integrações externas.

---

## Equipe

**Tech Lead & Developer**
[João Marcello](https://github.com/Joaomarcellodev)

**Backend Developer**
[Wellyson Santos](https://github.com/wss124)

**Backend Developer**
[Guilherme](https://github.com/GuilhermeMede04)


---

<div align="center">

### Vestiq

**Gestão inteligente para lojas de moda.**

Construído com foco em simplicidade, confiabilidade e evolução contínua.

</div>
