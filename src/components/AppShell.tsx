"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Settings } from "lucide-react";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        document.documentElement.dataset.theme = data.settings?.theme ?? "dark";
        document.documentElement.style.setProperty("--accent", data.settings?.accentColor ?? "#78a6ff");
      })
      .catch(() => {
        document.documentElement.dataset.theme = "dark";
      });
  }, [pathname]);

  const items = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/learning", label: "Lernen", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <main className="shell">{children}</main>
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" || pathname === "/news" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} className={`nav-item ${active ? "active" : ""}`} href={item.href}>
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
