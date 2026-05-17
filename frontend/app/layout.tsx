import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import CartSidebar from '@/components/shop/CartSidebar';
import PushInit from '@/components/PushInit';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZestStar — Fresh Groceries in 30 Minutes',
  description:
    'Order fresh vegetables, fruits, dry fruits & spices online. Delivered to your door in 30 minutes. Serving Panvel, Navi Mumbai & surrounding areas.',
  keywords: 'grocery delivery, fresh vegetables, fruits, dry fruits, Panvel, Navi Mumbai, 30 minute delivery',
  openGraph: {
    title: 'ZestStar — Fresh Groceries in 30 Minutes',
    description: 'Order fresh groceries online. Delivered in 30 mins.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream">
        {children}
        <CartSidebar />
        <PushInit />
      </body>
    </html>
  );
}
