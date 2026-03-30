import { redirect } from 'next/navigation'

// La raíz redirige al dashboard. El middleware maneja auth.
export default function RootPage() {
  redirect('/today')
}
