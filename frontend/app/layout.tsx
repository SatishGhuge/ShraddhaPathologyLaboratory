import './globals.css';
import { LayoutWrapper } from './layout-wrapper';

export const metadata = {
  title: 'Shraddha Pathology Laboratory',
  description: 'Laboratory Management System',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
