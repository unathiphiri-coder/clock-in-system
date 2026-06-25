import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clock-In System | Execo Group',
  description: 'Agent attendance and time tracking system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
