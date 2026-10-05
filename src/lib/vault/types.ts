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
  { id: "obsidian", name: "Obsidian", blurb: "Charcoal and violet" },
  { id: "nord", name: "Nord", blurb: "Arctic blue-gray" },
  { id: "mocha", name: "Mocha", blurb: "Lilac on indigo" },
  { id: "ember", name: "Ember", blurb: "Glass with a copper edge" },
  { id: "minimal", name: "Minimal", blurb: "Quiet paper" },
];
