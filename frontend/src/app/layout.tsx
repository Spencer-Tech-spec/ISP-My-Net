import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatAssistant from "@/components/ChatAssistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "My Net ISP Cloud — Kenyan ISP Management Platform",
  description: "Professional multi-tenant SaaS platform for Kenyan ISPs. Manage subscribers, mobile money payments, MikroTik routers, staff, payroll and billing — all in one place. 3% revenue share pricing.",
  keywords: ["ISP management", "Kenya", "M-Pesa", "mobile money", "MikroTik", "SmartOLT", "subscriber management", "internet service provider"],
  authors: [{ name: "My Net ISP Cloud" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ChatAssistant />
      </body>
    </html>
  );
}
