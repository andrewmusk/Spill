import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Nav } from './components/Nav';

export const metadata = {
  title: 'Spill Admin',
  description: 'Admin dashboard for Spill',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <Nav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
