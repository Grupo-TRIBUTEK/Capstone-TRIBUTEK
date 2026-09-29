import type { ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`h-14 rounded-lg border border-slate-400 bg-surface px-4 text-text-primary outline-none placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
    />
  );
}
