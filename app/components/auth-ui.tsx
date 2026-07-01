import type { ReactNode } from "react";

export function AuthShell({
  subtitle,
  action,
  children,
}: {
  subtitle: string;
  action: (formData: FormData) => void;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <form
        action={action}
        className="w-full max-w-sm space-y-5 rounded-[16px] border border-border bg-surface p-8"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-[10px] text-[18px] font-extrabold text-bg"
            style={{ background: "var(--color-accent)" }}
          >
            C
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-text">
              Curio
            </h1>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </form>
    </main>
  );
}

export function AuthField({
  id,
  label,
  type,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-3">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type ?? "text"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="w-full rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
      />
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-danger" role="alert">
      {error}
    </p>
  );
}

export function SubmitButton({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[10px] bg-accent px-4 py-2.5 font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}
