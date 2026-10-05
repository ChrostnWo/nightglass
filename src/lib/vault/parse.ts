export type UlItem = {
  text: string;
  depth: number;
  checked?: boolean;
  line: number;
};

export type OlItem = {
  text: string;
  depth: number;
  n: number;
};

export type Block =
  | { type: "heading"; level: number; text: string; line: number; id: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: UlItem[] }
  | { type: "ol"; items: OlItem[] }
  | { type: "quote"; kind?: string; title?: string; lines: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "hr" }
  | { type: "table"; header: string[]; rows: string[][] };

export function stripCode(src: string) {
  return src.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

export function wikiTargets(src: string): string[] {
  const clean = stripCode(src);
  const out: string[] = [];
  const re = /\[\[([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean))) {
    const target = match[1]?.trim() ?? "";
    if (target && !out.includes(target)) out.push(target);
  }
  return out;
}

export function noteTags(src: string): string[] {
  const clean = stripCode(src);
  const out: string[] = [];
  const re = /(^|[\s([{])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean))) {
    const tag = match[2] ?? "";
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function rewriteWikilinks(body: string, from: string, to: string) {
  if (!from || from === to) return body;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[\\[${escaped}(\\s*[#|][^\\]]*)?\\]\\]`, "g");
  return body.replace(re, (_full, rest: string | undefined) => `[[${to}${rest ?? ""}]]`);
}

export function countWords(text: string) {
  const found = text.trim().match(/[\p{L}\p{N}’']+/gu);
  return found ? found.length : 0;
}

export function fuzzy(query: string, text: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = text.toLowerCase();
  let index = 0;
  for (const char of hay) {
    if (char === needle[index]) index += 1;
    if (index >= needle.length) return true;
  }
  return false;
}

export function snippet(body: string, query: string) {
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("```"));
  const hit =
    lines.find((line) => (needle ? line.toLowerCase().includes(needle) : false)) ??
    lines.find((line) => !line.startsWith("#")) ??
    "";
  const cleaned = hit
    .replace(/^>\s?/, "")
    .replace(/^[-*]\s+(\[[ xX]\]\s+)?/, "")
    .replace(/^#+\s+/, "");
  return cleaned.length > 110 ? `${cleaned.slice(0, 108)}…` : cleaned;
}

export function editedLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Edited today";
  return `Edited ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function isTableStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  if (!line.includes("|")) return false;
  return /^\s*\|?\s*:?-{3,}/.test(next);
}

function isStructural(lines: string[], index: number) {
  const line = lines[index];
  if (line === undefined || !line.trim()) return true;
  if (line.startsWith("```") || line.startsWith(">")) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return true;
  if (/^\s*[-*]\s+/.test(line)) return true;
  if (/^\s*\d+\.\s+/.test(line)) return true;
  if (isTableStart(lines, index)) return true;
  return false;
}

function splitRow(line: string) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const seen = new Map<string, number>();
  let index = 0;

  const slug = (text: string) => {
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", lang, code: buffer.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const text = heading[2]?.trim() ?? "";
      blocks.push({ type: "heading", level, text, line: index, id: slug(text) });
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith(">")) {
        quote.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      const call = /^\[!([A-Za-z]+)\]\s*(.*)$/.exec((quote[0] ?? "").trim());
      if (call) {
        blocks.push({
          type: "quote",
          kind: (call[1] ?? "note").toLowerCase(),
          title: (call[2] ?? "").trim(),
          lines: quote.slice(1),
        });
      } else {
        blocks.push({ type: "quote", lines: quote });
      }
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: UlItem[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        const current = lines[index] ?? "";
        const task = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/.exec(current);
        const plain = /^(\s*)[-*]\s+(.*)$/.exec(current);
        const spaces = task?.[1] ?? plain?.[1] ?? "";
        const depth = Math.min(3, Math.floor(spaces.length / 2));
        if (task) {
          items.push({
            text: task[3] ?? "",
            depth,
            checked: (task[2] ?? "").toLowerCase() === "x",
            line: index,
          });
        } else if (plain) {
          items.push({ text: plain[2] ?? "", depth, line: index });
        }
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: OlItem[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        const match = /^(\s*)(\d+)\.\s+(.*)$/.exec(lines[index] ?? "");
        if (match) {
          items.push({
            text: match[3] ?? "",
            depth: Math.min(3, Math.floor((match[1] ?? "").length / 2)),
            n: Number(match[2] ?? "1"),
          });
        }
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitRow(lines[index] ?? "");
      index += 2;
      const rows: string[][] = [];
      while (
        index < lines.length &&
        (lines[index] ?? "").includes("|") &&
        (lines[index] ?? "").trim()
      ) {
        rows.push(splitRow(lines[index] ?? ""));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const para: string[] = [];
    while (index < lines.length && !isStructural(lines, index)) {
      para.push((lines[index] ?? "").trim());
      index += 1;
    }
    const text = para.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
  }

  return blocks;
}

export function headingsOf(src: string) {
  return parseBlocks(src).flatMap((block) =>
    block.type === "heading"
      ? [{ level: block.level, text: block.text, id: block.id, line: block.line }]
      : [],
  );
}
