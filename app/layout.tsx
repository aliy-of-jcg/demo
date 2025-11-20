import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";

// Ensure this layout is always rendered dynamically so it re-reads the latest cookies
export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CosMos AI - Analytics & Tracking",
  description: "CosMos AI for analytics dashboard and tracking management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get locale from cookies or default to English
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  const locale = (localeCookie?.value as 'en' | 'ko') || 'en';
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <LayoutWrapper>{children}</LayoutWrapper>
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
        {/* Tracking script removed - should only run on external landing pages */}
      </body>
    </html>
  );
}
