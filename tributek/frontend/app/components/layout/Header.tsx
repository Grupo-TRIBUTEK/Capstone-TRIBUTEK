type HeaderProps = {
  title: string;
  description?: string;
};

export default function Header({
  title,
  description,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200 pb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        TRIBUTEK
      </p>

      <h1 className="mt-2 text-2xl font-bold text-[#252f46]">
        {title}
      </h1>

      {description && (
        <p className="mt-2 text-sm text-slate-600">
          {description}
        </p>
      )}
    </header>
  );
}