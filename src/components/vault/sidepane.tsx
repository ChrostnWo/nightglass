import { cn } from "@/lib/cn";
import { headingsOf, noteTags, wikiTargets } from "@/lib/vault/parse";
import { useVault } from "@/lib/vault/store";
import { jumpToHeading } from "./editor";

type Props = {
  onOpenTitle: (title: string) => void;
  onTag: (tag: string) => void;
};

export function SidePane({ onOpenTitle, onTag }: Props) {
  const notes = useVault((state) => state.notes);
  const activeId = useVault((state) => state.activeId);
  const note = notes.find((item) => item.id === activeId) ?? null;
  const headings = note ? headingsOf(note.body) : [];
  const tags = note ? noteTags(note.body) : [];
  const outgoing = note ? wikiTargets(note.body) : [];
  const incoming = note
    ? notes.filter((item) => item.id !== note.id && wikiTargets(item.body).includes(note.title))
    : [];

  return (
    <aside className="vault-scroll flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-side px-3 py-4">
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Outline</h2>
        {headings.length === 0 ? (
          <p className="text-sm text-muted">No headings yet.</p>
        ) : (
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  type="button"
                  onClick={() => note && jumpToHeading(note.id, heading.line)}
                  className={cn(
                    "block w-full truncate rounded py-1 text-left text-sm text-muted hover:bg-raised hover:text-fg",
                    heading.level > 2 ? "pl-4" : "pl-1",
                  )}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Backlinks</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing points here yet.</p>
        ) : (
          <ul className="space-y-1">
            {incoming.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenTitle(item.title)}
                  className="block w-full truncate rounded px-1 py-1 text-left text-sm hover:bg-raised"
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Links</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted">No outgoing links.</p>
        ) : (
          <ul className="space-y-1">
            {outgoing.map((title) => {
              const exists = notes.some((item) => item.title === title);
              return (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => onOpenTitle(title)}
                    className={exists ? "block w-full truncate rounded px-1 py-1 text-left text-sm hover:bg-raised" : "block w-full truncate rounded px-1 py-1 text-left text-sm text-accent hover:bg-raised"}
                  >
                    {exists ? title : `${title} · new`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Tags</h2>
        {tags.length === 0 ? (
          <p className="text-sm text-muted">No tags in this note.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTag(tag)}
                className="tag-chip h-8 rounded-md px-2 text-sm"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
