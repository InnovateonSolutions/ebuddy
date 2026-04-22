import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  features?: string[]
}

export function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="dashboard-hero max-w-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
          <Construction size={28} className="text-amber-400" />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
          Proximamente
        </p>

        <h1 className="mb-3 text-2xl font-bold text-slate-900">{title}</h1>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">{description}</p>

        {features && features.length > 0 && (
          <ul className="mx-auto mt-6 w-full max-w-sm space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-500">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-300" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
