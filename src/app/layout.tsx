import type { Metadata } from "next";
import "./globals.css";
import SimpleNavbar from "@/components/SimpleNavbar";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Hanumanth Chits - Management Book",
  description: "Simple Chit Business Management Book",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-amber-200">
        <AuthProvider>
          <SimpleNavbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
