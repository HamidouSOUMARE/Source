# Sourcé — RAG documentaire avec sources

Uploadez vos documents, posez des questions en langage naturel, et obtenez des
réponses **sourcées** (citations vers le passage exact + numéro de page).

## Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion |
| LLM | Claude (`claude-haiku-4-5`) avec **Citations natives** |
| Embeddings | Voyage AI (`voyage-3`) |
| Vector DB / Storage / Auth | Supabase (Postgres + pgvector + Storage + Auth anonyme) |
| Parsing | `pdf-parse` (PDF, par page) · `mammoth` (DOCX) |

## Architecture

```
Upload ─▶ Storage Supabase
      └─▶ parse (par page) → chunking → embeddings Voyage → pgvector

Question ─▶ embed (Voyage) → match_chunks (pgvector, top-6)
        └─▶ chunks → Claude Haiku (citations activées)
        └─▶ réponse streamée (NDJSON) + sources cliquables (passage + page)
```

Chaque chunk récupéré est passé à Claude comme un **bloc citable** : l'index de
citation renvoyé par l'API correspond 1:1 au chunk, ce qui donne une
attribution de source précise (fichier + page + texte exact cité).

## Configuration

### 1. Variables d'environnement

Copiez `.env.example` vers `.env.local` et remplissez :

```bash
cp .env.example .env.local
```

- **Supabase** : créez un projet gratuit sur [supabase.com](https://supabase.com),
  puis Settings → API pour l'URL, la clé `anon` et la clé `service_role`.
- **Anthropic** : [console.anthropic.com](https://console.anthropic.com/settings/keys)
- **Voyage AI** : [dashboard.voyageai.com](https://dashboard.voyageai.com/)

### 2. Base de données Supabase

Dans le dashboard Supabase → **SQL Editor** → collez le contenu de
[`supabase/schema.sql`](./supabase/schema.sql) et exécutez.
Cela crée les tables, l'index vectoriel HNSW, les policies RLS, la fonction
`match_chunks` et le bucket de stockage.

### 3. Activer la connexion anonyme

Supabase → **Authentication → Sign In / Providers → Anonymous Sign-ins → activer.**
(Chaque visiteur obtient une identité anonyme ; ses documents lui sont privés via RLS.)

## Lancer

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), déposez un document,
posez une question.

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ingest/route.ts        # upload → parse → chunk → embed → store
│   │   ├── query/route.ts         # embed → retrieve → Claude streaming + citations
│   │   └── documents/             # liste + suppression
│   ├── layout.tsx
│   └── page.tsx                   # orchestration (session, documents, chat)
├── components/
│   ├── document-panel.tsx         # dropzone + liste des documents
│   └── chat-panel.tsx             # chat streamé + sources cliquables
└── lib/
    ├── parse.ts   chunk.ts        # extraction (par page) + découpage
    ├── voyage.ts  anthropic.ts    # embeddings + génération sourcée
    ├── supabase/                  # clients navigateur + serveur (admin)
    ├── session.ts client.ts       # auth anonyme + appels API (stream NDJSON)
    └── types.ts
```

## Licence

MIT — voir [LICENSE](LICENSE).
