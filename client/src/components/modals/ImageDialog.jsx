import { useState, useRef } from 'react';
import { uploadImage } from '../../api/upload';

export default function ImageDialog({ onInsert, onClose }) {
  const [tab,      setTab]      = useState('url'); // 'url' | 'upload'
  const [url,      setUrl]      = useState('');
  const [alt,      setAlt]      = useState('');
  const [preview,  setPreview]  = useState('');
  const [uploading,setUploading]= useState(false);
  const [uploadErr,setUploadErr]= useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleUrlInsert = () => {
    if (!url.trim()) return;
    let nextUrl = url.trim();
    if (!/^https?:\/\//i.test(nextUrl)) {
      nextUrl = `https://${nextUrl}`;
    }
    onInsert(nextUrl, alt.trim() || 'image');
    onClose();
  };

  const handleInsert = () => {
    if (tab === 'url') {
      handleUrlInsert();
      return;
    }
    const src = preview;
    if (!src) return;
    onInsert(src, alt);
    onClose();
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    try {
      const uploadedUrl = await uploadImage(file);
      if (!uploadedUrl) throw new Error('Missing upload URL');
      setPreview(uploadedUrl);
      onInsert(uploadedUrl, alt);
      onClose();
    } catch (err) {
      setUploadErr('Upload failed. Check server connection.');
    } finally {
      setUploading(false);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleUpload(file);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const imgSrc = tab === 'url' ? url : preview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-96 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Insert Image</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {['url', 'upload'].map(t => (
            <button type="button" key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-[#2b579a] text-[#2b579a]' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'url' ? 'Image URL' : 'Upload File'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {tab === 'url' ? (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Image URL</label>
              <input
                type="text"
                autoFocus
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleUrlInsert();
                }}
                placeholder="https://example.com/image.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
              />
            </div>
          ) : (
            <div>
              <input type="file" accept="image/*" ref={fileRef} onChange={onFileInputChange} className="hidden" />
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#2b579a] bg-blue-50 text-[#2b579a]' : 'border-gray-300 text-gray-500 hover:border-[#2b579a] hover:text-[#2b579a]'}`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Uploading image…</span>
                  </div>
                ) : (
                  <span className="text-sm">Drop image here or click to browse</span>
                )}
              </div>
              {uploadErr && <p className="text-xs text-red-600 mt-1">{uploadErr}</p>}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Alt text (optional)</label>
            <input value={alt} onChange={e => setAlt(e.target.value)}
              placeholder="Image description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
            />
          </div>

          {imgSrc && (
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <img src={imgSrc} alt={alt} className="w-full max-h-40 object-contain"
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={tab === 'url' ? handleUrlInsert : handleInsert} disabled={!imgSrc}
            className="px-4 py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73] disabled:opacity-50">
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
}
