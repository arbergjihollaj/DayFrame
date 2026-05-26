"use client";

import { Bookmark, BrainCircuit, ExternalLink, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";

const categoryImages: Record<string, string> = {
  AI: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  Deutschland: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80",
  Welt: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
  Wirtschaft: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  Wissenschaft: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80",
  Sport: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
];

export function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setNews(data.news ?? []));
  }, []);

  const featured = news[0];
  const readingList = news.slice(1, 5);
  const headlines = news.slice(5);

  return (
    <div className="news-page">
      {featured ? <FeaturedArticle item={featured} index={0} onOpen={setSelectedNews} /> : null}

      {readingList.length ? (
        <section className="news-section">
          <div className="news-section-head">
            <h2>Reading List</h2>
            <span>See all</span>
          </div>
          <div className="reading-rail" aria-label="Reading list">
            {readingList.map((item, index) => (
              <ReadingCard item={item} index={index + 1} key={item.id} onOpen={setSelectedNews} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="news-section">
        <div className="news-section-head">
          <h2>Latest Headlines</h2>
        </div>
        <div className="headline-list" aria-label="Nachrichtenliste">
          {(headlines.length ? headlines : news).map((item, index) => (
            <HeadlineCard item={item} index={index + 5} key={`${item.id}-headline`} onOpen={setSelectedNews} />
          ))}
        </div>
        {!news.length ? <div className="card muted">Noch keine ausgewählten News. Generiere zuerst ein Briefing.</div> : null}
      </section>
      {selectedNews ? <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} /> : null}
    </div>
  );
}

function FeaturedArticle({ item, index, onOpen }: { item: NewsItem; index: number; onOpen: (item: NewsItem) => void }) {
  return (
    <NewsCardButton className="featured-news" item={item} onOpen={onOpen} style={newsImageStyle(item, index)}>
      <div className="featured-news-content">
        <div className="featured-meta">
          <span className="featured-tag">Special Report</span>
          <span>6 min read</span>
        </div>
        <h1>{item.title}</h1>
        <div className="featured-bottom">
          <span>{item.source}</span>
          <span>Today</span>
        </div>
      </div>
    </NewsCardButton>
  );
}

function ReadingCard({ item, index, onOpen }: { item: NewsItem; index: number; onOpen: (item: NewsItem) => void }) {
  return (
    <NewsCardButton className="reading-card" item={item} onOpen={onOpen}>
      <span className="reading-image" style={newsImageStyle(item, index)} />
      <strong>{item.title}</strong>
      <span>{item.source}</span>
    </NewsCardButton>
  );
}

function HeadlineCard({ item, index, onOpen }: { item: NewsItem; index: number; onOpen: (item: NewsItem) => void }) {
  return (
    <NewsCardButton className="headline-card" item={item} onOpen={onOpen}>
      <span className="headline-image" style={newsImageStyle(item, index)} />
      <span className="headline-copy">
        <strong>{item.title}</strong>
        <small>{item.source} · {item.category}</small>
      </span>
      {item.url ? <ExternalLink size={18} aria-hidden="true" /> : null}
    </NewsCardButton>
  );
}

function NewsCardButton({ children, className, item, onOpen, style }: { children: React.ReactNode; className: string; item: NewsItem; onOpen: (item: NewsItem) => void; style?: React.CSSProperties }) {
  return (
    <button className={className} data-news-id={item.id} onClick={() => onOpen(item)} style={style} aria-label={`Nachricht öffnen: ${item.title}`}>
      {children}
    </button>
  );
}

function NewsDetailModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const [insight, setInsight] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    setSaved(localStorage.getItem(savedArticleKey(item.id)) === "1");
    setInsight("");
    setShareMessage("");
  }, [item]);

  async function analyzeWithGemini() {
    setAnalyzing(true);
    const response = await fetch("/api/news/analyze", {
      method: "POST",
      body: JSON.stringify(item),
    });
    const data = (await response.json()) as { insight?: string };
    setInsight(data.insight ?? "");
    setAnalyzing(false);
  }

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    localStorage.setItem(savedArticleKey(item.id), next ? "1" : "0");
  }

  async function shareArticle() {
    const shareUrl = item.url ?? window.location.href;
    if (navigator.share) {
      await navigator.share({ title: item.title, text: item.summary, url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareMessage("Link kopiert.");
    setTimeout(() => setShareMessage(""), 2200);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="news-detail-title">
      <article className="modal-card news-detail-modal">
        <div className="news-detail-image" style={newsImageStyle(item, 0)} />
        <div className="row">
          <span className="tag">{item.category}</span>
          <button className="icon-btn" aria-label="Schließen" onClick={onClose}><X size={18} /></button>
        </div>
        <h2 id="news-detail-title">{item.title}</h2>
        <p>{item.summary}</p>
        <p>{item.relevance}</p>
        <section className="gemini-insight-card">
          <div className="gemini-insight-head">
            <BrainCircuit size={22} />
            <strong>Smart Gemini Insights</strong>
            <span>Gemini</span>
          </div>
          <p className="muted small">Lass Gemini die Nachricht kurz einordnen und konkrete Beobachtungspunkte ableiten.</p>
          {insight ? <pre>{insight}</pre> : null}
          <button className="primary gemini-analyze-button" onClick={analyzeWithGemini} disabled={analyzing}>
            <Sparkles size={18} />
            {analyzing ? "Analysiere..." : "Analyze with Gemini"}
          </button>
        </section>
        <div className="why"><b>Warum relevant:</b> {item.relevance}</div>
        <div className="news-detail-actions">
          <button className={`secondary news-action-button ${saved ? "active" : ""}`} onClick={toggleSaved}>
            <Bookmark size={18} />
            {saved ? "Saved" : "Save Article"}
          </button>
          <button className="secondary news-action-button" onClick={shareArticle}>
            <Share2 size={18} />
            Share Link
          </button>
        </div>
        <div className="news-detail-actions">
          <span className="source">Quelle: {item.source}{shareMessage ? ` · ${shareMessage}` : ""}</span>
          {item.url ? (
            <a className="primary" href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={17} />
              Original öffnen
            </a>
          ) : (
            <span className="muted small">Kein Original-Link gespeichert</span>
          )}
        </div>
      </article>
    </div>
  );
}

function savedArticleKey(id: string) {
  return `dayframe_saved_article_${id}`;
}

function newsImageStyle(item: NewsItem, index: number) {
  const image = categoryImages[item.category] ?? fallbackImages[index % fallbackImages.length];
  return {
    backgroundImage: `linear-gradient(180deg, rgba(5, 11, 21, 0.05), rgba(5, 11, 21, 0.72)), url(${image})`,
  };
}
