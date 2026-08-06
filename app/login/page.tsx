import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={44} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Inflate AI CRM
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Sign in to your workspace
            </p>
          </div>
        </div>

        <div className="card p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Internal tool · access limited to Inflate AI staff
        </p>
      </div>
    </main>
  );
}
