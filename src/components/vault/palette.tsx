import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { fuzzy } from "@/lib/vault/parse";
import { useVault } from "@/lib/vault/store";
import { THEMES, type EditorMode, type ThemeId } from "@/lib/vault/types";

type Item = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

type Props = {
  mode: "commands" | "switcher";
  onClose: () => void;
  onGraph: () => void;
  onEditor: () => void;
  onRestore: () => void;
};

export function Palette({ mode, onClose, onGraph, onEditor, onRestore }: Props) {
  const notes = useVault((state) => state.notes);
  const folders = useVault((state) => state.folders);
  const openNote = useVault((state) => state.openNote);
  const createNote = useVault((state) => state.createNote);
  const createFolder = useVault((state) => state.createFolder);
  const setMode = useVault((state) => state.setMode);
  const setTheme = useVault((state) => state.setTheme);
  const toggleLeft = useVault((state) => state.toggleLeft);
  const toggleRight = useVault((state) => state.toggleRight);
  const activeId = useVault((state) => state.activeId);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    if (mode === "switcher") {
      return notes
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((note) => ({
          id: note.id,
          label: note.title,
          hint: folders.find((folder) => folder.id === note.folderId)?.name ?? "Vault",
          run: () => {
            openNote(note.id);
            onEditor();
            onClose();
          },
        }));
    }
    const commands: Item[] = [
      {
        id: "new-note",
        label: "New note",
        hint: "Ctrl N",
        run: () => {
          const folderId = notes.find((note) => note.id === activeId)?.folderId ?? null;
          createNote(folderId);
          onEditor();
          onClose();
        },
      },
      {
        id: "new-folder",
        label: "New folder",
        run: () => {
          createFolder(null);
          onClose();
        },
      },
      { id: "edit", label: "Editing view", run: () => { setMode("edit" satisfies EditorMode); onEditor(); onClose(); } },
      { id: "read", label: "Reading view", run: () => { setMode("read"); onEditor(); onClose(); } },
      { id: "split", label: "Split view", run: () => { setMode("split"); onEditor(); onClose(); } },
      { id: "graph", label: "Open graph", hint: "Ctrl G", run: () => { onGraph(); onClose(); } },
      { id: "files", label: "Toggle file list", run: () => { toggleLeft(); onClose(); } },
      { id: "outline", label: "Toggle outline", run: () => { toggleRight(); onClose(); } },
      ...THEMES.map((theme) => ({
        id: `theme-${theme.id}`,
        label: `Theme: ${theme.name}`,
        hint: theme.blurb,
        run: () => {
          setTheme(theme.id as ThemeId);
          onClose();
        },
      })),
      { id: "switcher", label: "Quick switcher", hint: "Ctrl O", run: () => {} },
      {
        id: "restore",
        label: "Restore sample vault",
        run: () => {
          onClose();
          onRestore();
        },
      },
    ];
    return commands.filter((item) => item.id !== "switcher");
  }, [
    activeId,
    createFolder,
    createNote,
    folders,
    mode,
    notes,
    onClose,
    onEditor,
    onGraph,
    onRestore,
    openNote,
    setMode,
    setTheme,
    toggleLeft,
    toggleRight,
  ]);

  const filtered = items.filter((item) => fuzzy(query, `${item.label} ${item.hint ?? ""}`));
  const selected = filtered[Math.min(index, Math.max(filtered.length - 1, 0))];

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    setIndex(0);
  }, [query, mode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-deep/70 px-4 pt-16 md:pt-24"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "commands" ? "Command palette" : "Quick switcher"}
        className="shadow-pop w-full max-w-lg overflow-hidden rounded-lg border border-border bg-side"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === "commands" ? "Type a command" : "Jump to a note"}
          aria-label={mode === "commands" ? "Command" : "Note"}
          className="h-12 w-full border-b border-border bg-transparent px-4 text-base outline-none placeholder:text-faint"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((value) => Math.min(filtered.length - 1, value + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((value) => Math.max(0, value - 1));
            } else if (event.key === "Enter" && selected) {
              event.preventDefault();
              selected.run();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
        <ul className="vault-scroll max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">Nothing matches.</li>
          ) : (
            filtered.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(itemIndex)}
                  onClick={() => item.run()}
                  className={cn(
                    "flex h-11 w-full items-center gap-3 px-4 text-left text-sm",
                    itemIndex === index ? "bg-accent-soft text-fg" : "text-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-fg">{item.label}</span>
                  {item.hint ? <span className="shrink-0 text-xs text-faint">{item.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-border px-4 py-2 text-xs text-faint">
          Enter to run · Esc to close · Ctrl K commands · Ctrl O notes
        </p>
      </div>
    </div>
  );
}
