import { Libre_Baskerville, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

const heading = Libre_Baskerville({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '700'],
});

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
});

export const metadata = {
  title: 'FaceTimeOS — Spatial Collaboration',
  description: 'Embed code editors, whiteboards, and notes directly inside your video call. Zero servers. Peer-to-peer.',
  keywords: 'webrtc, collaboration, video call, spatial, code editor, whiteboard, peer-to-peer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors duration-300" style={{ fontFamily: 'var(--font-body)' }}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
