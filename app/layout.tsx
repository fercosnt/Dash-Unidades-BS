import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beauty Smile Partners Dashboard",
  description: "Dashboard multi-tenant para gestão financeira das clínicas parceiras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
