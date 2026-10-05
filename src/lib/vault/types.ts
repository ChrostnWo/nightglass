export type ThemeId = "obsidian" | "nord" | "mocha" | "ember" | "minimal";

export type EditorMode = "edit" | "read" | "split";

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
};

export type Note = {
  id: string;
  title: string;
  folderId: string | null;
  body: string;
  createdAt: number;
  updatedAt: number;
};

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  blurb: string;
};

export const THEMES: ThemeMeta[] = [
  { id: "obsidian", name: "Obsidian", blurb: "Charcoal, crimson, dandelion" },
  { id: "nord", name: "Nord", blurb: "Black field, dandelion controls" },
  { id: "mocha", name: "Mocha", blurb: "Black with a crimson edge" },
  { id: "ember", name: "Ember", blurb: "Charcoal and a dandelion flame" },
  { id: "minimal", name: "Minimal", blurb: "White paper, crimson mark" },
];
