'use client'

import { useRef, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronDown, ChevronRight, FileText, Search, X,
  Tag, Upload, Loader2, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── types ───────────────────────────────────────────────────

type Note = {
  title: string
  relativePath: string
  folder: string
  content: string
  tags: string[]
}

type CampaignSummary = {
  id: string
  name: string
  updatedAt: string
}

type Props = {
  notes: Note[]
  campaignName: string | null
  campaigns: CampaignSummary[]
}

type FolderTree = Record<string, Note[]>
type ImportNote = { relativePath: string; content: string }
type VaultFileInput = HTMLInputElement & { webkitdirectory: boolean; directory: boolean }

// ─── main component ───────────────────────────────────────────

export function VaultViewer({ notes, campaignName, campaigns: initialCampaigns }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(notes[0]?.relativePath ?? null)
  const [query, setQuery] = useState('')
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(notes.map((n) => n.folder || '(raíz)'))
  )
  const [showImport, setShowImport] = useState(notes.length === 0)

  // import state
  const inputRef = useRef<HTMLInputElement>(null)
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [campaignName2, setCampaignName2] = useState(campaignName ?? initialCampaigns[0]?.name ?? '')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

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

  function chooseFolder() {
    const input = inputRef.current as VaultFileInput | null
    if (!input) return
    input.webkitdirectory = true
    input.directory = true
    input.click()
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImportError(null)
    setImportStatus(null)
    setIsImporting(true)
    try {
      const mdFiles = Array.from(files).filter((f) => getRelativePath(f).toLowerCase().endsWith('.md'))
      if (mdFiles.length === 0) throw new Error('La carpeta no contiene notas Markdown')
      const importNotes: ImportNote[] = await Promise.all(
        mdFiles.map(async (f) => ({ relativePath: getRelativePath(f), content: await f.text() }))
      )
      const name = campaignName2.trim() || inferName(files)
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, notes: importNotes }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error ?? 'No se pudo importar el vault')
      setCampaigns((c) => [result.data.campaign, ...c])
      setCampaignName2(result.data.campaign.name)
      setImportStatus(`${result.data.importedNotes} notas importadas — recarga para verlas`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setIsImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  // ─── layout ──────────────────────────────────────────────

  return (
    // -mx-4 cancela el px-4 del layout; -mt-5 cancela el py-5 del main
    // para que el viewer llegue de borde a borde sin scroll extra
    <div className="-mx-4 sm:-mx-4 -mt-5 sm:-mt-6 flex flex-col"
         style={{ height: 'calc(100dvh - 64px)' }}>

      {/* ── top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <span className="text-sm font-semibold text-slate-700 truncate">
          {campaignName ?? 'Campañas DnD'}
        </span>
        {notes.length > 0 && (
          <span className="text-xs text-slate-400">{notes.length} notas</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowImport((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              showImport
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Upload size={13} />
            {showImport ? 'Cerrar import' : 'Importar vault'}
          </button>
        </div>
      </div>

      {/* ── import panel (colapsable) ── */}
      {showImport && (
        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-4">
          <div className="max-w-lg flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <input
                value={campaignName2}
                onChange={(e) => setCampaignName2(e.target.value)}
                placeholder="Nombre de campaña"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button
                onClick={chooseFolder}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-60 transition-colors"
              >
                {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Seleccionar carpeta
              </button>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {importStatus && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 size={13} /> {importStatus}
              </p>
            )}
            {importError && <p className="text-xs text-red-600">{importError}</p>}
            {campaigns.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {campaigns.map((c) => (
                  <span key={c.id} className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── main area ── */}
      {notes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Importa tu vault de Obsidian para empezar
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">

          {/* sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="px-3 py-2 border-b border-slate-200">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full text-xs pl-6 pr-6 py-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X size={11} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-1 text-[13px]">
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
                      className="w-full flex items-center gap-1 px-2 py-1 hover:bg-slate-100 text-left"
                    >
                      {isOpen
                        ? <ChevronDown size={11} className="text-slate-400 flex-shrink-0" />
                        : <ChevronRight size={11} className="text-slate-400 flex-shrink-0" />
                      }
                      <span className="text-slate-500 truncate font-medium">{folder}</span>
                      <span className="ml-auto text-[10px] text-slate-300 pr-1">{folderNotes.length}</span>
                    </button>
                    {isOpen && folderNotes.map((note) => (
                      <button
                        key={note.relativePath}
                        onClick={() => setSelectedPath(note.relativePath)}
                        className={cn(
                          'w-full flex items-center gap-1.5 pl-6 pr-2 py-1 text-left hover:bg-slate-100 transition-colors',
                          selectedPath === note.relativePath && 'bg-slate-200'
                        )}
                      >
                        <FileText size={11} className="text-slate-400 flex-shrink-0" />
                        <span className={cn(
                          'truncate',
                          selectedPath === note.relativePath ? 'text-slate-900 font-semibold' : 'text-slate-600'
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

          {/* content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedNote ? (
              <div className="px-8 py-6 max-w-3xl">
                <div className="mb-5 pb-4 border-b border-slate-100">
                  <h1 className="text-xl font-bold text-slate-900">{selectedNote.title}</h1>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-mono">{selectedNote.relativePath}</span>
                    {selectedNote.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setQuery(tag)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] text-slate-500 transition-colors"
                      >
                        <Tag size={9} />{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prose prose-sm prose-slate max-w-none
                  prose-headings:font-semibold prose-headings:text-slate-800
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
                  prose-p:text-slate-700 prose-p:leading-relaxed
                  prose-strong:text-slate-900
                  prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:my-0.5
                  prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-500
                  prose-code:text-slate-700 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-xs
                  prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-lg
                  prose-table:text-sm prose-th:text-slate-700 prose-td:text-slate-600
                  prose-hr:border-slate-200 prose-a:text-blue-600">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedNote.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Selecciona una nota
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────

function getRelativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

function inferName(files: FileList): string {
  const first = getRelativePath(files[0]).split('/')[0]
  return first && first !== getRelativePath(files[0]) ? first : 'Campaña DnD'
}
