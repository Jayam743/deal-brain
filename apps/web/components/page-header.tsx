export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-1.5 max-w-xl text-sm text-[color:var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
