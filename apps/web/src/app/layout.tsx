import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Evol People",
  description: "Plataforma de desenvolvimento de liderança e performance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={cn("font-mono", jetbrainsMono.variable)}
    >
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
