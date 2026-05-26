import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatFileSize, formatDate, isEditable, isPdf, getTypeLabel } from '../utils/formatUtils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NoteView() {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state?.file;

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('view');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [signedUrl, setSignedUrl] = useState(null);
  const fetchedRef = useRef(false);

  const editable = isEditable(file);
  const pdf = isPdf(file);

  useEffect(() => {
    if (!file || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from('user_notes').createSignedUrl(file.storage_path, 300);
        if (urlErr) throw urlErr;
        setSignedUrl(urlData.signedUrl);

        if (editable) {
          const resp = await fetch(urlData.signedUrl);
          const text = await resp.text();
          setContent(text);
          setOriginalContent(text);
        }

        const now = new Date().toISOString();
        await supabase.from('user_notes').update({ last_opened_at: now }).eq('id', file.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [file, editable]);

  const handleSave = async () => {
    if (content === originalContent) { setSaveMsg('未更改'); setTimeout(() => setSaveMsg(''), 1500); return; }
    setSaving(true); setSaveMsg('');
    try {
      const blob = new Blob([content], { type: file.file_type || 'text/plain' });
      const { error: e } = await supabase.storage.from('user_notes')
        .upload(file.storage_path, blob, { upsert: true });
      if (e) throw e;
      setOriginalContent(content); setSaveMsg('已保存'); setMode('view');
      setTimeout(() => setSaveMsg(''), 1500);
    } catch (err) { setSaveMsg('失败: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDownload = async () => {
    const { data } = await supabase.storage.from('user_notes').createSignedUrl(file.storage_path, 60);
    const a = document.createElement('a'); a.href = data.signedUrl; a.download = file.file_name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (!file) return <div className="text-center py-20 text-gray-500">笔记数据丢失，<button onClick={() => navigate('/dashboard')} className="text-amber-600">返回列表</button></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-gray-500 hover:text-amber-600 transition text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-xl">{'\u{1F4DD}'}</span>
          <h1 className="text-sm font-medium text-gray-700 truncate">{file.file_name}</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${editable ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {getTypeLabel(file)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {editable && mode === 'view' && (
              <button onClick={() => setMode('edit')} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-medium">编辑</button>
            )}
            {editable && mode === 'edit' && (
              <button onClick={() => setMode('view')} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">预览</button>
            )}
            <button onClick={handleDownload} className="px-3 py-1.5 text-sm text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg">下载</button>
          </div>
        </div>
      </nav>

      {/* 内容区 */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-500">加载中...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">{'\u26A0\uFE0F'} 加载失败: {error}</p>
          </div>
        )}

        {/* PDF 预览 */}
        {!loading && !error && pdf && signedUrl && (
          <iframe src={signedUrl} className="w-full h-[80vh] rounded-xl shadow bg-white" />
        )}

        {/* 可编辑 - 查看模式 */}
        {!loading && !error && editable && mode === 'view' && (
          <div className="bg-white rounded-xl p-4 sm:p-8 shadow-sm min-h-[60vh]">
            {file.file_name.toLowerCase().endsWith('.md') ? (
              <div className="markdown-preview"><Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown></div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">{content}</pre>
            )}
          </div>
        )}

        {/* 可编辑 - 编辑模式 */}
        {!loading && !error && editable && mode === 'edit' && (
          <div className="flex flex-col gap-4">
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm leading-relaxed min-h-[60vh]"
              spellCheck={false} />
            <div className="flex items-center justify-end gap-3">
              {saveMsg && <span className={`text-sm ${saveMsg.includes('失败') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</span>}
              <button onClick={handleSave} disabled={saving || content === originalContent}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
