import Link from "next/link";

import styles from "./not-found.module.css";
import { ROUTE_PATHS } from "@/utils/routepaths";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>404 Error</p>
        <h1 className={styles.title}>Page not found.</h1>
        <p className={styles.description}>
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={ROUTE_PATHS.HOME}>
            Go Home
          </Link>
          <Link className={styles.secondaryAction} href={ROUTE_PATHS.AUTH_LOGIN}>
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
