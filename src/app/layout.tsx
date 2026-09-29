import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getLang } from "@/lib/i18n-server";
import { LangProvider } from "@/components/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Self-hosted Google fonts (Noto Sans Bengali, Tiro Bangla, Fraunces) — no runtime font requests
const latin = localFont({ src: [{ path: "../fonts/NotoSansBengali-latin-400.woff2", weight: "400" }, { path: "../fonts/NotoSansBengali-latin-600.woff2", weight: "600" }, { path: "../fonts/NotoSansBengali-latin-700.woff2", weight: "700" }], variable: "--font-latin", display: "swap" });
const bengali = localFont({ src: [{ path: "../fonts/NotoSansBengali-bn-400.woff2", weight: "400" }, { path: "../fonts/NotoSansBengali-bn-600.woff2", weight: "600" }, { path: "../fonts/NotoSansBengali-bn-700.woff2", weight: "700" }], variable: "--font-bengali", display: "swap" });
const tiro = localFont({ src: "../fonts/TiroBangla-400.woff2", weight: "400", variable: "--font-tiro", display: "swap" });
const fraunces = localFont({ src: "../fonts/Fraunces-var.woff2", weight: "100 900", variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: "শিক্ষকসেতু — Tuition & Tutor Hiring Marketplace", template: "%s · শিক্ষকসেতু" },
  description: "যাচাইকৃত হোম ও অনলাইন টিউটর — শর্টলিস্ট, ট্রায়াল ক্লাস, ডিজিটাল চুক্তি। Verified home & online tutors with shortlisting, trial classes and digital agreements.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${latin.variable} ${bengali.variable} ${tiro.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <LangProvider lang={lang}>
          <Header />
          <main>{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
