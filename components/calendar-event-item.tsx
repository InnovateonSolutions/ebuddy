import { Clock, MapPin } from 'lucide-react'
import type { CalendarEvent } from '@/types/api'

interface CalendarEventItemProps {
  event: CalendarEvent
}

export default function CalendarEventItem({ event }: CalendarEventItemProps) {
  const start = new Date(event.start)
  const end = new Date(event.end)

  const timeLabel = event.all_day
    ? 'Todo el día'
    : `${formatTime(start)} – ${formatTime(end)}`

  return (
    <div className="flex gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      {/* Línea de color por proveedor */}
      <div
        className={`w-0.5 rounded-full flex-shrink-0 self-stretch ${
          event.provider === 'GOOGLE' ? 'bg-blue-400' : 'bg-indigo-400'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            {timeLabel}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[200px]">
              <MapPin size={11} />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
