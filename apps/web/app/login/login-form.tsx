"use client";

import { useActionState } from "react";
import { sendMagicLink, signInWithGitHub, type LoginActionState } from "./actions";

const INITIAL_STATE: LoginActionState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, INITIAL_STATE);

  if (state.success) {
    return (
      <p className="text-sm text-[color:var(--color-text-muted)]">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)]"
          style={{ borderColor: "var(--color-border)" }}
        />
        {state.error ? <p className="text-xs text-red-500">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--color-accent)", color: "var(--color-surface)" }}
        >
          {pending ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-[color:var(--color-text-muted)]">
        <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
        or
        <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
      </div>

      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="w-full rounded-lg border px-3.5 py-2 text-sm font-medium"
          style={{ borderColor: "var(--color-border)" }}
        >
          Continue with GitHub
        </button>
      </form>
    </div>
  );
}
