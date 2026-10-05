import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rewriteWikilinks } from "./parse";
import { SEED_FOLDERS, SEED_NOTES } from "./seed";
import type { EditorMode, Folder, Note, ThemeId } from "./types";

export type VaultState = {
  folders: Folder[];
  notes: Note[];
  openIds: string[];
  activeId: string | null;
  collapsed: string[];
  theme: ThemeId;
  mode: EditorMode;
  leftOpen: boolean;
  rightOpen: boolean;
  query: string;
  focusTitleId: string | null;
  editingFolderId: string | null;
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: EditorMode) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setQuery: (query: string) => void;
  openNote: (id: string) => void;
  closeNote: (id: string) => void;
  createNote: (folderId: string | null, title?: string) => string;
  setTitle: (id: string, raw: string) => boolean;
  finalizeTitle: (id: string) => void;
  updateBody: (id: string, body: string) => void;
  toggleTask: (id: string, line: number) => void;
  deleteNote: (id: string) => void;
  createFolder: (parentId: string | null) => string;
  renameFolder: (id: string, name: string) => boolean;
  deleteFolder: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  clearFocus: () => void;
  clearEditingFolder: () => void;
  restoreSeed: () => void;
};

function cloneSeed() {
  return {
    folders: SEED_FOLDERS.map((folder) => ({ ...folder })),
    notes: SEED_NOTES.map((note) => ({ ...note })),
  };
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueTitle(notes: Note[], base: string) {
  const titles = new Set(notes.map((note) => note.title));
  if (!titles.has(base)) return base;
  let index = 2;
  while (titles.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function uniqueFolderName(folders: Folder[], parentId: string | null, base: string) {
  const names = new Set(
    folders.filter((folder) => folder.parentId === parentId).map((folder) => folder.name),
  );
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function descendantFolderIds(folders: Folder[], id: string): string[] {
  const children = folders.filter((folder) => folder.parentId === id).map((folder) => folder.id);
  return [id, ...children.flatMap((child) => descendantFolderIds(folders, child))];
}

const seed = cloneSeed();

export const useVault = create<VaultState>()(
  persist(
    (set, get) => ({
      folders: seed.folders,
      notes: seed.notes,
      openIds: ["n-welcome"],
      activeId: "n-welcome",
      collapsed: [],
      theme: "obsidian",
      mode: "read",
      leftOpen: true,
      rightOpen: true,
      query: "",
      focusTitleId: null,
      editingFolderId: null,
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
      setLeftOpen: (leftOpen) => set({ leftOpen }),
      setRightOpen: (rightOpen) => set({ rightOpen }),
      toggleLeft: () => set((state) => ({ leftOpen: !state.leftOpen })),
      toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
      setQuery: (query) => set({ query }),
      openNote: (id) =>
        set((state) => ({
          activeId: id,
          openIds: state.openIds.includes(id) ? state.openIds : [...state.openIds, id],
        })),
      closeNote: (id) =>
        set((state) => {
          const openIds = state.openIds.filter((openId) => openId !== id);
          let activeId = state.activeId;
          if (activeId === id) {
            const index = state.openIds.indexOf(id);
            activeId = openIds[index] ?? openIds[index - 1] ?? null;
          }
          return { openIds, activeId };
        }),
      createNote: (folderId, title) => {
        const id = uid();
        const name = uniqueTitle(get().notes, title?.trim() || "Untitled");
        const timestamp = Date.now();
        const note: Note = {
          id,
          title: name,
          folderId,
          body: "",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          notes: [...state.notes, note],
          openIds: [...state.openIds, id],
          activeId: id,
          mode: "edit",
          focusTitleId: id,
          collapsed: state.collapsed.filter((folder) => folder !== folderId),
        }));
        return id;
      },
      setTitle: (id, raw) => {
        const clean = raw.replace(/[\[\]]/g, "");
        if (!clean.trim()) return false;
        const prev = get().notes.find((note) => note.id === id);
        if (!prev) return false;
        if (clean === prev.title) return true;
        if (get().notes.some((note) => note.id !== id && note.title === clean)) return false;
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) return { ...note, title: clean, updatedAt: Date.now() };
            return { ...note, body: rewriteWikilinks(note.body, prev.title, clean) };
          }),
        }));
        return true;
      },
      finalizeTitle: (id) => {
        const prev = get().notes.find((note) => note.id === id);
        if (!prev) return;
        const trimmed = prev.title.trim();
        if (!trimmed) {
          const next = uniqueTitle(
            get().notes.filter((note) => note.id !== id),
            "Untitled",
          );
          get().setTitle(id, next);
          return;
        }
        if (trimmed !== prev.title) get().setTitle(id, trimmed);
      },
      updateBody: (id, body) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, body, updatedAt: Date.now() } : note,
          ),
        })),
      toggleTask: (id, line) => {
        const note = get().notes.find((item) => item.id === id);
        if (!note) return;
        const lines = note.body.split("\n");
        const current = lines[line];
        if (!current) return;
        if (/^(\s*[-*]\s+)\[ \]/.test(current)) {
          lines[line] = current.replace(/^(\s*[-*]\s+)\[ \]/, "$1[x]");
        } else if (/^(\s*[-*]\s+)\[x\]/i.test(current)) {
          lines[line] = current.replace(/^(\s*[-*]\s+)\[x\]/i, "$1[ ]");
        } else {
          return;
        }
        get().updateBody(id, lines.join("\n"));
      },
      deleteNote: (id) =>
        set((state) => {
          const openIds = state.openIds.filter((openId) => openId !== id);
          let activeId = state.activeId;
          if (activeId === id) {
            const index = state.openIds.indexOf(id);
            activeId = openIds[index] ?? openIds[index - 1] ?? null;
          }
          return {
            notes: state.notes.filter((note) => note.id !== id),
            openIds,
            activeId,
          };
        }),
      createFolder: (parentId) => {
        const id = uid();
        const name = uniqueFolderName(get().folders, parentId, "New folder");
        set((state) => ({
          folders: [...state.folders, { id, name, parentId }],
          editingFolderId: id,
          collapsed: state.collapsed.filter((folder) => folder !== parentId),
        }));
        return id;
      },
      renameFolder: (id, name) => {
        const clean = name.replace(/[\\/]/g, "").trim();
        if (!clean) return false;
        const current = get().folders.find((folder) => folder.id === id);
        if (!current) return false;
        const taken = get().folders.some(
          (folder) =>
            folder.id !== id && folder.parentId === current.parentId && folder.name === clean,
        );
        if (taken) return false;
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, name: clean } : folder,
          ),
        }));
        return true;
      },
      deleteFolder: (id) =>
        set((state) => {
          const folderIds = new Set(descendantFolderIds(state.folders, id));
          const removedNotes = new Set(
            state.notes.filter((note) => note.folderId && folderIds.has(note.folderId)).map((note) => note.id),
          );
          const openIds = state.openIds.filter((openId) => !removedNotes.has(openId));
          let activeId = state.activeId;
          if (activeId && removedNotes.has(activeId)) {
            activeId = openIds[0] ?? null;
          }
          return {
            folders: state.folders.filter((folder) => !folderIds.has(folder.id)),
            notes: state.notes.filter((note) => !removedNotes.has(note.id)),
            collapsed: state.collapsed.filter((folder) => !folderIds.has(folder)),
            openIds,
            activeId,
          };
        }),
      toggleCollapsed: (id) =>
        set((state) => ({
          collapsed: state.collapsed.includes(id)
            ? state.collapsed.filter((folder) => folder !== id)
            : [...state.collapsed, id],
        })),
      clearFocus: () => set({ focusTitleId: null }),
      clearEditingFolder: () => set({ editingFolderId: null }),
      restoreSeed: () => {
        const next = cloneSeed();
        set({
          folders: next.folders,
          notes: next.notes,
          openIds: ["n-welcome"],
          activeId: "n-welcome",
          collapsed: [],
          mode: "read",
          query: "",
          focusTitleId: null,
          editingFolderId: null,
        });
      },
    }),
    {
      name: "nightglass-vault-v1",
      version: 1,
      partialize: (state) => ({
        folders: state.folders,
        notes: state.notes,
        openIds: state.openIds,
        activeId: state.activeId,
        collapsed: state.collapsed,
        theme: state.theme,
        mode: state.mode,
        leftOpen: state.leftOpen,
        rightOpen: state.rightOpen,
      }),
    },
  ),
);

export function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useVault.persist.hasHydrated());
  useEffect(() => {
    setHydrated(useVault.persist.hasHydrated());
    return useVault.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
