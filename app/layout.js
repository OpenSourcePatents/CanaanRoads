import './globals.css'
import { AuthProvider } from './components/AuthProvider'

export const metadata = {
  title: 'Canaan Road Watch — Citizen Road Accountability',
  description: 'Community reporting and accountability platform for road conditions in Canaan, NH.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
