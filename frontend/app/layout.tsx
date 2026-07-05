import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Chatbot",
  description: "Chatbot with langgraph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
