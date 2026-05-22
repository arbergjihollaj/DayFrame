"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";

export function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setNews(data.news ?? []));
  }, []);

  return (
    <div className="stack">
      <div className="row">
        <h1 className="page-title">News</h1>
        <Link className="icon-btn" href="/" aria-label="Schließen"><X size={20} /></Link>
      </div>
      {news.map((item) => (
        <article className="card stack" key={item.id}>
          <p className="muted small">{item.category} · {item.source}</p>
          <h2 className="section-title">{item.title}</h2>
          <p>{item.summary}</p>
          <p className="muted small"><strong>Warum relevant:</strong> {item.relevance}</p>
        </article>
      ))}
      {!news.length ? <div className="card muted">Noch keine ausgewählten News. Generiere zuerst ein Briefing.</div> : null}
    </div>
  );
}
