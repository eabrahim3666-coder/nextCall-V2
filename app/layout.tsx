import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Call Chat — Never Miss a Lead",
  description: "AI-powered call & chat receptionist that captures leads 24/7",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}