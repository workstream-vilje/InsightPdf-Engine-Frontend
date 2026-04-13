import localFont from "next/font/local";
import { JetBrains_Mono, Manrope } from "next/font/google";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

const urbanistSans = localFont({
  src: "../assets/fonts/Urbanist-VariableFont_wght.ttf",
  variable: "--font-urbanist",
  weight: "100 900",
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata = {
  title: "Vilje RAG Canvas",
  description: "Advanced RAG Experimentation and Deployment Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${urbanistSans.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
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
