import { BookOpen, Columns2, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { headingsOf } from "@/lib/vault/parse";
import { useVault } from "@/lib/vault/store";
import type { EditorMode, Note } from "@/lib/vault/types";
import { MarkdownView } from "./markdown-view";

type Props = {
  mobile: boolean;
  onOpenTitle: (title: string) => void;
};

const MODES: { id: EditorMode; label: string; icon: typeof Pencil }[] = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "read", label: "Read", icon: BookOpen },
  { id: "split", label: "Split", icon: Columns2 },
];

export function Editor({ mobile, onOpenTitle }: Props) {
  const notes = useVault((state) => state.notes);
  const openIds = useVault((state) => state.openIds);
  const activeId = useVault((state) => state.activeId);
  const mode = useVault((state) => state.mode);
  const setMode = useVault((state) => state.setMode);
  const openNote = useVault((state) => state.openNote);
  const closeNote = useVault((state) => state.closeNote);
  const updateBody = useVault((state) => state.updateBody);
  const toggleTask = useVault((state) => state.toggleTask);
  const setTitle = useVault((state) => state.setTitle);
  const finalizeTitle = useVault((state) => state.finalizeTitle);
  const focusTitleId = useVault((state) => state.focusTitleId);
  const clearFocus = useVault((state) => state.clearFocus);
  const createNote = useVault((state) => state.createNote);

  const openNotes = openIds
    .map((id) => notes.find((note) => note.id === id))
    .filter((note): note is Note => Boolean(note));
  const note = notes.find((item) => item.id === activeId) ?? null;
  const titleRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(note?.title ?? "");
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    setDraft(note?.title ?? "");
    setConflict(false);
  }, [note?.id, note?.title]);

  useEffect(() => {
    if (!note || focusTitleId !== note.id) return;
    titleRef.current?.focus();
    titleRef.current?.select();
    clearFocus();
  }, [focusTitleId, note, clearFocus]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "0px";
    area.style.height = `${area.scrollHeight}px`;
  }, [note?.body, mode, note?.id]);

  const showEdit = mode === "edit" || (mode === "split" && !mobile);
  const showRead = mode === "read" || (mode === "split" && !mobile);
  const modes = mobile ? MODES.filter((item) => item.id !== "split") : MODES;

  const jumpTo = (line: number) => {
    if (!showEdit) {
      const heading = headingsOf(note?.body ?? "").find((item) => item.line === line);
      if (heading) {
        document.getElementById(heading.id)?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }
      return;
    }
    const area = areaRef.current;
    const scroller = scrollerRef.current;
    if (!area || !note) return;
    const lines = note.body.split("\n");
    let pos = 0;
    for (let index = 0; index < line && index < lines.length; index += 1) {
      pos += (lines[index]?.length ?? 0) + 1;
    }
    area.focus();
    area.setSelectionRange(pos, pos);
    if (scroller) {
      const ratio = lines.length <= 1 ? 0 : line / lines.length;
      scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight);
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div className="flex h-11 items-stretch border-b border-border bg-side md:h-9">
        <div className="vault-scroll flex min-w-0 flex-1 overflow-x-auto">
          {openNotes.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex shrink-0 items-center border-r border-border",
                item.id === activeId ? "bg-bg text-fg" : "text-muted",
              )}
            >
              <button
                type="button"
                onClick={() => openNote(item.id)}
                className="h-11 max-w-40 truncate px-3 text-sm md:h-9"
              >
                {item.title}
              </button>
              <button
                type="button"
                aria-label={`Close ${item.title}`}
                className="grid size-9 place-items-center text-faint hover:text-fg"
                onClick={() => closeNote(item.id)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 px-2">
          <div className="flex rounded-md border border-border p-0.5">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id || (mobile && mode === "split" && item.id === "edit");
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={active}
                  title={item.label}
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded px-2 text-xs",
                    active ? "bg-raised text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!note ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold">No note open</p>
          <p className="max-w-sm text-sm text-muted">
            Pick a file from the list, or start a blank page.
          </p>
          <button
            type="button"
            onClick={() => createNote(null)}
            className="h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            New note
          </button>
        </div>
      ) : (
        <div ref={scrollerRef} className="vault-scroll min-h-0 flex-1 overflow-y-auto">
          <div className={cn("mx-auto w-full px-5 py-6 md:px-8", showEdit && showRead ? "max-w-5xl" : "max-w-2xl")}>
            <input
              ref={titleRef}
              value={draft}
              aria-label="Note title"
              onChange={(event) => {
                const next = event.target.value.replace(/[\[\]]/g, "");
                setDraft(next);
                const ok = setTitle(note.id, next);
                setConflict(Boolean(next.trim()) && !ok && next !== note.title);
              }}
              onBlur={() => {
                finalizeTitle(note.id);
                const current = useVault.getState().notes.find((item) => item.id === note.id);
                setDraft(current?.title ?? "");
                setConflict(false);
              }}
              className="note-title w-full bg-transparent text-2xl text-fg outline-none placeholder:text-faint md:text-3xl"
              placeholder="Untitled"
            />
            {conflict ? (
              <p className="mt-1 text-xs text-danger">Another note already uses that title.</p>
            ) : null}
            <div className={cn("mt-4", showEdit && showRead && "grid items-start gap-6 md:grid-cols-2")}>
              {showEdit ? (
                <textarea
                  ref={areaRef}
                  value={note.body}
                  aria-label="Note body"
                  spellCheck
                  onChange={(event) => updateBody(note.id, event.target.value)}
                  placeholder="Write, or link a note with [[double brackets]]."
                  className="w-full resize-none bg-transparent font-sans text-base leading-relaxed text-fg outline-none placeholder:text-faint"
                />
              ) : null}
              {showRead ? (
                <MarkdownView
                  source={note.body}
                  notes={notes}
                  onOpen={onOpenTitle}
                  onToggleTask={(line) => toggleTask(note.id, line)}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
      <JumpBridge noteId={note?.id ?? null} body={note?.body ?? ""} onJump={jumpTo} />
    </section>
  );
}

function JumpBridge({
  noteId,
  body,
  onJump,
}: {
  noteId: string | null;
  body: string;
  onJump: (line: number) => void;
}) {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ line?: number; id?: string }>).detail;
      if (!detail || detail.id !== noteId || detail.line === undefined) return;
      onJump(detail.line);
    };
    window.addEventListener("nightglass-jump", handler);
    return () => window.removeEventListener("nightglass-jump", handler);
  }, [noteId, body, onJump]);
  return null;
}

export function jumpToHeading(noteId: string, line: number) {
  window.dispatchEvent(new CustomEvent("nightglass-jump", { detail: { id: noteId, line } }));
}
