"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Lang = "fr" | "en";

const dict = {
  "app.tagline": { fr: "recherche sourcée", en: "sourced search" },
  "header.session": {
    fr: "session anonyme · documents privés",
    en: "anonymous session · private documents",
  },
  "header.connecting": { fr: "connexion…", en: "connecting…" },
  "header.theme": { fr: "Basculer le thème", en: "Toggle theme" },
  "header.lang": { fr: "Changer de langue", en: "Change language" },

  "dropzone.indexing": { fr: "Indexation en cours…", en: "Indexing…" },
  "dropzone.drop": { fr: "Déposez un document ici", en: "Drop a document here" },
  "dropzone.formats": {
    fr: "PDF · DOCX · TXT · MD — 15 Mo max",
    en: "PDF · DOCX · TXT · MD — 15 MB max",
  },
  "docs.title": { fr: "Documents", en: "Documents" },
  "docs.empty": { fr: "Aucun document pour l'instant.", en: "No documents yet." },
  "docs.extracts": { fr: "{n} extraits", en: "{n} excerpts" },
  "docs.status.error": { fr: "erreur", en: "error" },
  "docs.status.indexing": { fr: "indexation", en: "indexing" },
  "toast.uploadFail": { fr: "Échec de l'envoi.", en: "Upload failed." },
  "toast.deleteFail": { fr: "Échec de la suppression.", en: "Delete failed." },
  "toast.indexed": {
    fr: "« {file} » indexé ({n} extraits).",
    en: "“{file}” indexed ({n} excerpts).",
  },

  "chat.placeholder.ready": {
    fr: "Posez une question sur vos documents…",
    en: "Ask a question about your documents…",
  },
  "chat.placeholder.empty": {
    fr: "Ajoutez d'abord un document pour commencer.",
    en: "Add a document first to get started.",
  },
  "chat.hint": {
    fr: "Réponses sourcées · cliquez sur une source pour lire le passage exact",
    en: "Sourced answers · click a source to read the exact passage",
  },
  "chat.empty.title": { fr: "Interrogez vos documents", en: "Query your documents" },
  "chat.empty.hasDocs": {
    fr: "Posez une question en langage naturel. La réponse s'appuiera sur vos documents, avec des sources cliquables.",
    en: "Ask in natural language. The answer draws on your documents, with clickable sources.",
  },
  "chat.empty.noDocs": {
    fr: "Déposez un PDF, un DOCX ou un TXT dans le panneau de gauche, puis posez votre première question.",
    en: "Drop a PDF, DOCX or TXT in the left panel, then ask your first question.",
  },
  "chat.searching": {
    fr: "recherche dans vos documents",
    en: "searching your documents",
  },
  "chat.error": { fr: "Erreur.", en: "Error." },
  "chat.suggest1": {
    fr: "Résume ce document en 3 points clés",
    en: "Summarize this document in 3 key points",
  },
  "chat.suggest2": {
    fr: "Quels sont les points importants ?",
    en: "What are the important points?",
  },
  "chat.suggest3": {
    fr: "Y a-t-il des dates ou échéances ?",
    en: "Are there any dates or deadlines?",
  },
  "chat.copy": { fr: "Copier", en: "Copy" },
  "chat.copied": { fr: "Copié", en: "Copied" },
  "chat.refine": { fr: "Affiner", en: "Refine" },
  "chat.refineShorter": { fr: "Plus court", en: "Shorter" },
  "chat.refineLonger": { fr: "Plus détaillé", en: "More detailed" },
  "chat.refineSimpler": { fr: "Plus simple", en: "Simpler" },
  "chat.stop": { fr: "Arrêter", en: "Stop" },
  "source.subtitle": {
    fr: "Passage exact cité dans la réponse.",
    en: "Exact passage cited in the answer.",
  },
  "source.page": { fr: "page {n}", en: "page {n}" },

  "gate.subtitle": { fr: "vérification de sécurité", en: "security check" },
  "gate.fail": {
    fr: "Échec de la vérification (code {code}).",
    en: "Verification failed (code {code}).",
  },
  "gate.hint": {
    fr: "Si l'erreur est 110200, le domaine n'est pas autorisé dans le widget Turnstile (ajoutez localhost côté Cloudflare).",
    en: "If the error is 110200, the domain isn't allowed in the Turnstile widget (add localhost on Cloudflare).",
  },
  "gate.retry": { fr: "Réessayer", en: "Retry" },

  "demo.badge": { fr: "Démo", en: "Demo" },
  "demo.notice": {
    fr: "Documents d'exemple · démonstration",
    en: "Sample documents · demonstration",
  },
  "demo.panel": {
    fr: "Documents d'exemple pré-indexés. Pour interroger vos propres fichiers, une démo live est disponible sur demande.",
    en: "Pre-indexed sample documents. To query your own files, a live demo is available on request.",
  },
} satisfies Record<string, Record<Lang, string>>;

export type I18nKey = keyof typeof dict;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// The chosen language lives in localStorage — an external store, read through
// useSyncExternalStore so the server renders FR and the client swaps to the
// saved choice on hydration without a mismatch.
const LANG_KEY = "lang";
const langListeners = new Set<() => void>();

function subscribeLang(onChange: () => void): () => void {
  langListeners.add(onChange);
  // Keeps tabs in sync when the choice changes elsewhere.
  window.addEventListener("storage", onChange);
  return () => {
    langListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getLangSnapshot(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "fr" || saved === "en" ? saved : "fr";
}

/** Default is FR; only a previously saved choice overrides it. */
function getLangServerSnapshot(): Lang {
  return "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LANG_KEY, next);
    for (const listener of langListeners) listener();
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      let out: string = dict[key]?.[lang] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(`{${k}}`, String(v));
        }
      }
      return out;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
