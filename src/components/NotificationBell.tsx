import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import { useSession } from "@/lib/use-session";

export function NotificationBell() {
  const { user } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const mark = useMutation({
    mutationFn: () => markFn({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!user) return null;

  const items = q.data?.notifications ?? [];
  const unread = items.filter((n: any) => !n.read_at).length;

  return (
    <DropdownMenu onOpenChange={(o) => { if (o && unread > 0) mark.mutate(); }}>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto p-0">
        <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Aucune notification.</div>
        ) : (
          <ul className="divide-y">
            {items.map((n: any) => (
              <li key={n.id} className={n.read_at ? "opacity-70" : ""}>
                <Link
                  to={n.link || "/"}
                  className="block px-3 py-2.5 hover:bg-secondary/60"
                >
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && (
                    <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
