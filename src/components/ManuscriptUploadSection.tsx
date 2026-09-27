import React, { useState, useRef } from 'react';
import { EngineeringDiscipline, Manuscript } from '../types';
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle, FileUp, X, RefreshCw } from 'lucide-react';

interface ManuscriptUploadSectionProps {
  onUploadSuccess?: (newManuscript: Manuscript) => void;
  userRole?: 'admin';
}

export const ManuscriptUploadSection: React.FC<ManuscriptUploadSectionProps> = ({
  onUploadSuccess,
  userRole = 'admin',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<EngineeringDiscipline>('Electrical');
  const [uploadRawText, setUploadRawText] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideAuthors, setOverrideAuthors] = useState('');
  const [overrideAbstract, setOverrideAbstract] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedManuscript, setUploadedManuscript] = useState<Manuscript | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setErrorMsg('');
    setSuccessMsg('');
    setUploadedManuscript(null);

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
      setErrorMsg('Please select a valid PDF document (.pdf) or text manuscript (.txt).');
      return;
    }

    setSelectedFile(file);

    // Read text snippet from file if plain text or read base64 for PDF
    const reader = new FileReader();
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setUploadRawText(text || '');
        setFileBase64(null);
      };
      reader.readAsText(file);
    } else {
      // PDF file read as data URL
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFileBase64(result);
        setUploadRawText(`Uploaded academic manuscript PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB).\nIndexed for R.A.I.J.I.N. RAG analysis.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setSuccessMsg('');
    setErrorMsg('');
    setUploadedManuscript(null);

    const fileName = selectedFile ? selectedFile.name : 'uploaded_research_manuscript.pdf';

    try {
      const res = await fetch('/api/manuscripts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileContentBase64: fileBase64,
          category,
          rawText: uploadRawText,
          overrideTitle,
          overrideAuthors,
          overrideAbstract,
        }),
      });

      const data = await res.json();

      if (res.ok && data.manuscript) {
        setSuccessMsg(data.message || 'Manuscript successfully uploaded and indexed into R.A.I.J.I.N. literature database!');
        setUploadedManuscript(data.manuscript);
        setSelectedFile(null);
        setFileBase64(null);
        setUploadRawText('');
        setOverrideTitle('');
        setOverrideAuthors('');
        setOverrideAbstract('');

        if (onUploadSuccess) {
          onUploadSuccess(data.manuscript);
        }
      } else {
        setErrorMsg(data.error || 'Failed to upload manuscript.');
      }
    } catch (err) {
      setErrorMsg('Network error occurred while uploading manuscript to kiosk server.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase italic block mb-1">
          {userRole === 'admin' ? 'FACULTY MANUSCRIPT INDEXING' : 'STUDENT RESEARCH SUBMISSION'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic flex items-center gap-2">
          <Upload className="w-6 h-6 text-indigo-400" /> Upload & Index PDF Research Manuscript
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Uploaded PDF research documents will be processed by server-side Gemini AI to automatically extract titles, authors, engineering domain, and RAG search vectors.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>

          {uploadedManuscript && (
            <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
              <div className="text-slate-200">
                <span className="text-emerald-300 font-extrabold uppercase">Indexed Title:</span> {uploadedManuscript.title}
              </div>
              {onUploadSuccess && (
                <button
                  type="button"
                  onClick={() => onUploadSuccess(uploadedManuscript)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  View Manuscript Now →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* DRAG & DROP ZONE WITH REAL FILE INPUT */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
              : selectedFile
              ? 'border-emerald-500/60 bg-emerald-950/20'
              : 'border-slate-700 hover:border-indigo-500/50 bg-slate-950/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-2">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <FileUp className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-white uppercase italic">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for upload
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setUploadRawText('');
                }}
                className="mt-2 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto"
              >
                <X className="w-3.5 h-3.5" /> Remove selected file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-slate-100">
                  Click to select or Drag & Drop PDF Research Manuscript
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF (.pdf) or Plain Text (.txt) formats up to 20MB</p>
              </div>
              <span className="inline-block px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                Browse Files
              </span>
            </div>
          )}
        </div>

        {/* Engineering Discipline Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Engineering Discipline Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EngineeringDiscipline)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="Electrical">Electrical Engineering</option>
            <option value="Electromechanical">Electromechanical Systems</option>
            <option value="Mechanical">Mechanical Engineering</option>
            <option value="Electronics Communications">Electronics & Communications</option>
          </select>
        </div>

        {/* Text Snippet for AI Parsing */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Manuscript Text / Abstract Content (Auto-Filled from File)
          </label>
          <textarea
            rows={3}
            value={uploadRawText}
            onChange={(e) => setUploadRawText(e.target.value)}
            placeholder="File content text snippet or abstract for Gemini AI extraction..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Optional Metadata Overrides */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Optional Manual Metadata Overrides
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Override Title</label>
              <input
                type="text"
                value={overrideTitle}
                onChange={(e) => setOverrideTitle(e.target.value)}
                placeholder="Leave blank to let Gemini auto-detect"
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Override Authors</label>
              <input
                type="text"
                value={overrideAuthors}
                onChange={(e) => setOverrideAuthors(e.target.value)}
                placeholder="Comma separated (e.g. Dr. Vance, Engr. Smith)"
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Override Abstract</label>
            <textarea
              rows={2}
              value={overrideAbstract}
              onChange={(e) => setOverrideAbstract(e.target.value)}
              placeholder="Leave blank to let Gemini extract summary from paper..."
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Extracting Metadata & Indexing via Gemini AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Upload & Index Manuscript Now</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
};
