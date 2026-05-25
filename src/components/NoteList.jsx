import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatFileSize, formatDate, getFileIcon, isEditable, isPdf, getTypeLabel } from '../utils/formatUtils';
import NoteEditor from './NoteEditor';

export default function NoteList({ refreshTrigger }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [search, setSearch] = useState('');

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('user_notes').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (e) throw e;
      setNotes(data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes, refreshTrigger]);

  const handleDelete = async (note) => {
    if (!confirm('确认删除笔记 "' + note.file_name + '"？不可恢复。')) return;
    setDeleting(p => ({ ...p, [note.id]: true }));
    try {
      const { error: e1 } = await supabase.storage.from('user_notes').remove([note.storage_path]);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('user_notes').delete().eq('id', note.id);
      if (e2) throw e2;
      setNotes(p => p.filter(n => n.id !== note.id));
      if (activeNote?.id === note.id) setActiveNote(null);
    } catch (err) { alert('删除失败: ' + err.message); }
    finally { setDeleting(p => ({ ...p, [note.id]: false })); }
  };

  const filtered = notes.filter(n => n.file_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* 搜索 */}
      <div className="relative w-full sm:w-80 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索笔记标题..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-gray-500 text-sm">加载笔记列表...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">{'\u26A0\uFE0F'} 加载失败: {error}</p>
          <button onClick={fetchNotes} className="mt-3 text-sm text-amber-600 hover:text-amber-800">重试</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">{search ? '\u{1F50D}' : '\u{1F4DA}'}</div>
          <p className="text-gray-500">{search ? '没有匹配的笔记' : '还没有导入任何笔记'}</p>
          <p className="text-gray-400 text-sm mt-1">{search ? '试试其他关键词' : '拖拽 .md / .txt / .pdf 文件到上方区域'}</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(note => (
            <div key={note.id}
              onClick={() => setActiveNote(note)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition hover:shadow-md group ${activeNote?.id === note.id ? 'border-amber-400 shadow-md ring-1 ring-amber-200' : 'border-gray-200 hover:border-amber-300'}`}>
              <div className="flex items-start gap-3">
                {/* 图标 */}
                <div className="text-2xl flex-shrink-0 mt-0.5">{getFileIcon(note.file_type)}</div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{note.file_name}</p>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${note.file_name.endsWith('.md') ? 'bg-blue-100 text-blue-700' : note.file_name.endsWith('.pdf') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {getTypeLabel(note)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>大小: {formatFileSize(note.file_size)}</span>
                    <span>上传: {formatDate(note.created_at)}</span>
                    <span>最后打开: {formatDate(note.last_opened_at)}</span>
                  </div>
                </div>

                {/* 标签和操作 */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                  {isEditable(note) && (
                    <span className="text-xs text-indigo-500 font-medium mr-1">{'\u270F\uFE0F'} 可编辑</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(note); }} disabled={deleting[note.id]}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50" title="删除">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeNote && (
        <NoteEditor file={activeNote} onClose={() => setActiveNote(null)} onSaved={fetchNotes} />
      )}
    </div>
  );
}
