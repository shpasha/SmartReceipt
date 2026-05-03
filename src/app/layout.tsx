import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";
import { I18nProvider } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: dict[locale].meta.title,
    description: dict[locale].meta.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <LanguageSwitcher />
        </I18nProvider>
      </body>
    </html>
  );
}
