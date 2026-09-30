import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SmoothScrolling from "@/components/SmoothScrolling";

export const metadata: Metadata = {
  title: "Freight.AI | Maritime Freight Intelligence",
  description: "Freight Decisions, Engineered.",
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: "Freight.AI",
    description: "Maritime Freight Intelligence and Decision Engine",
    images: [{
      url: '/logo.jpg',
      width: 1200,
      height: 1200,
      alt: 'Freight.AI Logo'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Freight.AI",
    description: "Maritime Freight Intelligence and Decision Engine",
    images: ['/logo.jpg'],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Newsreader:opsz,wght@6..72,300..600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-frost text-ink m-0 overflow-x-hidden">
        <SmoothScrolling>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen w-full">
              {children}
            </main>
          </div>
        </SmoothScrolling>
      </body>
    </html>
  );
}
