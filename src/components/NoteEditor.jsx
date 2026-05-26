import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatFileSize, formatDate, isEditable, isPdf, getTypeLabel } from '../utils/formatUtils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NoteEditor({ file, onClose, onSaved }) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('view'); // view | edit
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [signedUrl, setSignedUrl] = useState(null);
  const [lastOpened, setLastOpened] = useState(null);

  const editable = isEditable(file);
  const pdf = isPdf(file);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // 获取文件内容并标记已打开
  const fetchContent = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null);

    try {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from('user_notes')
        .createSignedUrl(file.storage_path, 300);
      if (urlErr) throw urlErr;
      setSignedUrl(urlData.signedUrl);

      // 如果是可编辑的，获取文本内容
      if (editable) {
        const resp = await fetch(urlData.signedUrl);
        const text = await resp.text();
        setContent(text);
        setOriginalContent(text);
      }

      // 更新最后打开时间
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('user_notes')
        .update({ last_opened_at: now })
        .eq('id', file.id);
      if (!updateErr) {
        setLastOpened(now);
        // 通过 ref 调用 onSaved，避免依赖循环
        if (onSavedRef.current) onSavedRef.current();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [file, editable]);

  useEffect(() => {
    fetchContent();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [fetchContent, onClose]);

  // 保存编辑内容
  const handleSave = async () => {
    if (content === originalContent) {
      setSaveMsg('内容未更改');
      setTimeout(() => setSaveMsg(''), 2000);
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      // 上传更新后的内容覆盖原文件
      const blob = new Blob([content], { type: file.file_type });
      const { error: uploadErr } = await supabase.storage
        .from('user_notes')
        .upload(file.storage_path, blob, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw uploadErr;

      setOriginalContent(content);
      setSaveMsg('保存成功');
      setMode('view');
      if (onSaved) onSaved();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg('保存失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 下载文件
  const handleDownload = async () => {
    try {
      const { data, error: e } = await supabase.storage
        .from('user_notes')
        .createSignedUrl(file.storage_path, 60);
      if (e) throw e;
      const a = document.createElement('a');
      a.href = data.signedUrl; a.download = file.file_name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (err) { alert('下载失败: ' + err.message); }
  };

  const isModified = content !== originalContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{'\u{1F4DD}'}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-800 truncate">{file.file_name}</h3>
              <p className="text-xs text-gray-400">
                <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium mr-2">{getTypeLabel(file)}</span>
                {formatFileSize(file.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* 对于可编辑文件，显示编辑/预览切换 */}
            {editable && mode === 'view' && (
              <button onClick={() => setMode('edit')}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition font-medium">
                编辑
              </button>
            )}
            {editable && mode === 'edit' && (
              <button onClick={() => setMode('view')}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition font-medium">
                预览
              </button>
            )}
            <button onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="下载">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="关闭">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6">
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-gray-500 text-sm">加载中...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-red-500">{'\u26A0\uFE0F'} 加载失败: {error}</p>
              <button onClick={fetchContent} className="mt-3 text-sm text-amber-600 hover:text-amber-800">重试</button>
            </div>
          )}

          {/* PDF 预览 */}
          {!loading && !error && pdf && signedUrl && (
            <iframe src={signedUrl} title={file.file_name} className="w-full h-[75vh] rounded-lg shadow bg-white" />
          )}

          {/* 非 PDF 非可编辑 */}
          {!loading && !error && !pdf && !editable && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">{'\u{1F4C4}'}</div>
              <p className="text-gray-500">此文件格式不支持在线预览</p>
              <button onClick={handleDownload} className="mt-3 text-sm text-amber-600 hover:text-amber-800 font-medium">
                下载到本地查看
              </button>
            </div>
          )}

          {/* 可编辑内容（MD/TXT） - 查看模式 */}
          {!loading && !error && editable && mode === 'view' && (
            <div className="bg-white rounded-xl p-4 sm:p-8 shadow-sm min-h-[300px]">
              {file.file_name.endsWith('.md') ? (
                <div className="markdown-preview">
                  <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">{content}</pre>
              )}
            </div>
          )}

          {/* 可编辑内容 - 编辑模式 */}
          {!loading && !error && editable && mode === 'edit' && (
            <div className="flex flex-col h-full min-h-[400px]">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="flex-1 w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono text-sm leading-relaxed min-h-[50vh]"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* 底部工具栏（仅编辑模式） */}
        {editable && mode === 'edit' && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="text-xs text-gray-400">
              {isModified ? '内容已修改' : '未做更改'}
              {lastOpened && <span className="ml-3">上次保存: {formatDate(lastOpened)}</span>}
            </div>
            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className={`text-sm ${saveMsg.includes('失败') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveMsg}
                </span>
              )}
              <button onClick={handleSave} disabled={saving || !isModified}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
