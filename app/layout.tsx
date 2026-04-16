import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import VisitCounter from '@/components/visit-counter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ebuddy — Tu asistente de gestión personal',
  description: 'Captura, organiza y ejecuta tus tareas de trabajo y vida personal con IA.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <VisitCounter />
      </body>
    </html>
  )
}
