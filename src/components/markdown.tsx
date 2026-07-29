"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Styled to match the reading-room look: serif body, sans headings, accent markers.
const components: Components = {
  p: (props) => <p className="mb-2.5 leading-7 last:mb-0" {...props} />,
  h1: (props) => (
    <h3 className="mb-2 mt-1 font-display text-lg font-semibold tracking-tight" {...props} />
  ),
  h2: (props) => (
    <h4 className="mb-2 mt-3 font-display text-base font-semibold tracking-tight" {...props} />
  ),
  h3: (props) => (
    <h5 className="mb-1.5 mt-3 font-display text-sm font-semibold tracking-tight" {...props} />
  ),
  ul: (props) => (
    <ul className="mb-2.5 ml-4 list-disc space-y-1 marker:text-brand last:mb-0" {...props} />
  ),
  ol: (props) => (
    <ol
      className="mb-2.5 ml-4 list-decimal space-y-1 marker:text-muted-foreground last:mb-0"
      {...props}
    />
  ),
  li: (props) => <li className="leading-7" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  a: (props) => (
    <a
      className="text-brand underline underline-offset-2 hover:text-[var(--brand-strong)]"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px]" {...props} />
  ),
  pre: (props) => (
    <pre
      className="mb-2.5 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[13px] leading-6"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mb-2.5 border-l-2 border-brand pl-3 italic text-muted-foreground"
      {...props}
    />
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: (props) => (
    <div className="mb-2.5 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border border-border px-2 py-1 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border border-border px-2 py-1" {...props} />,
};

function MarkdownImpl({ content }: { content: string }) {
  return (
    <div className="font-serif text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
