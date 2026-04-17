import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  features?: string[]
}

export function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
        <Construction size={28} className="text-amber-400" />
      </div>

      <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-2">
        Próximamente
      </p>

      <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>

      <p className="text-slate-500 text-sm max-w-sm leading-relaxed">{description}</p>

      {features && features.length > 0 && (
        <ul className="mt-6 space-y-2 text-left max-w-xs w-full">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-500">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
