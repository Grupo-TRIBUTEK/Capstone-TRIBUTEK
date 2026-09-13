export type IconName = "home" | "users" | "briefcase" | "calendar" | "calculator" | "file" | "wallet" | "team" | "message" | "shield" | "settings" | "search" | "plus" | "download";

const paths: Record<IconName, string> = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  briefcase: "M8 7V4h8v3M3 7h18v14H3ZM3 12c6 4 12 4 18 0M12 11v5",
  calendar: "M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2",
  calculator: "M5 2h14v20H5ZM8 5h8v4H8ZM8 13h1M15 13h1M8 17h1M15 17h1",
  file: "M14 2H5v20h14V7ZM14 2v6h5M8 12h8M8 16h8",
  wallet: "M3 5h17v16H3ZM3 5V3h14M15 11h6v5h-6ZM17 13.5h1",
  team: "M2 21v-3a4 4 0 0 1 4-4h3M22 21v-3a4 4 0 0 0-4-4h-3M8 21v-3a4 4 0 0 1 8 0v3M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  message: "M3 3h18v14H8l-5 4ZM7 7h10M7 11h7",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6",
  settings: "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 4v16M4 12h16",
  download: "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5",
};

// Decorativos: el texto visible del enlace o botón proporciona el nombre accesible.
export default function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={paths[name]} />
    </svg>
  );
}
