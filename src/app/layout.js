import localFont from "next/font/local";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

const urbanist = localFont({
  src: "../assets/fonts/Urbanist-VariableFont_wght.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: "Vilje RAG Canvas",
  description: "Advanced RAG Experimentation and Deployment Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body style={{ margin: 0, padding: 0 }}>
        <NextTopLoader
          color="rgb(var(--primary))"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px rgb(var(--primary)),0 0 5px rgb(var(--primary))"
        />
        {children}
      </body>
    </html>
  );
}
