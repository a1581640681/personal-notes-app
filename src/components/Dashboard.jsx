import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import NoteUpload from './NoteUpload';
import NoteList from './NoteList';

export default function Dashboard() {
  const { user } = useAuth();
  const [noteCount, setNoteCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_notes').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!error) setNoteCount(data?.length || 0);
    } catch (err) { console.error('获取统计失败:', err); }
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);

  const handleUpload = () => { setRefreshKey(p => p + 1); fetchStats(); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-2xl">{'\u{1F4DA}'}</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{noteCount}</p>
              <p className="text-xs text-gray-500">笔记总数</p>
            </div>
            <div className="ml-auto text-xs text-gray-400">
              支持 {'\u{1F4DD}'} Markdown / {'\u{1F4C4}'} 纯文本 / {'\u{1F4D5}'} PDF
            </div>
          </div>
        </div>

        {/* 上传 */}
        <NoteUpload onUploadComplete={handleUpload} />

        {/* 列表 */}
        <h2 className="text-base font-semibold text-gray-700 mb-3">我的笔记</h2>
        <NoteList refreshTrigger={refreshKey} />
      </main>
    </div>
  );
}
