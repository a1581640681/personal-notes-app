import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate(from, { replace: true });
      } else {
        const data = await signUp(email, password);
        if (data?.user?.identities?.length === 0) {
          setErrorMsg('该邮箱已被注册，请直接登录');
        } else {
          setSuccessMsg('注册成功！请检查邮箱确认链接或直接登录。');
        }
      }
    } catch (err) { setErrorMsg(err.message || '操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    try { await signInWithGoogle(); }
    catch (err) { setErrorMsg(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{'\u{1F4DD}'}</div>
          <h1 className="text-2xl font-bold text-gray-800">个人笔记管理</h1>
          <p className="text-gray-500 mt-1 text-sm">{isLogin ? '登录您的账号' : '创建新账号'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-orange-200/40 p-8">
          {successMsg && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{successMsg}</div>}
          {errorMsg && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位字符"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition text-sm">
              {submitting ? '处理中...' : isLogin ? '登 录' : '注 册'}
            </button>
          </form>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-gray-400">或</span></div>
          </div>
          <button onClick={handleGoogle}
            className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition text-sm flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 账号登录
          </button>
          <p className="mt-5 text-center text-sm text-gray-500">
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
              className="ml-1 text-amber-600 hover:text-amber-800 font-medium">
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
