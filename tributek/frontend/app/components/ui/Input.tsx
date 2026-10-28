/**
 * Interfaz Input. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
import type { ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;

/** Aplica estilos compartidos al input conservando sus propiedades. */
export default function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`h-14 rounded-lg border border-border bg-surface px-4 text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted ${className}`}
    />
  );
}
