"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Bell, Dumbbell, Home, Newspaper, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hasNotification, setHasNotification] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

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
    { href: "/", label: "Home", icon: Home },
    { href: "/training", label: "Training", icon: Dumbbell },
    { href: "/news", label: "News", icon: Newspaper },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <header className="top-appbar">
        <Link className="brand-lockup" href="/" aria-label="DayFrame Home">
          <span className="brand-logo" aria-hidden="true">
            <span className="brand-logo-grid">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand-logo-mark">D</span>
          </span>
          <span className="brand-title">DayFrame</span>
        </Link>
        <button
          className="notification-button"
          aria-label="Benachrichtigungen öffnen"
          onClick={() => {
            setShowNotificationModal(true);
            setHasNotification(false);
          }}
        >
          <Bell size={20} />
          {hasNotification ? <span className="notification-dot" aria-hidden="true" /> : null}
        </button>
      </header>

      <main className="shell">{children}</main>

      {showNotificationModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notification-title">
          <div className="modal-card notification-card">
            <div className="row">
              <h2 id="notification-title">
                <Award size={18} />
                System Notifications
              </h2>
              <button className="icon-btn" aria-label="Schließen" onClick={() => setShowNotificationModal(false)}>×</button>
            </div>
            <div className="notification-list">
              <article>
                <strong>Workout Streak</strong>
                <p className="muted small">Dein heutiger Trainingsplan ist bereit.</p>
              </article>
              <article>
                <strong>Daily Briefing</strong>
                <p className="muted small">News, Wetter und Tagesplan werden über deine Next-APIs gespeist.</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
