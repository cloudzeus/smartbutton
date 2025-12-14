import type { Metadata } from "next";
import { Roboto, Roboto_Slab, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-serif",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Smart Button - PBX Dashboard",
  description: "Yearstar P550 Gateway Management Dashboard",
};

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoSlab.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

