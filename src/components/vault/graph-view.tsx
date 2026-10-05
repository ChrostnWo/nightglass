import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { wikiTargets } from "@/lib/vault/parse";
import type { Note } from "@/lib/vault/types";

type Node = {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
};

type Props = {
  notes: Note[];
  activeId: string | null;
  onOpen: (id: string) => void;
};

function edgesOf(notes: Note[]) {
  const byTitle = new Map(notes.map((note) => [note.title, note.id]));
  const seen = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  for (const note of notes) {
    for (const target of wikiTargets(note.body)) {
      const to = byTitle.get(target);
      if (!to || to === note.id) continue;
      const key = [note.id, to].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: note.id, to });
    }
  }
  return edges;
}

export function GraphView({ notes, activeId, onOpen }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const dragRef = useRef<{ id: string | null; x: number; y: number; moved: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const edges = useMemo(() => edgesOf(notes), [notes]);
  const edgeKey = edges.map((edge) => `${edge.from}-${edge.to}`).join("|");
  const noteKey = notes.map((note) => note.id).join("|");

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = nodesRef.current;
    const live = new Set(notes.map((note) => note.id));
    for (const id of map.keys()) {
      if (!live.has(id)) map.delete(id);
    }
    notes.forEach((note, index) => {
      if (map.has(note.id)) {
        const node = map.get(note.id);
        if (node) node.title = note.title;
        return;
      }
      const angle = (index / Math.max(notes.length, 1)) * Math.PI * 2;
      const radius = 150 + (index % 3) * 18;
      map.set(note.id, {
        id: note.id,
        title: note.title,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        pinned: false,
      });
    });
  }, [noteKey, notes]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let running = true;
    const step = () => {
      const map = nodesRef.current;
      const ids = [...map.keys()];
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = map.get(ids[i] ?? "");
          const b = map.get(ids[j] ?? "");
          if (!a || !b) continue;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.hypot(dx, dy) || 0.01;
          if (dist < 1) {
            dx = 1;
            dy = 0;
            dist = 1;
          }
          const force = 2200 / (dist * dist);
          const ux = dx / dist;
          const uy = dy / dist;
          if (!a.pinned) {
            a.vx += ux * force;
            a.vy += uy * force;
          }
          if (!b.pinned) {
            b.vx -= ux * force;
            b.vy -= uy * force;
          }
        }
      }
      for (const edge of edges) {
        const a = map.get(edge.from);
        const b = map.get(edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const force = (dist - 150) * 0.012;
        const ux = dx / dist;
        const uy = dy / dist;
        if (!a.pinned) {
          a.vx += ux * force;
          a.vy += uy * force;
        }
        if (!b.pinned) {
          b.vx -= ux * force;
          b.vy -= uy * force;
        }
      }
      let energy = 0;
      for (const id of ids) {
        const node = map.get(id);
        if (!node) continue;
        node.vx += -node.x * 0.008;
        node.vy += -node.y * 0.008;
        if (!node.pinned) {
          node.x += Math.max(-12, Math.min(12, node.vx));
          node.y += Math.max(-12, Math.min(12, node.vy));
        }
        node.vx *= 0.78;
        node.vy *= 0.78;
        energy += node.vx * node.vx + node.vy * node.vy;
      }
      setTick((value) => value + 1);
      frame += 1;
      if (running && !reduced && energy > 0.05 && frame < 420) {
        requestAnimationFrame(step);
      }
    };
    if (reduced) {
      for (let i = 0; i < 160; i += 1) step();
    } else {
      requestAnimationFrame(step);
    }
    return () => {
      running = false;
    };
  }, [edgeKey, noteKey, edges]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = event.deltaY > 0 ? 0.92 : 1.08;
      setZoom((value) => Math.min(2.4, Math.max(0.45, value * next)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const nodes = [...nodesRef.current.values()];
  const activeLinks = new Set(
    edges
      .filter((edge) => edge.from === activeId || edge.to === activeId)
      .flatMap((edge) => [edge.from, edge.to]),
  );

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    const id = target.dataset.node ?? null;
    dragRef.current = { id, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    if (drag.id) {
      const node = nodesRef.current.get(drag.id);
      if (node) {
        node.x += dx / zoom;
        node.y += dy / zoom;
        node.pinned = true;
        node.vx = 0;
        node.vy = 0;
      }
    } else {
      setPan((value) => ({ x: value.x + dx, y: value.y + dy }));
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
    setTick((value) => value + 1);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag?.id && !drag.moved) onOpen(drag.id);
    dragRef.current = null;
  };

  return (
    <div ref={wrapRef} className="graph-field relative min-h-0 flex-1">
      <svg
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="Graph of linked notes"
        data-frame={tick}
      >
        <g transform={`translate(${size.w / 2 + pan.x} ${size.h / 2 + pan.y}) scale(${zoom})`}>
          {edges.map((edge) => {
            const a = nodesRef.current.get(edge.from);
            const b = nodesRef.current.get(edge.to);
            if (!a || !b) return null;
            const hot = edge.from === activeId || edge.to === activeId;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? "var(--ng-dandelion)" : "var(--ng-border)"}
                strokeWidth={hot ? 1.6 : 1}
              />
            );
          })}
          {nodes.map((node) => {
            const active = node.id === activeId;
            const linked = activeLinks.has(node.id);
            return (
              <g key={node.id} data-node={node.id} className="cursor-pointer">
                <circle data-node={node.id} cx={node.x} cy={node.y} r={16} fill="transparent" />
                <circle
                  data-node={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={active ? 8 : 6}
                  fill={active ? "var(--ng-crimson)" : "var(--ng-raised)"}
                  stroke={active || linked ? "var(--ng-dandelion)" : "var(--ng-faint)"}
                  strokeWidth={active ? 2.5 : 1.25}
                />
                <text
                  x={node.x}
                  y={node.y + 18}
                  textAnchor="middle"
                  fill={active ? "var(--ng-fg)" : "var(--ng-muted)"}
                  fontSize={11}
                  fontFamily="Source Sans 3 Variable, sans-serif"
                  pointerEvents="none"
                >
                  {node.title.length > 22 ? `${node.title.slice(0, 20)}…` : node.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-side px-2 py-1 text-xs text-muted">
        <span className="tabular-nums">
          {notes.length} notes · {edges.length} links
        </span>
      </div>
      <div className="absolute right-3 bottom-3 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          className="grid size-11 place-items-center rounded-md border border-border bg-side text-fg"
          onClick={() => setZoom((value) => Math.min(2.4, value * 1.12))}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="grid size-11 place-items-center rounded-md border border-border bg-side text-fg"
          onClick={() => setZoom((value) => Math.max(0.45, value / 1.12))}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Reset graph view"
          className="grid size-11 place-items-center rounded-md border border-border bg-side text-fg"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <LocateFixed className="size-4" />
        </button>
      </div>
    </div>
  );
}
