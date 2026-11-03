import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const DESC =
  "Caught in an unnatural storm, you take refuge in a library. When you get inside, the library is trashed and there's no one in sight. You can't leave—the door locks behind you. Navigate monsters, a maze, and a flooded basement to escape, and find out what happened in that library.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Library — A Terminal Game" },
      { name: "description", content: DESC.slice(0, 155) },
      { property: "og:title", content: "The Library — A Terminal Game" },
      { property: "og:description", content: "A text adventure. A storm, a locked door, a flooded basement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Line = { kind: "in" | "out" | "sys" | "warn"; text: string };

const INTRO: Line[] = [
  { kind: "sys", text: "THE LIBRARY · v0.1 · mock session" },
  { kind: "out", text: "Rain hammers the windows. The door clicks shut behind you." },
  { kind: "out", text: "Shelves lie overturned. Paper drifts across the floor." },
  { kind: "sys", text: "Type HELP for commands." },
];

function respond(cmd: string, turn: number): Line[] {
  const c = cmd.trim().toLowerCase();
  if (!c) return [];
  if (c === "help")
    return [{ kind: "sys", text: "Commands: LOOK, NORTH, SOUTH, INVENTORY, WAIT, CLEAR, HELP" }];
  if (c === "look" || c === "l")
    return [{ kind: "out", text: "Reading room. A desk, a dead lamp, a stairwell going down. Water below." }];
  if (["north", "n"].includes(c))
    return [{ kind: "out", text: "The stacks close in. Corridors branch. This is the maze." }];
  if (["south", "s"].includes(c))
    return [{ kind: "warn", text: "The front door. Locked. It does not move." }];
  if (["inventory", "i", "inv"].includes(c))
    return [{ kind: "out", text: "A wet coat. A library card, name smudged." }];
  if (c === "wait")
    return [{ kind: "out", text: `Turn ${String(turn).padStart(3, "0")}. Something shifts in the dark.` }];
  return [{ kind: "warn", text: `Unknown command: ${cmd.trim()}` }];
}

const color: Record<Line["kind"], string> = {
  in: "text-foreground",
  out: "text-body",
  sys: "text-primary",
  warn: "text-warning",
};

function Terminal() {
  const [lines, setLines] = useState<Line[]>(INTRO);
  const [input, setInput] = useState("");
  const [turn, setTurn] = useState(1);
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const submit = () => {
    const cmd = input;
    setInput("");
    setHIdx(-1);
    if (cmd.trim()) setHist((h) => [cmd, ...h]);
    if (cmd.trim().toLowerCase() === "clear") return setLines([]);
    setLines((l) => [...l, { kind: "in", text: `> ${cmd}` }, ...respond(cmd, turn)]);
    setTurn((t) => t + 1);
  };

  return (
    <div
      className="w-full max-w-3xl rounded-md border border-brass-border bg-muted"
      style={{ boxShadow: "var(--shadow-terminal)" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span>[ terminal ]</span>
        <span className="tabular-nums">turn {String(turn).padStart(3, "0")}</span>
      </div>
      <div
        ref={scrollRef}
        className="h-[28rem] overflow-y-auto px-4 py-4 font-mono text-sm leading-6 tabular-nums"
      >
        {lines.map((l, i) => (
          <p key={i} className={`whitespace-pre-wrap ${color[l.kind]}`}>
            {l.text}
          </p>
        ))}
        <div className="relative flex text-foreground">
          <span className="text-primary">{">"}&nbsp;</span>
          <span className="whitespace-pre-wrap break-all">{input}</span>
          <span className="cursor-blink text-primary">▌</span>
          <input
            ref={inputRef}
            autoFocus
            aria-label="Command input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              else if (e.key === "ArrowUp" && hist.length) {
                e.preventDefault();
                const n = Math.min(hIdx + 1, hist.length - 1);
                setHIdx(n);
                setInput(hist[n] ?? "");
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                const n = hIdx - 1;
                setHIdx(Math.max(n, -1));
                setInput(n < 0 ? "" : (hist[n] ?? ""));
              }
            }}
            className="absolute inset-0 opacity-0"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4">
      <header className="mx-auto max-w-2xl pt-16 pb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          [ a text adventure ]
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold text-primary">The Library</h1>
        <div className="mx-auto mt-5 h-px w-24 bg-brass-border" />
        <p className="mt-5 font-serif text-lg italic leading-relaxed text-body">{DESC}</p>
      </header>
      <main className="flex w-full flex-1 justify-center">
        <Terminal />
      </main>
      <footer className="flex gap-8 py-10 font-mono text-xs uppercase tracking-widest">
        <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
          [ GitHub Repository ]
        </a>
        <a href="/" className="text-muted-foreground transition-colors hover:text-primary">
          [ The Chartroom ]
        </a>
      </footer>
    </div>
  );
}
