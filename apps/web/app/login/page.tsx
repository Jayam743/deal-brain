import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/dashboard";

  if (!isSupabaseConfigured()) {
    return (
      <div>
        <PageHeader
          title="Sign in"
          description="Demo mode — Supabase isn't configured, so sign-in is disabled and every page renders on sample data."
        />
      </div>
    );
  }

  const user = await getCurrentUser();
  if (user) {
    redirect(target);
  }

  return (
    <div>
      <PageHeader title="Sign in" description="Magic link or GitHub — no password to manage." />
      <div className="surface-card max-w-sm px-6 py-6">
        <LoginForm next={target} />
      </div>
    </div>
  );
}
