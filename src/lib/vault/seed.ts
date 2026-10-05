import type { Folder, Note } from "./types";

const now = Date.now();

export const SEED_FOLDERS: Folder[] = [
  { id: "f-field", name: "Field", parentId: null },
  { id: "f-guides", name: "Guides", parentId: null },
  { id: "f-practice", name: "Practice", parentId: null },
];

function note(
  id: string,
  title: string,
  folderId: string | null,
  body: string,
): Note {
  return {
    id,
    title,
    folderId,
    body: body.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export const SEED_NOTES: Note[] = [
  note(
    "n-welcome",
    "Welcome",
    null,
    `
Nightglass is a private vault: charcoal panes, black rails, white type, crimson for the action, and dandelion for the mark.

Nothing here leaves this browser. Follow a link, change the glass, or write over this page.

## Start here

- [[Wikilinks]] are how one note points at another.
- [[The graph]] draws those points as a map.
- [[Themes]] keeps the words and changes the glass.
- [[Callouts]] hold the aside you do not want to lose.

> [!note] Palette
> Charcoal, crimson, white, black, and dandelion. The words stay light. Color only marks where to look.

## Try this

- [x] Read this note without leaving the vault
- [ ] Follow the link to [[Obsidian glass]]
- [ ] Press Ctrl K and switch the theme
- [ ] Flip to Edit and add a line of your own

Filed under #start.
`,
  ),
  note(
    "n-wikilinks",
    "Wikilinks",
    "f-guides",
    `
A wikilink is a title in double brackets. [[Backlinks]] lists every note that points here. [[The graph]] uses the same brackets as its edges.

## Write one

\`\`\`
See [[Volcanic glass]] and [[Volcanic glass|the stone]].
\`\`\`

The text before the bar is the note title. The text after is what you want to show. A missing title is drawn dashed. Click it and Nightglass makes the note.

## Names

Rename a note and every link that used the old title follows. Two notes cannot share a name, because a wikilink would not know where to go. [[Welcome]] is a fine place to start.

#linking
`,
  ),
  note(
    "n-graph",
    "The graph",
    "f-guides",
    `
The graph is the vault from above. Each circle is a note. Each line is a wikilink, in either direction.

## How to read it

Drag a circle to pin it. Use the zoom buttons, or a scroll wheel, and click a circle to open that note. The open note wears the accent. Notes it mentions, and notes that mention it, light their edges.

[[Obsidian glass]] sits with [[Volcanic glass]] and [[Conchoidal fracture]]. [[Welcome]] sits near the guides. Related notes drift together. That shape is the point.

#map
`,
  ),
  note(
    "n-reading",
    "Reading view",
    "f-guides",
    `
Reading view renders the note. Editing view is the source. Split keeps both, when the window is wide enough.

## What renders

- Headings, lists, and task boxes you can tick
- \`inline code\` and fenced blocks
- [A plain link](https://en.wikipedia.org/wiki/Obsidian) when it is ordinary http
- [[Callouts]] and [[Wikilinks]]

Tick a box in [[Daily notes]]. The source updates, even if you never switch to Edit.

#reading
`,
  ),
  note(
    "n-themes",
    "Themes",
    "f-guides",
    `
The words stay. The glass changes. Open the palette icon on the left rail, or press Ctrl K and type a theme name.

## Five glasses

- **Obsidian** is the default. Charcoal panes, white type, crimson controls, dandelion marks.
- **Nord** is black, with dandelion on the buttons.
- **Mocha** is the same night, pressed darker, crimson at the edge.
- **Ember** is charcoal with a dandelion flame.
- **Minimal** is white paper and black type, still crimson and dandelion.

The choice is remembered with the vault. [[Obsidian glass]] is the note about the rock. This one is only about color.

#themes
`,
  ),
  note(
    "n-obsidian",
    "Obsidian glass",
    "f-field",
    `
Obsidian is lava that cooled before it could crystallize. What you get is glass: hard, dark, and faintly translucent at a thin edge.

## What you see

Most of the stone looks black because the glass swallows light. A thin flake can go smoky brown. The shine is the surface, not a dye. Break it and the break is a [[Conchoidal fracture]], the same curve thick bottle glass makes.

It only comes from [[Volcanic glass]]. People have knapped it into blades and mirrors for a very long time. This vault borrows the name. The default [[Themes|theme]] borrows the night: charcoal, black, and two bright edges.

#field
`,
  ),
  note(
    "n-volcanic",
    "Volcanic glass",
    "f-field",
    `
Not every volcano leaves glass. The melt has to be rich in silica, and it has to freeze quickly, in air or in water, so crystals never get started.

## Kin

[[Obsidian glass]] is the famous one, usually from rhyolite. The idea is the same wherever it happens: a liquid structure locked in place. Where the glass later weathers, the chips are the curves in [[Conchoidal fracture]].

#field
`,
  ),
  note(
    "n-fracture",
    "Conchoidal fracture",
    "f-field",
    `
Conchoidal means shell-like. The crack does not follow a flat plane. It ripples, the way a thick pane ripples when it fails, and the fresh edge can be sharper than a steel knife.

## In the stone

You see it on [[Obsidian glass]] more clearly than on almost any other rock, because [[Volcanic glass]] has no crystal grain to steer the crack. The ripple is the material giving way.

#field
`,
  ),
  note(
    "n-daily",
    "Daily notes",
    "f-practice",
    `
A vault gets useful when it has a place for unfinished thoughts. One note a day is enough. Link it to whatever you actually touched.

## A small loop

- [ ] Write one sentence in a new note
- [ ] Link it to something that already exists
- [ ] Open [[Backlinks]] on that older note
- [x] Visit [[Welcome]] so the vault is not a pile of loose files

The title can be the date. The links are the part that compounds. [[Wikilinks]] if you want the brackets explained.

#practice
`,
  ),
  note(
    "n-backlinks",
    "Backlinks",
    "f-practice",
    `
A backlink is a note that mentions this one. You do not file it by hand. Mention [[Obsidian glass]] anywhere, and the mention shows up on that note, in the Backlinks list.

## Why it matters

Folders say where you put a note. Backlinks say who needed it. The second list is usually the true one. [[The graph]] is the same information, drawn instead of listed. [[Wikilinks]] are the only syntax it needs.

#practice
`,
  ),
  note(
    "n-callouts",
    "Callouts",
    "f-practice",
    `
A callout is a blockquote with a label. It is how a note raises its voice without turning into a heading.

> [!tip] Syntax
> Start with \`> [!tip]\` and keep each following line marked with \`>\`.

> [!warning] Do not hide the only copy
> A callout is still just text. If the sentence matters, it should also be a normal sentence, or a [[Wikilinks|link]] someone can follow.

> [!quote] From the field
> The edge is not decorated. The edge is the break. See [[Conchoidal fracture]].

Reading view paints these. The source stays plain, which is the point of [[Reading view]].

#practice
`,
  ),
];
