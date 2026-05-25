import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = [
  '.md', '.txt', '.pdf',
  'text/plain', 'text/markdown', 'text/x-markdown', 'application/pdf',
];

export default function NoteUpload({ onUploadComplete }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState([]);
  const inputRef = useRef(null);

  const uploadOne = async (file, index) => {
    const userId = user.id;
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_');
    const storagePath = `${userId}/${ts}_${safeName}`;

    setQueue(p => p.map((item, i) => i === index ? { ...item, status: 'uploading' } : item));

    const { error: uploadErr } = await supabase.storage
      .from('user_notes').upload(storagePath, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw uploadErr;

    const { error: dbErr } = await supabase.from('user_notes').insert({
      user_id: userId,
      file_name: safeName,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
    });
    if (dbErr) {
      await supabase.storage.from('user_notes').remove([storagePath]);
      throw dbErr;
    }

    setQueue(p => p.map((item, i) => i === index ? { ...item, status: 'done' } : item));
  };

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);

    // 校验文件类型
    const invalid = files.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      const typeOk = ALLOWED_TYPES.includes(f.type) || ALLOWED_TYPES.includes(ext);
      return !typeOk;
    });
    if (invalid.length > 0) {
      alert('仅支持 .md / .txt / .pdf 格式的笔记文件！\n不支持的文件：' + invalid.map(f => f.name).join(', '));
      return;
    }

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      alert('以下文件超过 50MB 限制：\n' + oversized.map(f => f.name).join('\n'));
      return;
    }

    const q = files.map(f => ({ name: f.name, size: f.size, status: 'pending' }));
    setQueue(q);
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      try { await uploadOne(files[i], i); }
      catch (err) {
        setQueue(p => p.map((item, idx) =>
          idx === i ? { ...item, status: 'error', errorMsg: err.message } : item));
      }
    }

    setUploading(false);
    if (onUploadComplete) onUploadComplete();
    setTimeout(() => setQueue([]), 5000);
  }, [user, onUploadComplete]);

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="mb-6">
      <div onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-amber-500 bg-amber-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50/50'}`}>
        <input ref={inputRef} type="file" multiple accept=".md,.txt,.pdf"
          onChange={e => { if (e.target.files?.length > 0) { handleFiles(e.target.files); e.target.value = ''; } }}
          className="hidden" />
        <div className="text-4xl mb-3">{dragOver ? '\u{1F4E5}' : '\u{1F4C4}'}</div>
        <p className="text-sm font-medium text-gray-700">
          {dragOver ? '松开导入笔记' : '点击选择笔记文件 或 拖拽到此处'}
        </p>
        <p className="text-xs text-gray-400 mt-1">支持 Markdown (.md)、纯文本 (.txt)、PDF，单文件最大 50MB</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-2">{uploading ? '上传中...' : '上传完毕'}</p>
          {queue.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex-shrink-0">
                {item.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                {item.status === 'uploading' && <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>}
                {item.status === 'done' && <span className="text-green-500 text-lg">{'\u2705'}</span>}
                {item.status === 'error' && <span className="text-red-500 text-lg">{'\u274C'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{item.name}</p>
                {item.status === 'error' && <p className="text-xs text-red-500 truncate">{item.errorMsg}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
