import Link from "next/link";

// The places inside Learn. Quick capture and the detailed form are peers:
// one for a link in hand, one for logging a session with everything known.
const ITEMS = [
  { href: "/learn", label: "Start" },
  { href: "/sessions/new", label: "Add with details" },
  { href: "/sessions", label: "History" },
  { href: "/tracks", label: "Tracks" },
] as const;

export type LearnPlace = (typeof ITEMS)[number]["label"];

export function LearnNav({ active }: { active: LearnPlace }) {
  return (
    <nav aria-label="Learn" className="flex flex-wrap gap-x-6 gap-y-2">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active === item.label ? "page" : undefined}
          className={active === item.label ? "choice choice-active" : "choice"}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
