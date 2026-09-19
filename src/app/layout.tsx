import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ADB Command Center • Android Device Studio',
  description: 'Futuristic real-time ADB management studio and operational hardware remote for Android devices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
