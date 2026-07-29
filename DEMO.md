# Deux modes : vitrine & démo live

L'app tourne en deux modes, contrôlés par **une seule variable** : `NEXT_PUBLIC_DEMO_MODE`.

| | Vitrine (A) | Démo live (C) |
|---|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` | absent / `false` |
| Où | Déploiement public (portfolio Malt) | Ton poste, en rendez-vous |
| Auth / Supabase | ❌ aucun | ✅ session anonyme |
| Appels IA (Voyage + Anthropic) | ❌ zéro coût | ✅ tes clés |
| Documents | 3 exemples pré-indexés (lecture seule) | upload réel du client |
| Réponses | scriptées, rejouées avec citations animées | vraie génération RAG |
| Affiner (reformuler) | masqué | actif |

Le visiteur voit exactement la même interface : streaming, sources cliquables,
toggle FR/EN, thème clair/sombre. Seule la source des réponses change.

---

## A — Vitrine publique (déploiement Vercel)

Le mode démo ne nécessite **aucune** clé (ni Supabase, ni IA, ni Turnstile).

1. `vercel` (ou import du repo dans le dashboard Vercel).
2. Dans **Project → Settings → Environment Variables**, ajoute uniquement :
   ```
   NEXT_PUBLIC_DEMO_MODE = true
   ```
3. Déploie. C'est tout — le site est en ligne, gratuit à faire tourner, increvable.

Pour tester la vitrine en local :
```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

Le contenu de démo (documents + questions/réponses + citations) vit dans
`src/lib/demo.ts` — modifie-le pour l'adapter à un secteur client.

## C — Démo live en rendez-vous (local)

L'app réelle, avec tes clés. `NEXT_PUBLIC_DEMO_MODE` doit être **absent ou `false`**.

Prérequis dans `.env.local` (déjà configuré chez toi) :
```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…
ANTHROPIC_API_KEY=…
VOYAGE_API_KEY=…
# NEXT_PUBLIC_TURNSTILE_SITE_KEY facultatif en local
```

Lancer :
```bash
npm run dev
```

Le client importe ses propres documents et pose ses vraies questions.

> Astuce RDV : ouvre l'app quelques minutes avant l'appel pour que la session
> anonyme soit déjà établie, et prépare 1–2 documents « propres » au cas où.
