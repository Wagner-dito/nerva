import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, org_id")
    .eq("id", user.id)
    .single();

  const { data: org } = profile
    ? await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.org_id)
        .single()
    : { data: null };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? null}
        orgName={org?.name ?? null}
        role={profile?.role ?? "member"}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
