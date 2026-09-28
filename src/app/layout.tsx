import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Self-hosted (same fonts as Google Fonts: Noto Sans Bengali, Tiro Bangla, Fraunces)
const latin = localFont({
  src: [
    { path: "../fonts/NotoSansBengali-latin-400.woff2", weight: "400" },
    { path: "../fonts/NotoSansBengali-latin-600.woff2", weight: "600" },
    { path: "../fonts/NotoSansBengali-latin-700.woff2", weight: "700" },
  ],
  variable: "--font-latin",
  display: "swap",
});
const bengali = localFont({
  src: [
    { path: "../fonts/NotoSansBengali-bn-400.woff2", weight: "400" },
    { path: "../fonts/NotoSansBengali-bn-600.woff2", weight: "600" },
    { path: "../fonts/NotoSansBengali-bn-700.woff2", weight: "700" },
  ],
  variable: "--font-bengali",
  display: "swap",
});
const tiro = localFont({ src: "../fonts/TiroBangla-400.woff2", weight: "400", variable: "--font-tiro", display: "swap" });
const fraunces = localFont({ src: "../fonts/Fraunces-var.woff2", weight: "100 900", variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: "শিক্ষকসেতু — হোম টিউশন প্ল্যাটফর্ম",
  description: "অভিভাবক ও হোম টিউটরদের সংযোগের প্ল্যাটফর্ম — টিউশন পোস্ট করুন, শিক্ষক খুঁজুন।",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${latin.variable} ${bengali.variable} ${tiro.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
