type ReviewCardProps = {
  name: string;
  role: string;
  review: string;
  rating?: number;
};

export default function ReviewCard({ name, role, review, rating = 5 }: ReviewCardProps) {
  const score = Math.max(0, Math.min(5, rating));

  return (
    <article className="rounded-card border border-border bg-surface p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-text-primary">{name}</h3>
          <span className="text-sm text-text-muted">{role}</span>
        </div>
        <span className="shrink-0 text-amber-500" aria-label={`Calificación: ${score} de 5`}>
          <span aria-hidden="true">{"★".repeat(score)}{"☆".repeat(5 - score)}</span>
        </span>
      </header>
      <p className="mt-4 text-text-muted">“{review}”</p>
    </article>
  );
}
