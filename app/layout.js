import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// resolveProductQuery (AI product finder) runs several searches/scrapes in
// parallel and needs more than the default serverless timeout.
export const maxDuration = 60;

export const metadata = {
  title: "PriceRadar - Never Miss a Price Drop",
  description:
    "Track product prices across e-commerce sites and get AI-powered alerts on price drops",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}