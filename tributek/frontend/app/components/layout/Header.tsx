type HeaderProps = {
  title: string;
  description?: string;
};

export default function Header({
  title,
  description,
}: HeaderProps) {
  return (
    <header className="border-b border-secondary pb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        TRIBUTEK
      </p>

      <h1 className="mt-2 text-2xl font-bold text-text-primary">
        {title}
      </h1>

      {description && (
        <p className="mt-2 text-sm text-text-muted">
          {description}
        </p>
      )}
    </header>
  );
}
