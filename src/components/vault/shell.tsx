import {
  BookOpen,
  List,
  Network,
  Palette,
  PanelLeft,
  Search,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { countWords, editedLabel } from "@/lib/vault/parse";
import { useHydrated, useVault } from "@/lib/vault/store";
import { THEMES, type ThemeId } from "@/lib/vault/types";
import { Editor } from "./editor";
import { GraphView } from "./graph-view";
import { Palette as CommandPalette } from "./palette";
import { Shard, Sidebar } from "./sidebar";
import { SidePane } from "./sidepane";

type Drawer = null | "files" | "info";
type Picker = null | "commands" | "switcher";
type Dialog =
  | null
  | { kind: "delete-note"; id: string }
  | { kind: "delete-folder"; id: string }
  | { kind: "restore" };

function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return mobile;
}

export function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-bg text-fg">
      <Shard />
      <p className="text-lg font-semibold tracking-tight">Nightglass</p>
      <p className="text-sm text-muted">Opening your vault…</p>
    </div>
  );
}

export function VaultShell() {
  const hydrated = useHydrated();
  const mobile = useMobile();
  const theme = useVault((state) => state.theme);
  const setTheme = useVault((state) => state.setTheme);
  const notes = useVault((state) => state.notes);
  const folders = useVault((state) => state.folders);
  const activeId = useVault((state) => state.activeId);
  const mode = useVault((state) => state.mode);
  const leftOpen = useVault((state) => state.leftOpen);
  const rightOpen = useVault((state) => state.rightOpen);
  const setLeftOpen = useVault((state) => state.setLeftOpen);
  const setRightOpen = useVault((state) => state.setRightOpen);
  const openNote = useVault((state) => state.openNote);
  const createNote = useVault((state) => state.createNote);
  const deleteNote = useVault((state) => state.deleteNote);
  const deleteFolder = useVault((state) => state.deleteFolder);
  const setQuery = useVault((state) => state.setQuery);
  const setMode = useVault((state) => state.setMode);
  const restoreSeed = useVault((state) => state.restoreSeed);
  const [view, setView] = useState<"editor" | "graph">("editor");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const note = notes.find((item) => item.id === activeId) ?? null;
  const folder = folders.find((item) => item.id === note?.folderId) ?? null;
  const themeName = THEMES.find((item) => item.id === theme)?.name ?? "Obsidian";

  useEffect(() => {
    document.title = note ? `${note.title} — Nightglass` : "Nightglass";
  }, [note]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "k") {
        event.preventDefault();
        setPicker((value) => (value === "commands" ? null : "commands"));
        setThemeOpen(false);
      } else if (mod && key === "o") {
        event.preventDefault();
        setPicker((value) => (value === "switcher" ? null : "switcher"));
        setThemeOpen(false);
      } else if (mod && key === "n") {
        event.preventDefault();
        createNote(note?.folderId ?? null);
        setView("editor");
        setDrawer(null);
        setPicker(null);
      } else if (mod && key === "g") {
        event.preventDefault();
        setView((value) => (value === "graph" ? "editor" : "graph"));
        setDrawer(null);
      } else if (mod && event.key === "\\") {
        event.preventDefault();
        if (mobile) setDrawer((value) => (value === "files" ? null : "files"));
        else setLeftOpen(!useVault.getState().leftOpen);
      } else if (event.key === "Escape") {
        setPicker(null);
        setThemeOpen(false);
        setDrawer(null);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote, mobile, note?.folderId, setLeftOpen]);

  const openTitle = (title: string) => {
    const existing = notes.find((item) => item.title === title);
    if (existing) {
      openNote(existing.id);
    } else {
      createNote(note?.folderId ?? null, title);
    }
    setView("editor");
    setDrawer(null);
  };

  const showFiles = mobile ? drawer === "files" : leftOpen;
  const showInfo = mobile ? drawer === "info" : rightOpen;

  if (!hydrated) return <Splash />;

  return (
    <div data-theme={theme} className="theme-root flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      {themeOpen ? (
        <button
          type="button"
          aria-label="Close themes"
          className="fixed inset-0 z-30"
          onClick={() => setThemeOpen(false)}
        />
      ) : null}
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Vault"
          className="hidden w-12 shrink-0 flex-col items-center justify-between border-r border-border bg-deep py-2 md:flex"
        >
          <div className="flex flex-col items-center gap-1">
            <RailButton
              label="Files"
              active={view === "editor" && leftOpen}
              onClick={() => {
                setView("editor");
                setLeftOpen(true);
              }}
            >
              <PanelLeft className="size-4" />
            </RailButton>
            <RailButton
              label="Search"
              onClick={() => {
                setLeftOpen(true);
                setView("editor");
                requestAnimationFrame(() => document.getElementById("vault-search")?.focus());
              }}
            >
              <Search className="size-4" />
            </RailButton>
            <RailButton label="Graph" active={view === "graph"} onClick={() => setView(view === "graph" ? "editor" : "graph")}>
              <Network className="size-4" />
            </RailButton>
          </div>
          <div className="relative">
            <RailButton label="Themes" active={themeOpen} onClick={() => setThemeOpen((value) => !value)}>
              <Palette className="size-4" />
            </RailButton>
            {themeOpen ? (
              <ThemeMenu
                theme={theme}
                className="absolute bottom-0 left-11 z-40"
                onPick={(id) => setTheme(id)}
              />
            ) : null}
          </div>
        </nav>

        {showFiles ? (
          <div className={cn(mobile && "fixed inset-0 z-40 flex")}>
            {mobile ? (
              <button
                type="button"
                aria-label="Close files"
                className="absolute inset-0 bg-deep/70"
                onClick={() => setDrawer(null)}
              />
            ) : null}
            <div className={cn("relative z-10 flex h-full", mobile && "w-72 max-w-full")}>
              <Sidebar
                onOpened={() => {
                  setView("editor");
                  setDrawer(null);
                }}
                onDeleteNote={(id) => setDialog({ kind: "delete-note", id })}
                onDeleteFolder={(id) => setDialog({ kind: "delete-folder", id })}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-1 border-b border-border bg-side px-1 md:hidden">
            <HeaderButton label="Files" onClick={() => setDrawer(drawer === "files" ? null : "files")}>
              <PanelLeft className="size-5" />
            </HeaderButton>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">Nightglass</p>
            <HeaderButton
              label="Search"
              onClick={() => {
                setDrawer("files");
                requestAnimationFrame(() => document.getElementById("vault-search")?.focus());
              }}
            >
              <Search className="size-5" />
            </HeaderButton>
            <HeaderButton
              label={view === "graph" ? "Back to note" : "Graph"}
              onClick={() => setView(view === "graph" ? "editor" : "graph")}
            >
              {view === "graph" ? <BookOpen className="size-5" /> : <Network className="size-5" />}
            </HeaderButton>
            <HeaderButton label="Outline" onClick={() => setDrawer(drawer === "info" ? null : "info")}>
              <List className="size-5" />
            </HeaderButton>
            <div className="relative">
              <HeaderButton label="Themes" onClick={() => setThemeOpen((value) => !value)}>
                <Palette className="size-5" />
              </HeaderButton>
              {themeOpen ? (
                <ThemeMenu
                  theme={theme}
                  className="absolute top-12 right-0 z-40"
                  onPick={(id) => setTheme(id)}
                />
              ) : null}
            </div>
          </header>

          {view === "graph" ? (
            <GraphView
              notes={notes}
              activeId={activeId}
              onOpen={(id) => {
                openNote(id);
                setView("editor");
                setDrawer(null);
              }}
            />
          ) : (
            <Editor mobile={mobile} onOpenTitle={openTitle} />
          )}
        </div>

        {showInfo && view === "editor" ? (
          <div className={cn(mobile && "fixed inset-0 z-40 flex justify-end")}>
            {mobile ? (
              <button
                type="button"
                aria-label="Close outline"
                className="absolute inset-0 bg-deep/70"
                onClick={() => setDrawer(null)}
              />
            ) : null}
            <div className="relative z-10 h-full">
              <SidePane
                onOpenTitle={(title) => {
                  openTitle(title);
                }}
                onTag={(tag) => {
                  setQuery(`#${tag}`);
                  if (mobile) setDrawer("files");
                  else setLeftOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border bg-deep px-3 text-xs text-faint">
        <span className="min-w-0 truncate">
          {folder ? `${folder.name} / ` : ""}
          {note?.title ?? "No note"}
        </span>
        <span className="ml-auto hidden tabular-nums sm:inline">
          {note ? `${countWords(`${note.title} ${note.body}`)} words` : ""}
        </span>
        <span className="hidden sm:inline">{note ? editedLabel(note.updatedAt) : ""}</span>
        <button
          type="button"
          className="text-muted hover:text-fg"
          onClick={() => setThemeOpen((value) => !value)}
        >
          {themeName}
        </button>
        <span className="hidden md:inline">{mode === "read" ? "Reading" : mode === "edit" ? "Editing" : "Split"}</span>
      </footer>

      {picker ? (
        <CommandPalette
          mode={picker}
          onClose={() => setPicker(null)}
          onGraph={() => setView("graph")}
          onEditor={() => setView("editor")}
          onRestore={() => setDialog({ kind: "restore" })}
        />
      ) : null}

      {dialog ? (
        <Confirm
          title={
            dialog.kind === "restore"
              ? "Restore the sample vault?"
              : dialog.kind === "delete-folder"
                ? "Delete this folder?"
                : "Delete this note?"
          }
          body={
            dialog.kind === "restore"
              ? "Your current notes will be replaced by the sample field notes. This only affects this browser."
              : dialog.kind === "delete-folder"
                ? "The folder and every note inside it will be removed from this vault."
                : `“${notes.find((item) => item.id === dialog.id)?.title ?? "This note"}” will be removed from this vault.`
          }
          confirmLabel={dialog.kind === "restore" ? "Restore" : "Delete"}
          danger={dialog.kind !== "restore"}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            if (dialog.kind === "restore") restoreSeed();
            if (dialog.kind === "delete-note") deleteNote(dialog.id);
            if (dialog.kind === "delete-folder") deleteFolder(dialog.id);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg",
        active && "bg-gold-soft text-gold",
      )}
    >
      {children}
    </button>
  );
}

function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
    >
      {children}
    </button>
  );
}

function ThemeMenu({
  theme,
  className,
  onPick,
}: {
  theme: ThemeId;
  className?: string;
  onPick: (id: ThemeId) => void;
}) {
  return (
    <div
      data-theme-menu
      className={cn("shadow-pop z-50 w-64 rounded-lg border border-border bg-side p-2", className)}
    >
      <p className="px-2 py-1 text-xs font-semibold tracking-wide text-faint uppercase">Theme</p>
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-raised",
            item.id === theme && "bg-gold-soft",
          )}
        >
          <span className={cn("swatch", `swatch-${item.id}`)} />
          <span className="min-w-0">
            <span className="block text-sm">{item.name}</span>
            <span className="block text-xs text-faint">{item.blurb}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep/70 px-4" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="shadow-pop w-full max-w-sm rounded-lg border border-border bg-side p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md px-3 text-sm text-muted hover:bg-raised hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-10 rounded-md px-3 text-sm font-medium",
              danger ? "btn-danger" : "bg-accent text-accent-fg",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
