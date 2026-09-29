import Icon, { type IconName } from "./Icon";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: IconName;
};

export default function EmptyState({ title, description, icon = "file" }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border-muted bg-background-subtle px-5 py-10 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-soft text-secondary-strong">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>
    </div>
  );
}
