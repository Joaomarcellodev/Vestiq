# Deploy — Netlify (manual)

O Vestiq roda no Netlify com o runtime nativo de Next.js. Next 16 é suportado sem
configuração — o Netlify instala `@netlify/plugin-nextjs` automaticamente.

Dá para fazer **tudo manualmente**, sem CLI. Passos abaixo.

---

## 1. Enviar o código para o GitHub

O histórico tem uma chave do Supabase **local** (Docker, `127.0.0.1`) que foi
fixada em commits antigos e depois removida. O GitHub bloqueia o push por causa
disso. Resolva de uma das formas:

**Opção A — liberar (rápido):**
abra
`https://github.com/Joaomarcellodev/Vestiq/security/secret-scanning/unblock-secret/3IYOJ2oFossXCMf2zXYHNSauIvo`
→ *Allow me to push this secret* (motivo: teste / falso positivo).

**Opção B — limpar o histórico (recomendado):** `develop` nunca foi enviada e
`main` remoto só tem o README, então reescrever é seguro. Na raiz do repo, com a
árvore limpa:

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --tree-filter \
 'for f in scripts/seed.mjs src/test/supabase.ts scripts/scrub-history.sh; do \
   [ -f "$f" ] && sed -i "s#sb_secret_[A-Za-z0-9_-]\{10,\}#x#g; s#sb_publishable_[A-Za-z0-9_-]\{10,\}#x#g" "$f"; \
  done; true' -- --all

git reflog expire --expire=now --all && git gc --prune=now
git push --force-with-lease origin main develop
```

Confere que sumiu: `git log --all -S "sb_secret_" --oneline` deve ficar vazio.

---

## 2. Criar o site no Netlify (sem CLI)

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project → GitHub**
2. Autorize e escolha o repositório **`Joaomarcellodev/Vestiq`**
3. Configuração:
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build` *(já vem do `netlify.toml`)*
   - **Publish directory:** deixe em branco (detectado)
4. **Deploy site**

## 3. Variáveis de ambiente

Site → **Site configuration → Environment variables → Add a variable**.
Só duas — ambas públicas (protegidas por RLS):

| Chave | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://inixwmfxufnsxgpvlfku.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_LAjj9wuVIjtFz0GmLmP2KQ_68fEUzqM` |

> `NEXT_PUBLIC_SITE_URL` **deve** ser definida como
> `https://vestiq-app.netlify.app`. O `src/lib/env.ts` cai no `process.env.URL`
> injetado pelo Netlify, mas se essa variável não estiver disponível no runtime
> da função o fallback vira o default `http://localhost:3000` — e os emails de
> recuperação de senha saem apontando para localhost.
>
> `SUPABASE_SECRET_KEY` **não** é usada pelo app em produção (só em seeds/scripts).

Depois de adicionar as variáveis: **Deploys → Trigger deploy → Deploy site**.

## 4. Configurar o Supabase para o domínio do Netlify

A URL do site é **`https://vestiq-app.netlify.app`**.

> **Atenção:** não confunda com `vestiq.netlify.app` (sem o `-app`) — esse
> subdomínio pertence a um site de outra pessoa, sem relação com este projeto.

Vá em **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://vestiq-app.netlify.app`
- **Redirect URLs:** adicione `https://vestiq-app.netlify.app/**`
  (os dois asteriscos são obrigatórios; sem eles só a raiz é autorizada e o
  retorno em `/auth/callback` é recusado)

Sem isso o login por **email/senha funciona**, mas login social e recuperação de
senha falham (redirect não autorizado).

Login social (opcional): **Authentication → Providers** → configure Client ID /
Secret de Google e Apple.

---

## Pronto

- Cada `git push` na `main` dispara um novo deploy.
- Usuários de teste (senha `vestiq123`): `revenda@vestiq.dev`, `revenda2@vestiq.dev`,
  `fabrica@vestiq.dev` — já existem no banco hospedado (seed).
- Schema: migrations 0001–0015 aplicadas ao projeto hospedado (tabelas e os buckets
  `avatars` e `product-images` verificados em 2026-09-04).

## Deploy pela CLI (alternativa)

```bash
npm i -g netlify-cli
netlify login
netlify link            # escolher o site já criado
netlify deploy --prod
```

---

## Troubleshooting — build falhando no Netlify

O `npm run build` deste repo passa em ambiente limpo (clone sem `.env`, Node 20 e
22, com as duas variáveis públicas definidas). Quando ele quebra **só no
Netlify**, é sempre configuração do site. Os dois modos de falha reproduzíveis:

### 1. `Cannot find module 'tailwindcss'`

```
./src/app/jakarta_*.module.css
Error: Error evaluating Node.js code
Error: Cannot find module 'tailwindcss'
```

`NODE_ENV=production` chegou ao passo de instalação, então o npm pulou as
`devDependencies` — e `tailwindcss`, `postcss` e `typescript` moram lá, mas são
carregados pelo `next build`.

**Corrigido no repo:** `netlify.toml` agora define `NPM_FLAGS = "--include=dev"`,
que força a instalação das devDependencies independentemente do `NODE_ENV`.
Se ainda assim falhar, remova qualquer `NODE_ENV` definido em
**Site configuration → Environment variables** (o Netlify não precisa dele).

### 2. `Failed to collect page data for /auth/callback`

Falta `NEXT_PUBLIC_SUPABASE_URL` e/ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no
build. O `src/lib/env.ts` valida no carregamento do módulo, e o `next build` lê
esses módulos ao coletar page data — então o build inteiro morre.

Confira em **Site configuration → Environment variables**, para cada variável:

- **Scopes:** precisa incluir **Builds** (não só *Functions* / *Runtime*).
- **Deploy contexts:** precisa cobrir o contexto sendo publicado — se estiver em
  *Production* apenas, deploy previews e branch deploys quebram.

O erro agora informa qual variável faltou, em vez do `ZodError` cru.

### Versão do Node

`.nvmrc` e `netlify.toml` estão em **22.11.0**. `@supabase/supabase-js` (2.112+)
declara `engines.node: >=22` — no Node 20 ainda funciona, mas emite aviso de
depreciação. Mantenha os dois arquivos em sincronia.

### Como reproduzir localmente o que o Netlify faz

```bash
git clone . /tmp/repro && cd /tmp/repro   # clone limpo, sem .env
npm ci --include=dev
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... npm run build
```
