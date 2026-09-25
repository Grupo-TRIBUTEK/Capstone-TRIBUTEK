"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { money } from "../ficha/model";

export function Money({
  value,
  hidden = false,
}: {
  value: number;
  hidden?: boolean;
}) {
  return <span className="tk-money">{hidden ? "••••" : money(value)}</span>;
}
export function Badge({ children }: { children: ReactNode }) {
  const s = String(children);
  const color =
    s === "PAGADO" || s === "Completado"
      ? "green"
      : s === "VENCIDA" || s === "NO ENVIADO"
        ? "red"
        : s === "ENVIADO" || s === "En proceso" || s === "PRÓXIMA"
          ? "amber"
          : "neutral";
  return <span className={`tk-badge ${color}`}>{children}</span>;
}
export function Metric({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="tk-metric">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="tk-empty">{children}</p>;
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`tk tk-dialog ${wide ? "wide" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="tk-dialog-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar ventana">
          Cerrar
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="tk-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function copyReportImage(
  title: string,
  subtitle: string,
  rows: { label: string; amount: number }[],
  total: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 210 + rows.length * 90;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo generar la imagen.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#252f46";
  ctx.fillRect(0, 0, 1100, 90);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 27px Arial";
  ctx.fillText(title, 30, 55, 1030);
  ctx.fillStyle = "#4c586c";
  ctx.font = "22px Arial";
  ctx.fillText(subtitle, 30, 130, 1030);
  rows.forEach((r, i) => {
    const y = 175 + i * 90;
    ctx.fillStyle = i % 2 ? "#fff" : "#faf5f3";
    ctx.fillRect(20, y - 28, 1060, 82);
    ctx.fillStyle = "#252f46";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(r.label, 35, y, 760);
    ctx.textAlign = "right";
    ctx.font = "bold 24px Arial";
    ctx.fillText(money(r.amount), 1060, y + 28);
  });
  ctx.fillStyle = "#252f46";
  ctx.font = "bold 27px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Total", 35, canvas.height - 20);
  ctx.textAlign = "right";
  ctx.fillText(money(total), 1060, canvas.height - 20);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo generar el archivo.")),
      "image/png",
    ),
  );
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return "Imagen copiada. Puedes pegarla en WhatsApp.";
  }
  downloadBlob(blob, "detalle-tributek.png");
  return "Imagen descargada.";
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function printReport(
  title: string,
  subtitle: string,
  rows: { label: string; amount: number }[],
  total: number,
) {
  const w = window.open("", "_blank");
  if (!w)
    throw new Error("Permite la ventana de impresión para guardar el PDF.");
  w.document.write(
    `<html lang="es"><head><title>${escapeHtml(title)}</title><style>body{font:16px Arial;color:#252f46;padding:30px}table{width:100%;border-collapse:collapse}td,th{padding:14px;border-bottom:1px solid #ddd;text-align:left}td:last-child{text-align:right}button{padding:12px}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><table>${rows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${money(r.amount)}</td></tr>`).join("")}</table><h2>Total: ${money(total)}</h2><button onclick="window.print()">Imprimir / Guardar como PDF</button></body></html>`,
  );
  w.document.close();
}
