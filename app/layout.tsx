import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "./design.css";

export const metadata: Metadata = {
  title: "Next Call Chat — Never Miss a Lead",
  description: "AI-powered call & chat receptionist that captures leads 24/7",
  verification: {
    google: "yvH-G_P7BPlNq8U570Cq1xJq40tL2mXGf-73G9b_cVE",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPubKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "pk_test_Y2xhc3NpYy1jYW1lbC03Ny5jbGVyay5hY2NvdW50cy5kZXYk";

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}