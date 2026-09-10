import type { ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`h-14 rounded-lg border border-slate-400 bg-white px-4 text-[#252f46] outline-none placeholder:text-slate-500 focus:border-[#252f46] focus:ring-2 focus:ring-[#252f46] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
    />
  );
}