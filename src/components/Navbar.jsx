import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await signOut(); navigate('/login'); }
    catch (err) { console.error('登出失败:', err); }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{'\u{1F4DD}'}</span>
            <span className="text-lg font-bold text-gray-800">个人笔记</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <button onClick={handleLogout}
              className="ml-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
