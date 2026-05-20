import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  CONVERSATIONS,
  MESSAGE_THREADS,
  MEMBERS,
  getMember,
  type Message,
  type MessageAttachment,
} from "@/lib/mock-data";
import { RecoComposer } from "@/components/RecoComposer";
import { STATUS_LABEL } from "@/lib/recos-store";
import { Paperclip, Image as ImageIcon, UserPlus, Sparkles, Send, X, Search } from "lucide-react";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages — Coopernic" },
      { name: "description", content: "Messagerie 1-to-1 entre membres du club." },
    ],
  }),
});

function MessagesPage() {
  const [activeId, setActiveId] = useState<string>(CONVERSATIONS[0].id);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [extraMessages, setExtraMessages] = useState<Record<string, Message[]>>({});
  const [recoOpen, setRecoOpen] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const pushMessage = (msg: Omit<Message, "id" | "at" | "from"> & { from?: "me" | "them" }) => {
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const full: Message = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: msg.from ?? "me",
      text: msg.text,
      attachment: msg.attachment,
      at,
    };
    setExtraMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), full],
    }));
  };

  const send = () => {
    const text = (drafts[activeId] ?? "").trim();
    if (!text) return;
    pushMessage({ text });
    setDrafts((prev) => ({ ...prev, [activeId]: "" }));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const url = URL.createObjectURL(f);
      pushMessage({ attachment: { kind: "photo", url, name: f.name } });
    });
    setAttachMenuOpen(false);
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
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <Link
              to="/membres/$id"
              params={{ id: member.id }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Fiche →
            </Link>
          </header>

          {/* Thread */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-background/40 px-4 py-6 md:px-6">
            {thread.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-border/70 bg-surface p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring/50">
              {/* + button with attach menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Ajouter une pièce jointe"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                {attachMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAttachMenuOpen(false)} />
                    <div className="absolute bottom-12 left-0 z-20 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated">
                      <AttachOption
                        icon={<ImageIcon className="h-4 w-4" />}
                        label="Photo"
                        sub="Image depuis ton appareil"
                        onClick={() => fileRef.current?.click()}
                      />
                      <AttachOption
                        icon={<UserPlus className="h-4 w-4" />}
                        label="Contact"
                        sub="Partager un membre"
                        onClick={() => { setAttachMenuOpen(false); setContactPickerOpen(true); }}
                      />
                    </div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <button
                type="button"
                onClick={() => setRecoOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 text-xs font-bold text-accent transition-colors hover:bg-accent/20"
                aria-label="Envoyer une recommandation"
              >
                <Sparkles className="h-4 w-4" />
                Reco
              </button>

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
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              ↵ Envoyer · ⇧↵ Nouvelle ligne · 📎 Photo · 👤 Contact · ✨ Reco
            </p>
          </div>
        </section>
      </div>

      {/* Reco composer */}
      <RecoComposer
        open={recoOpen}
        onClose={() => setRecoOpen(false)}
        toMember={member}
        conversationId={activeId}
        onSent={(reco) => {
          pushMessage({
            attachment: {
              kind: "reco",
              recoId: reco.id,
              prospectName: reco.prospectName,
              prospectCompany: reco.prospectCompany,
              description: reco.description,
              estimatedAmount: reco.estimatedAmount,
              status: reco.status,
            },
          });
        }}
      />

      {/* Contact picker modal */}
      {contactPickerOpen && (
        <ContactPicker
          onClose={() => setContactPickerOpen(false)}
          onPick={(memberId) => {
            pushMessage({ attachment: { kind: "contact", memberId } });
            setContactPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AttachOption({
  icon, label, sub, onClick,
}: { icon: React.ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const mine = message.from === "me";
  const a = message.attachment;
  return (
    <div className={"flex " + (mine ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[78%] overflow-hidden rounded-2xl text-sm leading-relaxed shadow-sm " +
          (mine
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md border border-border bg-surface text-foreground")
        }
      >
        {a?.kind === "photo" && (
          <a href={a.url} target="_blank" rel="noreferrer" className="block">
            <img
              src={a.url}
              alt={a.name ?? "photo"}
              className="max-h-72 w-full max-w-sm object-cover"
            />
          </a>
        )}

        {a?.kind === "contact" && <ContactCard memberId={a.memberId} mine={mine} />}
        {a?.kind === "reco" && <RecoCard a={a} mine={mine} />}

        {message.text && (
          <p className={"whitespace-pre-wrap px-3.5 py-2 " + (a ? "pt-2" : "")}>{message.text}</p>
        )}

        <div className={
          "px-3.5 pb-1.5 text-right text-[10px] " +
          (mine ? "text-accent-foreground/60" : "text-muted-foreground")
        }>
          {message.at}
        </div>
      </div>
    </div>
  );
}

function ContactCard({ memberId, mine }: { memberId: string; mine: boolean }) {
  const m = getMember(memberId);
  if (!m) return null;
  return (
    <Link
      to="/membres/$id"
      params={{ id: m.id }}
      className={
        "flex items-center gap-3 border-b px-3 py-3 transition-colors " +
        (mine ? "border-accent-foreground/15 hover:bg-accent-foreground/5" : "border-border/60 hover:bg-secondary/50")
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
        {m.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{m.firstName} {m.lastName}</div>
        <div className={"truncate text-xs " + (mine ? "text-accent-foreground/70" : "text-ink-muted")}>
          {m.role} · {m.company}
        </div>
      </div>
      <span className={"text-[10px] font-bold uppercase tracking-wider " + (mine ? "text-accent-foreground/60" : "text-muted-foreground")}>
        Contact
      </span>
    </Link>
  );
}

function RecoCard({ a, mine }: {
  a: Extract<MessageAttachment, { kind: "reco" }>;
  mine: boolean;
}) {
  const label = STATUS_LABEL[a.status as keyof typeof STATUS_LABEL] ?? a.status;
  return (
    <Link
      to="/recos"
      className={
        "block border-b px-3.5 py-3 " +
        (mine ? "border-accent-foreground/15" : "border-border/60")
      }
    >
      <div className={"mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (mine ? "text-accent-foreground/70" : "text-accent")}>
        <Sparkles className="h-3 w-3" /> Recommandation
      </div>
      <div className="font-display text-sm font-extrabold">
        {a.prospectName} <span className={mine ? "opacity-70" : "text-ink-muted"}>· {a.prospectCompany}</span>
      </div>
      <p className={"mt-1 line-clamp-2 text-xs " + (mine ? "text-accent-foreground/80" : "text-ink-muted")}>
        {a.description}
      </p>
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className={
          "rounded-full px-2 py-0.5 font-bold " +
          (mine ? "bg-accent-foreground/15" : "bg-secondary text-foreground")
        }>
          {label}
        </span>
        {a.estimatedAmount && (
          <span className={mine ? "opacity-80" : "text-ink-muted"}>
            ~{a.estimatedAmount.toLocaleString("fr-FR")} €
          </span>
        )}
        <span className={"ml-auto text-[10px] font-semibold " + (mine ? "opacity-70" : "text-accent")}>
          Voir dans Stats →
        </span>
      </div>
    </Link>
  );
}

function ContactPicker({
  onClose, onPick,
}: { onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MEMBERS;
    return MEMBERS.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.company} ${m.role}`.toLowerCase().includes(s)
    );
  }, [q]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="font-display text-lg font-extrabold">Partager un contact</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-border/70 p-3">
          <div className="relative">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {list.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onPick(m.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-secondary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="truncate text-xs text-ink-muted">{m.role} · {m.company}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
