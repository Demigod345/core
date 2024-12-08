//@ts-nocheck

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { headers } from "next/headers"; // added
import ContextProvider from "@/context";
import { Toaster } from "react-hot-toast";
import { Analytics } from '@vercel/analytics/react';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Mumei",
  description: "Hi there",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
      <Toaster position="top-center" />
      <ContextProvider cookies={cookies}>{children}</ContextProvider>
      <Analytics />
      </body>
    </html>
  );
}
