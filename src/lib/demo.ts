import type { DocumentRow, Source, StreamEvent } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

/**
 * Demo mode turns the app into a self-contained, zero-cost showcase:
 * no auth, no Supabase, no AI calls. Documents and answers are pre-scripted
 * and "streamed" client-side, so the public portfolio deploy can't run up an
 * AI bill or break on abuse. Leave the flag unset for the real app (live demos).
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ---------------------------------------------------------------------------
// Sample corpus — a coherent freelance-project file set (French documents).
// ---------------------------------------------------------------------------

export const DEMO_DOCUMENTS: DocumentRow[] = [
  {
    id: "doc-contrat",
    filename: "Contrat_de_prestation.pdf",
    status: "ready",
    num_chunks: 14,
    byte_size: 96_400,
    error: null,
    created_at: "2024-11-12T09:00:00Z",
  },
  {
    id: "doc-cgv",
    filename: "Conditions_generales_de_vente.pdf",
    status: "ready",
    num_chunks: 9,
    byte_size: 61_200,
    error: null,
    created_at: "2024-11-12T09:01:00Z",
  },
  {
    id: "doc-cdc",
    filename: "Cahier_des_charges.pdf",
    status: "ready",
    num_chunks: 11,
    byte_size: 78_900,
    error: null,
    created_at: "2024-11-12T09:02:00Z",
  },
];

export interface DemoScenario {
  id: string;
  q: Record<Lang, string>;
  answer: Record<Lang, string>;
  sources: Source[];
}

// Citations quote the source document verbatim, so citedText stays French
// (as real citations would) even when the answer is rendered in English.
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "paiement",
    q: {
      fr: "Quelles sont les modalités de paiement ?",
      en: "What are the payment terms?",
    },
    answer: {
      fr: "Le règlement s'organise en **deux temps** :\n\n- Un **acompte de 30 %** est versé à la signature du contrat.\n- Le **solde (70 %)** est dû à la livraison, payable sous **30 jours** à réception de facture.\n\nEn cas de retard, les CGV prévoient des **pénalités** ainsi qu'une **indemnité forfaitaire de 40 €** pour frais de recouvrement.",
      en: "Payment is structured in **two stages**:\n\n- A **30% deposit** is due when the contract is signed.\n- The **remaining balance (70%)** is due on delivery, payable within **30 days** of invoice.\n\nIf payment is late, the terms of sale apply **penalties** plus a **fixed €40 recovery fee**.",
    },
    sources: [
      {
        chunkId: "c-contrat-3a",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 3,
        citedText:
          "Un acompte de 30 % du montant total est exigible à la signature des présentes.",
      },
      {
        chunkId: "c-contrat-3b",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 3,
        citedText:
          "Le solde est payable à réception de la facture, dans un délai de trente (30) jours.",
      },
      {
        chunkId: "c-cgv-2a",
        documentId: "doc-cgv",
        filename: "Conditions_generales_de_vente.pdf",
        page: 2,
        citedText:
          "Tout retard de paiement entraîne l'application de pénalités et d'une indemnité forfaitaire de 40 € pour frais de recouvrement.",
      },
    ],
  },
  {
    id: "delais",
    q: {
      fr: "Quels sont les délais de livraison ?",
      en: "What are the delivery deadlines?",
    },
    answer: {
      fr: "Le projet suit **trois jalons** définis au cahier des charges :\n\n- **Maquettes** validées à J+15.\n- **Version de recette** en cours de projet.\n- **Mise en production** au plus tard à **J+60**.\n\nCes délais s'entendent **sous réserve** que le client fournisse les contenus nécessaires dans les temps — à défaut, ils sont suspendus.",
      en: "The project follows **three milestones** set out in the brief:\n\n- **Mock-ups** approved by day 15.\n- **Review build** during the project.\n- **Go-live** no later than **day 60**.\n\nThese deadlines assume the client **supplies the required content on time** — otherwise they are suspended.",
    },
    sources: [
      {
        chunkId: "c-cdc-1a",
        documentId: "doc-cdc",
        filename: "Cahier_des_charges.pdf",
        page: 1,
        citedText: "Livraison des maquettes : 15 jours ouvrés après le lancement.",
      },
      {
        chunkId: "c-cdc-2a",
        documentId: "doc-cdc",
        filename: "Cahier_des_charges.pdf",
        page: 2,
        citedText:
          "Mise en production prévue au plus tard soixante (60) jours après la signature.",
      },
      {
        chunkId: "c-contrat-4a",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 4,
        citedText:
          "Les délais sont suspendus en cas de retard du client dans la fourniture des éléments nécessaires.",
      },
    ],
  },
  {
    id: "resiliation",
    q: {
      fr: "Que se passe-t-il en cas de résiliation ?",
      en: "What happens in case of termination?",
    },
    answer: {
      fr: "La résiliation est encadrée par **deux clauses** :\n\n- Chaque partie peut résilier moyennant un **préavis de 15 jours** notifié par lettre recommandée.\n- En cas de rupture anticipée, les **prestations déjà réalisées** restent dues **au prorata**.\n\nLes CGV précisent par ailleurs que **l'acompte n'est pas remboursable** une fois les travaux entamés.",
      en: "Termination is governed by **two clauses**:\n\n- Either party may terminate with **15 days' notice** sent by registered letter.\n- If ended early, **work already completed** remains payable **on a pro-rata basis**.\n\nThe terms of sale also state that the **deposit is non-refundable** once work has started.",
    },
    sources: [
      {
        chunkId: "c-contrat-5a",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 5,
        citedText:
          "Le contrat peut être résilié par l'une ou l'autre des parties moyennant un préavis de quinze (15) jours.",
      },
      {
        chunkId: "c-contrat-5b",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 5,
        citedText:
          "Les prestations réalisées à la date de résiliation demeurent dues au prorata du travail effectué.",
      },
      {
        chunkId: "c-cgv-3a",
        documentId: "doc-cgv",
        filename: "Conditions_generales_de_vente.pdf",
        page: 3,
        citedText:
          "L'acompte versé n'est pas remboursable dès lors que l'exécution de la prestation a commencé.",
      },
    ],
  },
  {
    id: "droits",
    q: {
      fr: "Quels sont mes droits sur les livrables ?",
      en: "What are my rights over the deliverables?",
    },
    answer: {
      fr: "La **cession des droits** est prévue, mais **conditionnée** :\n\n- Les droits d'exploitation sont **transférés au client** après **paiement intégral**.\n- Le prestataire conserve le droit de **mentionner le projet** dans son portfolio, sauf confidentialité contraire.\n\nUne obligation de **confidentialité** couvre les informations échangées pendant toute la durée du contrat.",
      en: "The **transfer of rights** is provided for, but **conditional**:\n\n- Exploitation rights pass to the **client after full payment**.\n- The freelancer keeps the right to **feature the project** in their portfolio, unless confidentiality says otherwise.\n\nA **confidentiality** duty covers information exchanged for the whole term of the contract.",
    },
    sources: [
      {
        chunkId: "c-contrat-6a",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 6,
        citedText:
          "La cession des droits patrimoniaux n'est effective qu'après complet paiement du prix.",
      },
      {
        chunkId: "c-contrat-6b",
        documentId: "doc-contrat",
        filename: "Contrat_de_prestation.pdf",
        page: 6,
        citedText:
          "Le prestataire est autorisé à faire figurer les réalisations dans ses références commerciales.",
      },
      {
        chunkId: "c-cgv-4a",
        documentId: "doc-cgv",
        filename: "Conditions_generales_de_vente.pdf",
        page: 4,
        citedText:
          "Les parties s'engagent à préserver la confidentialité des informations communiquées.",
      },
    ],
  },
];

/** Answer shown when a visitor types something no scenario covers. */
export function demoFallbackScenario(): DemoScenario {
  return {
    id: "fallback",
    q: { fr: "", en: "" },
    answer: {
      fr: "Ceci est une **démonstration** : les réponses portent sur des documents d'exemple.\n\nPour voir la recherche fonctionner sur **vos propres documents**, essayez l'une des questions suggérées — ou **contactez-moi pour une démo live**, où vous pourrez importer vos fichiers et poser vos vraies questions.",
      en: "This is a **demo**: answers are based on sample documents.\n\nTo see the search work on **your own documents**, try one of the suggested questions — or **contact me for a live demo**, where you can upload your files and ask real questions.",
    },
    sources: [],
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "les des mes mon ma ses sur que qui quoi quel quels quelle quelles est sont en cas de du la le un une et ou a au aux ce cette mon what are the my is in of on case do i".split(
    " ",
  ),
);

/** Best-effort match of a free-typed question to a scripted scenario. */
export function matchScenario(question: string): DemoScenario | null {
  const asked = new Set(normalize(question).split(" ").filter((w) => w && !STOPWORDS.has(w)));
  if (asked.size === 0) return null;

  let best: { scenario: DemoScenario; score: number } | null = null;
  for (const scenario of DEMO_SCENARIOS) {
    for (const lang of ["fr", "en"] as const) {
      const words = normalize(scenario.q[lang]).split(" ").filter((w) => w && !STOPWORDS.has(w));
      let score = 0;
      for (const w of words) if (asked.has(w)) score++;
      if (!best || score > best.score) best = { scenario, score };
    }
  }
  return best && best.score > 0 ? best.scenario : null;
}

function abortError(): Error {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(abortError());
      },
      { once: true },
    );
  });
}

/**
 * Replays a scripted answer with the same event shape as the live
 * `streamQuery`, so the chat UI stays identical. Abortable via `signal`
 * (throws AbortError, letting the caller keep the partial answer).
 */
export async function streamDemoAnswer(
  scenario: DemoScenario,
  lang: Lang,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  await sleep(650, signal); // brief "searching…" beat

  onEvent({
    type: "chunks",
    chunks: scenario.sources.map((s) => ({
      id: s.chunkId,
      filename: s.filename,
      page: s.page,
      similarity: 0.9,
    })),
  });

  const tokens = scenario.answer[lang].match(/\S+\s*/g) ?? [scenario.answer[lang]];
  const total = scenario.sources.length;
  let emitted = 0;

  for (let i = 0; i < tokens.length; i++) {
    onEvent({ type: "text", text: tokens[i] });

    // Spread the citations across the stream so they pop in as text flows.
    const due = Math.floor(((i + 1) / tokens.length) * total);
    while (emitted < due && emitted < total) {
      onEvent({ type: "citation", citation: scenario.sources[emitted] });
      emitted++;
    }
    await sleep(16 + Math.random() * 26, signal);
  }

  while (emitted < total) {
    onEvent({ type: "citation", citation: scenario.sources[emitted] });
    emitted++;
  }

  onEvent({ type: "done" });
}
