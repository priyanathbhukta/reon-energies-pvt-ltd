import { useState, useEffect, useRef } from 'react'
import { API } from '../../../api'
import {
  Upload, Trash2, Star, FileText, File, CheckCircle,
  AlertCircle, Loader, CloudUpload, X
} from 'lucide-react'

const FILE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
  docx: { icon: File, color: 'text-blue-600', bg: 'bg-blue-50', label: 'DOCX' },
}

export default function TemplateManager() {
  const token = localStorage.getItem('reon_admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }
  const [dragOver, setDragOver] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', file: null })
  const fileRef = useRef(null)

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/api/template/list`, { headers })
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Template fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), 4000)
  }

  const handleFileSelect = (file) => {
    if (!file) return
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      showStatus('error', 'Only PDF and DOCX files are supported.')
      return
    }
    setUploadForm(f => ({
      ...f,
      file,
      name: f.name || file.name.replace(/\.[^.]+$/, ''),
    }))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!uploadForm.file) { showStatus('error', 'Please select a file first.'); return }
    if (!uploadForm.name.trim()) { showStatus('error', 'Template name is required.'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('template', uploadForm.file)
      fd.append('name', uploadForm.name.trim())

      const res = await fetch(`${API}/api/template/upload`, {
        method: 'POST',
        headers, // no Content-Type — let browser set multipart boundary
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      showStatus('success', `"${data.template.name}" uploaded successfully!`)
      setUploadForm({ name: '', file: null })
      fetchTemplates()
    } catch (err) {
      showStatus('error', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      const res = await fetch(`${API}/api/template/${id}/default`, { method: 'PATCH', headers })
      if (!res.ok) throw new Error('Failed to update')
      showStatus('success', 'Default template updated.')
      fetchTemplates()
    } catch (err) {
      showStatus('error', err.message)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return
    try {
      const res = await fetch(`${API}/api/template/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Delete failed')
      showStatus('success', 'Template deleted.')
      fetchTemplates()
    } catch (err) {
      showStatus('error', err.message)
    }
  }

  return (
    <div className="space-y-5">
      {/* Status toast */}
      {status && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${
          status.type === 'success'
            ? 'bg-emerald/10 border-emerald/30'
            : 'bg-red-50 border-red-200'
        }`}>
          {status.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-emerald flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
            {status.message}
          </p>
        </div>
      )}

      {/* Upload Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-emerald/10 rounded-xl flex items-center justify-center">
            <CloudUpload className="w-4 h-4 text-emerald" />
          </div>
          <h3 className="font-display font-bold text-navy">Upload Template</h3>
          <span className="text-xs text-gray-400 ml-1">PDF or DOCX • Max 20 MB</span>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-emerald bg-emerald/5 scale-[1.01]'
              : uploadForm.file
                ? 'border-emerald/50 bg-emerald/5'
                : 'border-gray-200 hover:border-emerald/40 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files[0])}
          />
          {uploadForm.file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-emerald/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald" />
              </div>
              <p className="font-semibold text-navy text-sm">{uploadForm.file.name}</p>
              <p className="text-xs text-gray-400">{(uploadForm.file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadForm(f => ({ ...f, file: null })) }}
                className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-semibold text-navy text-sm">Drop your template here</p>
              <p className="text-xs text-gray-400">or click to browse — PDF, DOCX accepted</p>
            </div>
          )}
        </div>

        {/* Name + Upload button */}
        <div className="mt-4 flex gap-3">
          <input
            value={uploadForm.name}
            onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Template name (e.g. Standard Solar Quote)"
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none text-navy placeholder-gray-400 transition-all"
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadForm.file}
            className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {uploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
          </button>
        </div>

        <div className="mt-3 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-700 font-medium">
            💡 DOCX templates support placeholders like{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{customer_name}}'}</code>{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{system_size}}'}</code>{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{monthly_savings}}'}</code> etc.
          </p>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-navy">Uploaded Templates</h3>
            <p className="text-xs text-gray-400 mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-emerald animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-sm">No templates uploaded yet</p>
            <p className="text-xs mt-1">Upload a DOCX template above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.map(tpl => {
              const fInfo = FILE_ICONS[tpl.file_type] || FILE_ICONS.docx
              const Icon = fInfo.icon
              return (
                <div key={tpl.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors ${tpl.is_default ? 'bg-emerald/5' : ''}`}>
                  <div className={`w-10 h-10 ${fInfo.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${fInfo.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy text-sm truncate">{tpl.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${fInfo.bg} ${fInfo.color}`}>
                        {fInfo.label}
                      </span>
                      {tpl.is_default && (
                        <span className="text-xs bg-emerald/15 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald text-emerald" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tpl.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={tpl.file_path} target="_blank" rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-navy px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      View
                    </a>
                    {!tpl.is_default && (
                      <button onClick={() => handleSetDefault(tpl.id)}
                        className="text-xs text-emerald font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald/10 transition-colors flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" /> Set Default
                      </button>
                    )}
                    <button onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Placeholder list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-display font-bold text-navy mb-3">Available DOCX Placeholders</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            '{{quotation_id}}', '{{date}}', '{{customer_name}}', '{{address}}',
            '{{electricity_provider}}', '{{monthly_bill}}', '{{installation_type}}',
            '{{payment_mode}}', '{{system_size}}', '{{panels}}', '{{area_required}}',
            '{{monthly_generation}}', '{{monthly_savings}}', '{{annual_savings}}',
            '{{total_cost}}', '{{monthly_emi}}', '{{emi_months}}', '{{emi_interest}}',
            '{{total_payable}}',
          ].map(ph => (
            <code key={ph} className="text-xs bg-gray-100 text-navy px-2.5 py-1.5 rounded-lg font-mono truncate block">
              {ph}
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}
