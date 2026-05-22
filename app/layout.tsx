import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Gate — Qualify inbound leads before outbound",
  description:
    "Filter incomplete and disposable contacts before they enter your outbound pipeline. Tenant-isolated, auditable, real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
