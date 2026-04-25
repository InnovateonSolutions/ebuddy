'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, FolderUp, Loader2, UploadCloud } from 'lucide-react'

type CampaignSummary = {
  id: string
  name: string
  updatedAt: Date | string
}

type VaultFileInput = HTMLInputElement & {
  webkitdirectory: boolean
  directory: boolean
}

type ImportNote = {
  relativePath: string
  content: string
}

export function CampaignVaultUploader({ initialCampaigns }: { initialCampaigns: CampaignSummary[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [campaignName, setCampaignName] = useState(initialCampaigns[0]?.name ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  function chooseFolder() {
    const input = inputRef.current as VaultFileInput | null
    if (!input) return
    input.webkitdirectory = true
    input.directory = true
    input.click()
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setStatus(null)

    setIsImporting(true)
    try {
      const notes = await readMarkdownFiles(files)
      const inferredName = campaignName.trim() || inferCampaignName(files)
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inferredName, notes }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error ?? 'No se pudo importar el vault')

      setCampaigns((current) => [result.data.campaign, ...current])
      setCampaignName(result.data.campaign.name)
      setStatus(`${result.data.importedNotes} notas importadas`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el vault')
    } finally {
      setIsImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <div className="dashboard-panel divide-y divide-slate-100">
        <div className="px-5 py-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Vault de Obsidian</h2>

          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de campaña</span>
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Ravenloft"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />

            <button
              type="button"
              onClick={chooseFolder}
              disabled={isImporting}
              className="w-full min-h-32 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-3 px-4 py-6 text-center disabled:opacity-60"
            >
              {isImporting ? (
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              ) : (
                <FolderUp size={28} className="text-slate-600" />
              )}
              <span className="text-sm font-semibold text-slate-800">
                {isImporting ? 'Importando notas' : 'Seleccionar carpeta del vault'}
              </span>
            </button>
          </div>
        </div>

        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Campaña activa: {campaigns[0]?.name ?? 'ninguna'}</p>
          {status && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              {status}
            </span>
          )}
          {error && <span className="text-xs font-medium text-red-600">{error}</span>}
        </div>
      </div>

      <div className="dashboard-panel divide-y divide-slate-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campañas</h2>
          <UploadCloud size={16} className="text-slate-400" />
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No hay campañas importadas.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="px-5 py-3">
                <p className="text-sm font-medium text-slate-800">{campaign.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actualizada {formatDate(campaign.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function readMarkdownFiles(files: FileList): Promise<ImportNote[]> {
  const selected = Array.from(files).filter((file) => getRelativePath(file).toLowerCase().endsWith('.md'))
  if (selected.length === 0) throw new Error('La carpeta no contiene notas Markdown')

  return Promise.all(selected.map(async (file) => ({
    relativePath: getRelativePath(file),
    content: await file.text(),
  })))
}

function inferCampaignName(files: FileList): string {
  const firstPath = getRelativePath(files[0])
  const firstPart = firstPath.split('/')[0]
  return firstPart && firstPart !== firstPath ? firstPart : 'Campaña DnD'
}

function getRelativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
