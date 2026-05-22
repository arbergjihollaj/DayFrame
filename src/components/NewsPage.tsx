"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
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
      <div className="news-list" aria-label="Nachrichtenliste">
        {news.map((item, index) => {
          const content = (
            <>
              <div className="kicker">
                <span className="tag">{item.category}</span>
                <span className="level">#{index + 1}</span>
              </div>
              <h2 className="section-title">{item.title}</h2>
              <p>{item.summary}</p>
              <div className="news-action-row">
                <span className="source">Quelle: {item.source}</span>
                {item.url ? <ExternalLink size={18} aria-hidden="true" /> : <span className="muted small">Kein Link gespeichert</span>}
              </div>
            </>
          );

          return item.url ? (
            <a
              className="card stack news-button"
              href={item.url}
              key={item.id}
              target="_blank"
              rel="noopener noreferrer"
              data-news-id={item.id}
              aria-label={`Nachricht öffnen: ${item.title}`}
            >
              {content}
            </a>
          ) : (
            <article className="card stack news-button disabled" key={item.id} data-news-id={item.id}>
              {content}
            </article>
          );
        })}
      </div>
      {!news.length ? <div className="card muted">Noch keine ausgewählten News. Generiere zuerst ein Briefing.</div> : null}
    </div>
  );
}
