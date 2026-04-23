import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isOwner } from '@/lib/auth/owner'
import { getDOCostSnapshot } from '@/features/costs/server/do-billing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isOwner(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await getDOCostSnapshot()
  return NextResponse.json({ data })
}
