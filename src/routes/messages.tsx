import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { CONVERSATIONS, MESSAGE_THREADS, getMember, type Message } from "@/lib/mock-data";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages — COOPERNIK" },
      { name: "description", content: "Messagerie 1-to-1 entre membres du club." },
    ],
  }),
});

function MessagesPage() {
  const [activeId, setActiveId] = useState<string>(CONVERSATIONS[0].id);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [extraMessages, setExtraMessages] = useState<Record<string, Message[]>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONVERSATIONS;
    return CONVERSATIONS.filter((c) => {
      const m = getMember(c.memberId)!;
      return (
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const conv = CONVERSATIONS.find((c) => c.id === activeId)!;
  const member = getMember(conv.memberId)!;
  const thread = [...(MESSAGE_THREADS[conv.id] ?? []), ...(extraMessages[conv.id] ?? [])];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, extraMessages]);

  const send = () => {
    const text = (drafts[activeId] ?? "").trim();
    if (!text) return;
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMsg: Message = { id: `local-${Date.now()}`, from: "me", text, at };
    setExtraMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), newMsg],
    }));
    setDrafts((prev) => ({ ...prev, [activeId]: "" }));
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Messagerie</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Vos conversations
        </h1>
      </div>

      <div className="grid h-[calc(100vh-260px)] min-h-[560px] gap-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-card md:grid-cols-[340px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col border-r border-border/70">
          <div className="border-b border-border/70 p-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
              />
              <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const m = getMember(c.memberId)!;
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={
                      "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors " +
                      (active
                        ? "border-accent bg-secondary/70"
                        : "border-transparent hover:bg-secondary/40")
                    }
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {m.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{c.lastAt}</span>
                      </div>
                      <p className="truncate text-xs text-ink-muted">{c.lastMessage}</p>
                    </div>
                    {c.unread > 0 && !active && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Conversation */}
        <section className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                {member.initials}
              </div>
              <div>
                <div className="font-display text-base font-bold text-foreground">
                  {member.firstName} {member.lastName}
                </div>
                <div className="text-xs text-ink-muted">{member.role} · {member.company}</div>
              </div>
            </div>
            <a
              href={`/membres/${member.id}`}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Voir la fiche →
            </a>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background/40 px-6 py-6">
            {thread.map((m) => (
              <div key={m.id} className={"flex " + (m.from === "me" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm " +
                    (m.from === "me"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-surface text-foreground")
                  }
                >
                  <p>{m.text}</p>
                  <div className={
                    "mt-1 text-[10px] " +
                    (m.from === "me" ? "text-primary-foreground/60" : "text-muted-foreground")
                  }>
                    {m.at}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border/70 bg-surface p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring/50">
              <textarea
                value={drafts[activeId] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [activeId]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={`Écrire à ${member.firstName}…`}
                className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={send}
                disabled={!(drafts[activeId] ?? "").trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Envoyer
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              ↵ Envoyer · ⇧↵ Nouvelle ligne · Messagerie en lecture seule jusqu'à l'activation de Lovable Cloud
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
