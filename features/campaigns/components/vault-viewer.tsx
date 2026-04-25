'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, FileText, Search, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type Note = {
  title: string
  relativePath: string
  folder: string
  content: string
  tags: string[]
}

type Props = {
  notes: Note[]
  campaignName: string
}

type FolderTree = Record<string, Note[]>

export function VaultViewer({ notes, campaignName }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(notes[0]?.relativePath ?? null)
  const [query, setQuery] = useState('')
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => {
    const all = new Set(notes.map((n) => n.folder || '(raíz)'))
    return all
  })

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes
    const q = query.toLowerCase()
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [notes, query])

  const byFolder: FolderTree = useMemo(() => {
    return filteredNotes.reduce<FolderTree>((acc, note) => {
      const key = note.folder || '(raíz)'
      ;(acc[key] ??= []).push(note)
      return acc
    }, {})
  }, [filteredNotes])

  const folders = Object.keys(byFolder).sort()
  const selectedNote = notes.find((n) => n.relativePath === selectedPath) ?? null

  function toggleFolder(folder: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      next.has(folder) ? next.delete(folder) : next.add(folder)
      return next
    })
  }

  return (
    <div className="dashboard-panel overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {campaignName} — {notes.length} notas
        </span>
      </div>

      <div className="flex h-[calc(100vh-280px)] min-h-[400px]">
        {/* sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-slate-100 flex flex-col">
          {/* search */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar notas…"
                className="w-full text-xs pl-6 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={12} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* folder tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {folders.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400">Sin resultados</p>
            )}
            {folders.map((folder) => {
              const folderNotes = byFolder[folder]
              const isOpen = openFolders.has(folder)

              return (
                <div key={folder}>
                  <button
                    onClick={() => toggleFolder(folder)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 text-left group"
                  >
                    {isOpen ? (
                      <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-500 truncate">{folder}</span>
                    <span className="ml-auto text-[10px] text-slate-300">{folderNotes.length}</span>
                  </button>

                  {isOpen && folderNotes.map((note) => (
                    <button
                      key={note.relativePath}
                      onClick={() => setSelectedPath(note.relativePath)}
                      className={cn(
                        'w-full flex items-center gap-1.5 pl-7 pr-3 py-1 text-left hover:bg-slate-50 transition-colors',
                        selectedPath === note.relativePath && 'bg-slate-100'
                      )}
                    >
                      <FileText size={11} className="text-slate-400 flex-shrink-0" />
                      <span className={cn(
                        'text-xs truncate',
                        selectedPath === note.relativePath ? 'text-slate-900 font-medium' : 'text-slate-600'
                      )}>
                        {note.title}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* content pane */}
        <div className="flex-1 overflow-y-auto">
          {selectedNote ? (
            <div className="px-6 py-5">
              {/* note header */}
              <div className="mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">{selectedNote.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-400">{selectedNote.relativePath}</span>
                  {selectedNote.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedNote.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setQuery(tag)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-500 transition-colors"
                        >
                          <Tag size={9} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* rendered markdown */}
              <div className="prose prose-sm prose-slate max-w-none
                prose-headings:font-semibold prose-headings:text-slate-800
                prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                prose-p:text-slate-700 prose-p:leading-relaxed
                prose-strong:text-slate-800
                prose-ul:text-slate-700 prose-ol:text-slate-700
                prose-li:my-0.5
                prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-500
                prose-code:text-slate-700 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded
                prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200
                prose-table:text-sm prose-th:text-slate-700 prose-td:text-slate-600
                prose-hr:border-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedNote.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              Selecciona una nota para leerla
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
