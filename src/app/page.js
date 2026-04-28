"use client";

import Link from "next/link";
import { ROUTE_PATHS } from "@/utils/routepaths";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "Smart PDF Ingestion",
    desc: "Upload PDFs and extract structured knowledge using PyMuPDF, pdfplumber, or Unstructured — automatically.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "RAG Query Engine",
    desc: "Ask questions across your documents. Semantic, hybrid, and MMR retrieval with self-reflection and retry loops.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Experiment Analytics",
    desc: "Track every query run. Compare retrieval techniques, view RAGAS scores, and analyse performance over time.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    title: "Multi-Vector Backends",
    desc: "Store embeddings in FAISS, ChromaDB, PGVector, or Pinecone. Switch backends without changing your workflow.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Secure by Default",
    desc: "JWT bearer authentication, project-scoped access control, and per-file metadata isolation on every request.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    title: "Agent Orchestration",
    desc: "Meta-agent supervises sub-agents per vector store. Intelligent query rewriting, complexity scoring, and routing.",
  },
];

const STEPS = [
  { num: "01", label: "Create a project", detail: "Organise your documents into named projects with categories." },
  { num: "02", label: "Upload & process PDFs", detail: "Choose extraction method, splitter, embedding model, and vector store." },
  { num: "03", label: "Query your knowledge", detail: "Ask natural-language questions. Get grounded, validated answers." },
  { num: "04", label: "Analyse & compare", detail: "Review experiment history, RAGAS metrics, and cross-run analytics." },
];

export default function HomePage() {
  return (
    <main className={styles.page}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <span className={styles.navBrand}>
          <span className={styles.navDot} />
          InsightPDF Engine
        </span>
        <div className={styles.navActions}>
          <Link className={styles.navLogin} href={ROUTE_PATHS.AUTH_LOGIN}>Log in</Link>
          <Link className={styles.navSignup} href={ROUTE_PATHS.AUTH_SIGNUP}>Get started</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          RAG · Multi-Agent · Analytics
        </div>

        <h1 className={styles.heroTitle}>
          Turn documents into a<br />
          <span className={styles.heroAccent}>searchable AI workspace</span>
        </h1>

        <p className={styles.heroSub}>
          Upload PDFs, organise projects, run intelligent queries, and track every experiment all from one professional platform.
        </p>

        <div className={styles.heroActions}>
          <Link className={styles.btnPrimary} href={ROUTE_PATHS.AUTH_SIGNUP}>
            Start for free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link className={styles.btnGhost} href={ROUTE_PATHS.AUTH_LOGIN}>
            Sign in to your account
          </Link>
        </div>

        <div className={styles.heroStats}>
          {[
            { val: "4", label: "Vector backends" },
            { val: "3", label: "Extraction methods" },
            { val: "4", label: "Splitting strategies" },
            { val: "∞", label: "Projects & files" },
          ].map((s) => (
            <div key={s.label} className={styles.heroStat}>
              <span className={styles.heroStatVal}>{s.val}</span>
              <span className={styles.heroStatLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Capabilities</p>
          <h2 className={styles.sectionTitle}>Everything you need for document intelligence</h2>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Workflow</p>
          <h2 className={styles.sectionTitle}>From upload to insight in four steps</h2>
        </div>
        <div className={styles.stepsRow}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.stepCard}>
              <span className={styles.stepNum}>{s.num}</span>
              <h3 className={styles.stepLabel}>{s.label}</h3>
              <p className={styles.stepDetail}>{s.detail}</p>
              {i < STEPS.length - 1 && <span className={styles.stepArrow}>→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to query your documents?</h2>
        <p className={styles.ctaSub}>Create an account and process your first PDF in minutes.</p>
        <div className={styles.ctaActions}>
          <Link className={styles.btnPrimary} href={ROUTE_PATHS.AUTH_SIGNUP}>Create free account</Link>
          <Link className={styles.btnOutline} href={ROUTE_PATHS.AUTH_LOGIN}>Sign in</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          <span className={styles.navDot} />
          InsightPDF Engine
        </span>
        <span className={styles.footerNote}>Professional RAG &amp; Analytics Platform</span>
      </footer>

    </main>
  );
}
