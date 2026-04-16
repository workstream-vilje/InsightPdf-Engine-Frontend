import Link from "next/link";

import styles from "./page.module.css";
import { ROUTE_PATHS } from "@/utils/routepaths";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>InsightPDF Engine</p>
        <h1 className={styles.title}>Turn documents into a searchable AI workspace.</h1>
        <p className={styles.description}>
          Upload PDFs, organize projects, and query your knowledge base from one place.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={ROUTE_PATHS.AUTH_LOGIN}>
            Login
          </Link>
          <Link className={styles.secondaryAction} href={ROUTE_PATHS.AUTH_SIGNUP}>
            Sign Up
          </Link>
        </div>
      </section>
    </main>
  );
}
