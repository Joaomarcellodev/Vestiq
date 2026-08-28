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

**Opção B — limpar o histórico:**

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --tree-filter \
 'for f in scripts/seed.mjs src/test/supabase.ts; do \
   [ -f "$f" ] && sed -i "s/sb_secret_[A-Za-z0-9_-]*/x/g;s/sb_publishable_[A-Za-z0-9_-]*/x/g" "$f" || true; \
  done; true' -- --all
```

Depois:

```bash
git push --force-with-lease origin main develop
```

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

> `NEXT_PUBLIC_SITE_URL` **não** é necessária — o código usa a `URL` que o Netlify
> injeta no build. Só defina se usar domínio próprio.
>
> `SUPABASE_SECRET_KEY` **não** é usada pelo app em produção (só em seeds/scripts).

Depois de adicionar as variáveis: **Deploys → Trigger deploy → Deploy site**.

## 4. Configurar o Supabase para o domínio do Netlify

Anote a URL final (ex.: `https://vestiq.netlify.app`) e vá em
**Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://vestiq.netlify.app`
- **Redirect URLs:** adicione `https://vestiq.netlify.app/**`

Sem isso o login por **email/senha funciona**, mas login social e recuperação de
senha falham (redirect não autorizado).

Login social (opcional): **Authentication → Providers** → configure Client ID /
Secret de Google e Apple.

---

## Pronto

- Cada `git push` na `main` dispara um novo deploy.
- Usuários de teste (senha `vestiq123`): `revenda@vestiq.dev`, `revenda2@vestiq.dev`,
  `fabrica@vestiq.dev` — já existem no banco hospedado (seed).
- Schema: migrations 0001–0013 já aplicadas ao projeto hospedado.

## Deploy pela CLI (alternativa)

```bash
npm i -g netlify-cli
netlify login
netlify link            # escolher o site já criado
netlify deploy --prod
```
