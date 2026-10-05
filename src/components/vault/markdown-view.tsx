import { Check, Info, Lightbulb, Quote, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { parseBlocks, type Block } from "@/lib/vault/parse";
import type { Note } from "@/lib/vault/types";

const DEPTH = ["pl-0", "pl-4", "pl-8", "pl-12"] as const;

type Props = {
  source: string;
  notes: Note[];
  onOpen: (title: string) => void;
  onToggleTask?: (line: number) => void;
};

const INLINE =
  /(`[^`\n]+`)|(\[\[[^\]]+\]\])|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(#[\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;

function safeHref(href: string) {
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return null;
}

function parseWiki(raw: string) {
  const inner = raw.slice(2, -2);
  const pipe = inner.indexOf("|");
  const path = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
  const alias = pipe === -1 ? "" : inner.slice(pipe + 1).trim();
  const target = path.split("#")[0]?.trim() ?? "";
  return { target, label: alias || target || raw };
}

export function renderInline(
  text: string,
  notes: Note[],
  onOpen: (title: string) => void,
  keyBase: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(INLINE.source, "gu");
  let last = 0;
  let match: RegExpExecArray | null;
  let part = 0;

  const pushText = (value: string) => {
    if (!value) return;
    nodes.push(value);
  };

  while ((match = re.exec(text))) {
    const start = match.index;
    const raw = match[0] ?? "";
    pushText(text.slice(last, start));
    const key = `${keyBase}-${part}`;
    part += 1;

    if (raw.startsWith("`")) {
      nodes.push(<code key={key}>{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith("[[")) {
      const { target, label } = parseWiki(raw);
      const exists = notes.some((note) => note.title === target);
      nodes.push(
        <a
          key={key}
          href={`#${encodeURIComponent(target)}`}
          className={exists ? undefined : "unresolved"}
          onClick={(event) => {
            event.preventDefault();
            if (target) onOpen(target);
          }}
        >
          {label}
        </a>,
      );
    } else if (match[4] && match[5]) {
      const href = safeHref(match[5]);
      if (!href) {
        pushText(raw);
      } else {
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {match[4]}
          </a>,
        );
      }
    } else if (match[7]) {
      nodes.push(<strong key={key}>{renderInline(match[7], notes, onOpen, key)}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={key}>{renderInline(match[9], notes, onOpen, key)}</em>);
    } else if (raw.startsWith("#")) {
      const boundary = start === 0 || /[\s([{]/.test(text[start - 1] ?? "");
      if (!boundary) {
        pushText(raw);
      } else {
        nodes.push(
          <span key={key} className="tag-chip rounded px-1">
            {raw}
          </span>,
        );
      }
    } else {
      pushText(raw);
    }
    last = start + raw.length;
  }
  pushText(text.slice(last));
  return nodes;
}

function CalloutIcon({ kind }: { kind: string }) {
  const className = "size-4";
  if (kind === "warning") return <TriangleAlert className={className} />;
  if (kind === "tip") return <Lightbulb className={className} />;
  if (kind === "quote") return <Quote className={className} />;
  return <Info className={className} />;
}

function BlockView({
  block,
  notes,
  onOpen,
  onToggleTask,
}: {
  block: Block;
  notes: Note[];
  onOpen: (title: string) => void;
  onToggleTask?: (line: number) => void;
}) {
  if (block.type === "heading") {
    const content = renderInline(block.text, notes, onOpen, block.id);
    if (block.level <= 2) {
      return (
        <h2 id={block.id} className="scroll-mt-6">
          {content}
        </h2>
      );
    }
    if (block.level === 3) {
      return (
        <h3 id={block.id} className="scroll-mt-6">
          {content}
        </h3>
      );
    }
    return (
      <h4 id={block.id} className="scroll-mt-6">
        {content}
      </h4>
    );
  }

  if (block.type === "p") {
    return <p>{renderInline(block.text, notes, onOpen, "p")}</p>;
  }

  if (block.type === "ul") {
    return (
      <ul className="list-none">
        {block.items.map((item, index) => (
          <li key={`${item.line}-${index}`} className={cn("flex items-start", DEPTH[item.depth] ?? "pl-12")}>
            {item.checked === undefined ? (
              <span className="mt-2.5 mr-2 size-1.5 shrink-0 rounded-full bg-faint" />
            ) : (
              <button
                type="button"
                aria-pressed={item.checked}
                aria-label={item.checked ? "Mark incomplete" : "Mark complete"}
                className="relative mt-0.5 mr-1 grid size-6 shrink-0 place-items-center after:absolute after:-inset-2"
                onClick={() => onToggleTask?.(item.line)}
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded border",
                    item.checked ? "border-accent bg-accent text-accent-fg" : "border-faint bg-bg",
                  )}
                >
                  {item.checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
                </span>
              </button>
            )}
            <span className={cn("min-w-0 flex-1", item.checked && "text-muted line-through")}>
              {renderInline(item.text, notes, onOpen, `li-${item.line}`)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol className="list-none">
        {block.items.map((item, index) => (
          <li key={`${item.n}-${index}`} className={cn("flex gap-2", DEPTH[item.depth] ?? "pl-12")}>
            <span className="w-5 shrink-0 text-right text-faint tabular-nums">{item.n}.</span>
            <span>{renderInline(item.text, notes, onOpen, `ol-${index}`)}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "quote") {
    const kind = block.kind ?? "note";
    return (
      <aside className="my-4 rounded-md border border-border border-l-2 border-l-accent bg-raised px-4 py-3">
        {block.kind ? (
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
            <CalloutIcon kind={kind} />
            {kind}
          </p>
        ) : null}
        {block.title ? (
          <p className="mb-1 font-semibold">{renderInline(block.title, notes, onOpen, "qt")}</p>
        ) : null}
        {block.lines
          .filter((line) => line.trim())
          .map((line, index) => (
            <p key={index} className="text-muted">
              {renderInline(line, notes, onOpen, `q-${index}`)}
            </p>
          ))}
      </aside>
    );
  }

  if (block.type === "code") {
    return (
      <pre>
        {block.lang ? (
          <span className="mb-2 block font-sans text-xs tracking-wide text-faint uppercase">
            {block.lang}
          </span>
        ) : null}
        <code>{block.code}</code>
      </pre>
    );
  }

  if (block.type === "hr") return <hr />;

  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            {block.header.map((cell, index) => (
              <th key={index}>{renderInline(cell, notes, onOpen, `th-${index}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  {renderInline(cell, notes, onOpen, `td-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownView({ source, notes, onOpen, onToggleTask }: Props) {
  const blocks = parseBlocks(source);
  if (!source.trim()) {
    return (
      <p className="text-muted">
        This note is empty. Switch to Edit, or link it from another page with double brackets.
      </p>
    );
  }
  return (
    <div className="vault-md">
      {blocks.map((block, index) => (
        <BlockView
          key={index}
          block={block}
          notes={notes}
          onOpen={onOpen}
          onToggleTask={onToggleTask}
        />
      ))}
    </div>
  );
}
