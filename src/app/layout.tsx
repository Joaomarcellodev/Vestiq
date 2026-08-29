import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/organisms/toast/toast-provider";
import { THEME_COOKIE, THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const jakarta = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/PlusJakartaSans-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/PlusJakartaSans-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Vestiq", template: "%s · Vestiq" },
  description: "A plataforma que conecta marcas e revendedoras de moda.",
  applicationName: "Vestiq",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7027b8" },
    { media: "(prefers-color-scheme: dark)", color: "#14121a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const themeClass = cookieTheme === "dark" ? "dark" : cookieTheme === "light" ? "light" : "";

  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${themeClass}`.trim()}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
