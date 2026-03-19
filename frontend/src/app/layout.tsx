import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Frammer Analytics | AI-Powered Media Insights',
  description: 'Real-time analytics dashboard for Frammer AI media publishing platform with AI-powered insights and data analysis.',
  keywords: ['analytics', 'dashboard', 'AI', 'media', 'publishing', 'data analysis'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-gray-950 text-white`}>
        {children}
      </body>
    </html>
  );
}
