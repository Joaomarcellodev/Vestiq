# Deploy — Netlify

O Vestiq roda no Netlify com o runtime nativo de Next.js (Next 16 é suportado sem
configuração; o Netlify instala `@netlify/plugin-nextjs` automaticamente).

## 1. Conectar o repositório

No painel do Netlify → **Add new site → Import an existing project → GitHub →
`Joaomarcellodev/Vestiq`**.

- Branch de produção: **`main`**
- Build command: `npm run build` (já no `netlify.toml`)
- Publish directory: detectado automaticamente

## 2. Variáveis de ambiente (Site configuration → Environment variables)

Defina **antes do primeiro build** — as `NEXT_PUBLIC_*` são embutidas no bundle.

| Variável | Valor | Escopo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://inixwmfxufnsxgpvlfku.supabase.co` | Build + Runtime |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_LAjj9wuVIjtFz0GmLmP2KQ_68fEUzqM` | Build + Runtime |
| `SUPABASE_SECRET_KEY` | *(secret key do projeto — Supabase → Settings → API)* | Runtime only |
| `NEXT_PUBLIC_SITE_URL` | *(opcional)* URL final do site, ex. `https://vestiq.netlify.app` | Build + Runtime |

> `NEXT_PUBLIC_SITE_URL` é opcional: sem ela, o código usa a `URL` que o Netlify
> injeta no build. Defina explicitamente se usar domínio próprio.

## 3. Configurar o Supabase para o domínio de produção

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://<seu-site>.netlify.app`
- **Redirect URLs:** adicione `https://<seu-site>.netlify.app/auth/callback`

Sem isso o login por email funciona, mas o **login social (Google/Apple)** e a
recuperação de senha falham (redirect não autorizado).

Para login social também configure os provedores em
**Authentication → Providers** (Client ID/Secret do Google e do Apple).

## 4. Migrations

O schema já foi aplicado ao projeto hospedado (`supabase db push`, migrations
0001–0013). Novas migrations: `npx supabase db push` após `supabase link`.

## 5. Deploy

Cada push na `main` dispara um build. Para deploy manual pela CLI:

```bash
npm i -g netlify-cli
netlify login
netlify link          # escolher o site
netlify deploy --prod
```

## Notas

- `.env` e `.env.local` **não** são versionados; o Netlify usa só as variáveis do
  painel.
- O build não roda testes nem lint (isso é papel do CI — ver `docs/TESTING.md`).
- Storage de avatares: bucket `avatars` já criado pela migration 0012.
