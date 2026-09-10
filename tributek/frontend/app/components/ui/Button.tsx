import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button">;

export default function Button({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex items-center justify-center rounded-xl bg-[#252f46] px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-[#344463] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#252f46] ${className}`}
    >
      {children}
    </button>
  );
}