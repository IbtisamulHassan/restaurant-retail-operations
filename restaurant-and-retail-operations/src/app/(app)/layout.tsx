import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/server";
import Shell from "@/components/shell";

const ROLE_HOME: Record<string, string> = {
  OWNER: "/dashboard",
  STAFF: "/dashboard",
  KITCHEN: "/orders",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const s = await getSettings();
  void ROLE_HOME;
  return (
    <Shell user={session} businessName={s.businessName}>
      {children}
    </Shell>
  );
}
