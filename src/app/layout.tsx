import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'DojoGPT',
  description: 'A vulnerability management chatbot for DefectDojo',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-body antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
