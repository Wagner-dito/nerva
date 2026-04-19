import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

import { removeMember, revokeInvite } from "./actions";
import { InviteForm } from "./invite-form";

const ROLE_LABELS: Record<"owner" | "admin" | "member", string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canManage = me?.role === "owner" || me?.role === "admin";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: true }),
    canManage
      ? supabase
          .from("invitations")
          .select("id, email, role, expires_at, accepted_at, created_at")
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const pendingInvites = (invites ?? []).filter(
    (i) =>
      !i.accepted_at && new Date(i.expires_at).getTime() > Date.now()
  );

  const baseUrl = await getBaseUrl();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-4xl leading-tight tracking-tight">
          Equipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Quem tem acesso à sua organização no Nerva.
        </p>
      </div>

      {canManage && <InviteForm baseUrl={baseUrl} />}

      <section className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 bg-card/60 px-4 py-3">
          <h2 className="text-sm font-medium">Membros</h2>
        </div>
        <ul className="divide-y divide-border/60">
          {(members ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {m.full_name ?? "—"}
                  {m.id === user.id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (você)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[m.role]}
                </p>
              </div>
              {canManage &&
                m.id !== user.id &&
                m.role !== "owner" && (
                  <form action={removeMember}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                      Remover
                    </Button>
                  </form>
                )}
            </li>
          ))}
        </ul>
      </section>

      {canManage && pendingInvites.length > 0 && (
        <section className="rounded-xl border border-border/60">
          <div className="border-b border-border/60 bg-card/60 px-4 py-3">
            <h2 className="text-sm font-medium">Convites pendentes</h2>
          </div>
          <ul className="divide-y divide-border/60">
            {pendingInvites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[i.role]} · expira{" "}
                    {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code
                    className={cn(
                      "rounded-md border border-border/60 bg-background/60 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                    )}
                  >
                    /signup?invite={i.id.slice(0, 8)}…
                  </code>
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                      Revogar
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Só owner ou admin podem convidar e remover membros.
        </p>
      )}
    </div>
  );
}
