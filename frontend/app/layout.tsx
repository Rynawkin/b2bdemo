import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthInitializer } from '@/components/AuthInitializer';
import { TenantProvider } from '@/components/TenantProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OtoOlgun B2B - Sipariş Sistemi',
  description: 'OtoOlgun B2B Sipariş Yönetim Platformu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <TenantProvider>
          <AuthInitializer />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#363636',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </TenantProvider>
      </body>
    </html>
  );
}
