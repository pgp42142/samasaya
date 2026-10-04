"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/grievances";

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = [
    ...(role === "student" ? [{ href: "/new", label: "File a grievance" }] : []),
    { href: "/my", label: "My grievances" },
  ];

  return (
    <nav className="-mb-px flex gap-1 sm:mb-0">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition sm:rounded-lg sm:border-b-0 sm:py-1.5 ${
              active
                ? "border-zinc-900 text-zinc-900 sm:bg-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
