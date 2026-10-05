import { ChevronRight, FilePlus, FileText, Folder, FolderPlus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { fuzzy, snippet } from "@/lib/vault/parse";
import { useVault } from "@/lib/vault/store";
import type { Folder as FolderType, Note } from "@/lib/vault/types";

const PAD = ["pl-2", "pl-5", "pl-8", "pl-11", "pl-14"] as const;

type Props = {
  onOpened: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
};

function sortedFolders(folders: FolderType[], parentId: string | null) {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sortedNotes(notes: Note[], folderId: string | null) {
  return notes
    .filter((note) => note.folderId === folderId)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function Sidebar({ onOpened, onDeleteNote, onDeleteFolder }: Props) {
  const folders = useVault((state) => state.folders);
  const notes = useVault((state) => state.notes);
  const activeId = useVault((state) => state.activeId);
  const collapsed = useVault((state) => state.collapsed);
  const query = useVault((state) => state.query);
  const setQuery = useVault((state) => state.setQuery);
  const openNote = useVault((state) => state.openNote);
  const createNote = useVault((state) => state.createNote);
  const createFolder = useVault((state) => state.createFolder);
  const toggleCollapsed = useVault((state) => state.toggleCollapsed);
  const renameFolder = useVault((state) => state.renameFolder);
  const editingFolderId = useVault((state) => state.editingFolderId);
  const clearEditingFolder = useVault((state) => state.clearEditingFolder);
  const active = notes.find((note) => note.id === activeId) ?? null;

  const open = (id: string) => {
    openNote(id);
    onOpened();
  };

  const results = query.trim()
    ? notes.filter(
        (note) =>
          fuzzy(query, note.title) ||
          fuzzy(query, note.body) ||
          noteTagsMatch(note.body, query),
      )
    : [];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-side md:w-60">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <Shard />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Nightglass</p>
          <p className="truncate text-xs text-faint">Charcoal & crimson</p>
        </div>
      </div>
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="vault-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-11 w-full rounded-md border border-border bg-deep pr-8 pl-8 text-base text-fg outline-none placeholder:text-faint focus-visible:border-gold md:h-8 md:text-sm"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center text-faint"
              onClick={() => setQuery("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">
          {query.trim() ? "Results" : "Files"}
        </p>
        <div className="flex">
          <button
            type="button"
            aria-label="New note"
            title="New note"
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
            onClick={() => {
              createNote(active?.folderId ?? null);
              onOpened();
            }}
          >
            <FilePlus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="New folder"
            title="New folder"
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
            onClick={() => createFolder(null)}
          >
            <FolderPlus className="size-4" />
          </button>
        </div>
      </div>
      <div className="vault-scroll min-h-0 flex-1 overflow-y-auto pb-3">
        {query.trim() ? (
          results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No notes match.</p>
          ) : (
            results.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => open(note.id)}
                className={cn(
                  "block w-full px-3 py-2 text-left hover:bg-raised",
                  note.id === activeId && "bg-gold-soft",
                )}
              >
                <span className="block truncate text-sm">{note.title}</span>
                <span className="block truncate text-xs text-faint">{snippet(note.body, query)}</span>
              </button>
            ))
          )
        ) : (
          <Tree
            parentId={null}
            depth={0}
            folders={folders}
            notes={notes}
            activeId={activeId}
            collapsed={collapsed}
            editingFolderId={editingFolderId}
            onOpen={open}
            onToggle={toggleCollapsed}
            onCreateNote={(folderId) => {
              createNote(folderId);
              onOpened();
            }}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDoneEditing={clearEditingFolder}
            onDeleteNote={onDeleteNote}
            onDeleteFolder={onDeleteFolder}
          />
        )}
      </div>
    </aside>
  );
}

function noteTagsMatch(body: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle.startsWith("#")) return false;
  return body.toLowerCase().includes(needle);
}

function Tree({
  parentId,
  depth,
  folders,
  notes,
  activeId,
  collapsed,
  editingFolderId,
  onOpen,
  onToggle,
  onCreateNote,
  onCreateFolder,
  onRenameFolder,
  onDoneEditing,
  onDeleteNote,
  onDeleteFolder,
}: {
  parentId: string | null;
  depth: number;
  folders: FolderType[];
  notes: Note[];
  activeId: string | null;
  collapsed: string[];
  editingFolderId: string | null;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateNote: (folderId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onRenameFolder: (id: string, name: string) => boolean;
  onDoneEditing: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
}) {
  const pad = PAD[Math.min(depth, PAD.length - 1)];
  return (
    <>
      {sortedNotes(notes, parentId).map((note) => (
        <div key={note.id} className={cn("group flex items-center pr-1", note.id === activeId && "bg-gold-soft")}>
          <button
            type="button"
            onClick={() => onOpen(note.id)}
            className={cn("flex h-10 min-w-0 flex-1 items-center gap-1.5 text-left text-sm md:h-7", pad)}
            aria-current={note.id === activeId ? "page" : undefined}
          >
            <FileText className={cn("size-3.5 shrink-0", note.id === activeId ? "text-gold" : "text-faint")} />
            <span className="truncate">{note.title}</span>
          </button>
          <button
            type="button"
            aria-label={`Delete ${note.title}`}
            className="grid size-8 shrink-0 place-items-center text-faint opacity-100 hover:text-danger md:size-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={() => onDeleteNote(note.id)}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      {sortedFolders(folders, parentId).map((folder) => {
        const open = !collapsed.includes(folder.id);
        return (
          <div key={folder.id}>
            <FolderRow
              folder={folder}
              open={open}
              pad={pad}
              editing={editingFolderId === folder.id}
              onToggle={() => onToggle(folder.id)}
              onRename={(name) => onRenameFolder(folder.id, name)}
              onDoneEditing={onDoneEditing}
              onCreateNote={() => onCreateNote(folder.id)}
              onCreateFolder={() => onCreateFolder(folder.id)}
              onDelete={() => onDeleteFolder(folder.id)}
            />
            {open ? (
              <Tree
                parentId={folder.id}
                depth={depth + 1}
                folders={folders}
                notes={notes}
                activeId={activeId}
                collapsed={collapsed}
                editingFolderId={editingFolderId}
                onOpen={onOpen}
                onToggle={onToggle}
                onCreateNote={onCreateNote}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDoneEditing={onDoneEditing}
                onDeleteNote={onDeleteNote}
                onDeleteFolder={onDeleteFolder}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function FolderRow({
  folder,
  open,
  pad,
  editing,
  onToggle,
  onRename,
  onDoneEditing,
  onCreateNote,
  onCreateFolder,
  onDelete,
}: {
  folder: FolderType;
  open: boolean;
  pad: string;
  editing: boolean;
  onToggle: () => void;
  onRename: (name: string) => boolean;
  onDoneEditing: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(folder.name);
  useEffect(() => setDraft(folder.name), [folder.name]);
  useEffect(() => {
    if (!editing) return;
    const input = document.getElementById(`folder-${folder.id}`) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, [editing, folder.id]);

  return (
    <div className="group flex items-center pr-1">
      <button
        type="button"
        aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
        onClick={onToggle}
        className={cn("grid h-10 w-6 shrink-0 place-items-center text-faint md:h-7", pad)}
      >
        <ChevronRight className={cn("size-3.5", open && "rotate-90")} />
      </button>
      {editing ? (
        <input
          id={`folder-${folder.id}`}
          value={draft}
          aria-label="Folder name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!onRename(draft)) setDraft(folder.name);
            onDoneEditing();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            if (event.key === "Escape") {
              setDraft(folder.name);
              onDoneEditing();
            }
          }}
          className="h-8 min-w-0 flex-1 rounded border border-accent bg-bg px-1 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onToggle}
          onDoubleClick={() => {
            const input = document.getElementById(`folder-${folder.id}`);
            if (!input) onDoneEditing();
          }}
          className="flex h-10 min-w-0 flex-1 items-center gap-1.5 text-left text-sm text-muted md:h-7"
        >
          <Folder className="size-3.5 shrink-0 text-faint" />
          <span className="truncate">{folder.name}</span>
        </button>
      )}
      <button
        type="button"
        aria-label={`New note in ${folder.name}`}
        className="grid size-8 place-items-center text-faint md:size-6 md:opacity-0 md:group-hover:opacity-100"
        onClick={onCreateNote}
      >
        <FilePlus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`New folder in ${folder.name}`}
        className="hidden size-6 place-items-center text-faint md:grid md:opacity-0 md:group-hover:opacity-100"
        onClick={onCreateFolder}
      >
        <FolderPlus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${folder.name}`}
        className="grid size-8 place-items-center text-faint hover:text-danger md:size-6 md:opacity-0 md:group-hover:opacity-100"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function Shard({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ng-deep)" />
      <path d="M16 5.5 25.2 13.2 20.4 26.2 10.2 23.6 7 13.8Z" fill="var(--ng-crimson)" />
      <path d="M16 5.5 20.6 16.4 10.2 23.6 7 13.8Z" fill="var(--ng-dandelion)" />
    </svg>
  );
}
