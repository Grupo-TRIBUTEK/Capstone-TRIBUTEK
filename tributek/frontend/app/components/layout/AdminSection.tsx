import Link from "next/link";
import Header from "./Header";
import EmptyState from "../ui/EmptyState";
import Icon, { type IconName } from "../ui/Icon";

export type AdminSectionProps = {
  title: string;
  description: string;
  icon: IconName;
  action: string;
  metrics: string[];
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  notes: { title: string; description: string }[];
  related: { href: string; label: string }[];
};

export default function AdminSection(props: AdminSectionProps) {
  return (
    <main className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-2 rounded text-sm font-medium text-secondary-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
        <Icon name="home" /> Volver al panel principal
      </Link>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary-strong"><Icon name={props.icon} className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><Header title={props.title} description={props.description} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-secondary/40 bg-secondary-surface p-4">
        <p className="max-w-xl text-sm leading-6 text-text-primary"><strong>Vista en preparación.</strong> Puedes recorrer las secciones. Los registros y las acciones todavía no están disponibles.</p>
        <div>
          <button type="button" disabled aria-describedby="pending-action" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"><Icon name="plus" />{props.action}</button>
          <p id="pending-action" className="mt-1 text-xs text-slate-600">Disponible en una próxima entrega</p>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {props.metrics.map((metric) => <div key={metric} className="rounded-xl border border-border bg-surface p-5"><dt className="text-sm text-text-muted">{metric}</dt><dd className="mt-3 font-semibold text-text-primary">Pendiente de conectar</dd></div>)}
      </dl>
      <section aria-labelledby="list-title" className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-5"><h2 id="list-title" className="font-semibold text-text-primary">{props.title}: registros</h2><p className="mt-1 text-sm text-text-muted">La información aparecerá aquí cuando la sección esté habilitada.</p></div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Tabla de ${props.title}`}>
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Estructura prevista para los registros de {props.title}; no contiene datos reales.</caption>
            <thead className="bg-primary text-white"><tr>{props.columns.map((column) => <th key={column} scope="col" className="px-5 py-4 font-medium">{column}</th>)}</tr></thead>
            <tbody><tr><td colSpan={props.columns.length} className="p-5"><EmptyState icon={props.icon} title={props.emptyTitle} description={props.emptyDescription} /></td></tr></tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="next-title">
        <h2 id="next-title" className="mb-4 font-semibold text-text-primary">Qué encontrarás en esta sección</h2>
        <div className="grid gap-4 lg:grid-cols-2">{props.notes.map((note) => <article key={note.title} className="rounded-xl border border-border bg-surface p-5"><h3 className="font-medium text-text-primary">{note.title}</h3><p className="mt-2 text-sm leading-6 text-text-muted">{note.description}</p></article>)}</div>
      </section>
      <nav aria-label="Secciones relacionadas" className="flex flex-wrap gap-3">{props.related.map((link) => <Link key={link.href} href={link.href} className="rounded-lg border border-secondary px-4 py-3 text-sm font-medium text-text-primary hover:bg-secondary-surface focus-visible:outline-2 focus-visible:outline-offset-2">{link.label}<span aria-hidden="true"> →</span></Link>)}</nav>
    </main>
  );
}
