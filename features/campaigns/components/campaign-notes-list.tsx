'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type Note = {
  title: string
  relativePath: string
  folder: string
  content: string
  tags: string[]
}

type Props = {
  campaignName: string
  notes: Note[]
}

export function CampaignNotesList({ campaignName, notes }: Props) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['']))
  const [openNote, setOpenNote] = useState<string | null>(null)

  const byFolder = notes.reduce<Record<string, Note[]>>((acc, note) => {
    const key = note.folder || '(raíz)'
    ;(acc[key] ??= []).push(note)
    return acc
  }, {})

  const folders = Object.keys(byFolder).sort()

  function toggleFolder(folder: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      next.has(folder) ? next.delete(folder) : next.add(folder)
      return next
    })
  }

  function toggleNote(path: string) {
    setOpenNote((prev) => (prev === path ? null : path))
  }

  if (notes.length === 0) {
    return (
      <div className="dashboard-panel px-5 py-6">
        <p className="text-sm text-slate-500">No hay notas en esta campaña. Importa tu vault primero.</p>
      </div>
    )
  }

  return (
    <div className="dashboard-panel divide-y divide-slate-100">
      <div className="px-5 py-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Notas — {campaignName}
        </h2>
        <span className="text-xs text-slate-400">{notes.length} notas</span>
      </div>

      {folders.map((folder) => {
        const folderNotes = byFolder[folder]
        const isOpen = openFolders.has(folder)

        return (
          <div key={folder}>
            <button
              onClick={() => toggleFolder(folder)}
              className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              {isOpen ? (
                <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
              )}
              <span className="text-xs font-medium text-slate-600 truncate">{folder}</span>
              <span className="ml-auto text-xs text-slate-400">{folderNotes.length}</span>
            </button>

            {isOpen && (
              <div className="pl-9 border-t border-slate-50">
                {folderNotes.map((note) => {
                  const isNoteOpen = openNote === note.relativePath
                  return (
                    <div key={note.relativePath} className="border-b border-slate-50 last:border-0">
                      <button
                        onClick={() => toggleNote(note.relativePath)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                      >
                        <FileText size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{note.title}</span>
                        {note.tags.length > 0 && (
                          <span className="ml-auto text-xs text-slate-400 truncate max-w-[120px]">
                            {note.tags.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </button>
                      {isNoteOpen && (
                        <div className="px-3 pb-3">
                          <pre
                            className={cn(
                              'text-xs text-slate-600 whitespace-pre-wrap font-mono',
                              'bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto'
                            )}
                          >
                            {note.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
