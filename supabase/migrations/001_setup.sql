-- ====================================================
-- 个人笔记管理 - Supabase 数据库初始化脚本
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- ====================================================

-- 1. 创建 user_notes 表（与 user_files 完全独立）
CREATE TABLE IF NOT EXISTS user_notes (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name      TEXT NOT NULL,
  file_size      BIGINT NOT NULL DEFAULT 0,
  file_type      TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(created_at DESC);

-- 3. 开启 RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略
CREATE POLICY "Users can view own notes" ON user_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON user_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON user_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====================================================
-- Storage Bucket 创建步骤
-- ====================================================
-- 1. Supabase Dashboard > Storage > Create bucket
-- 2. Name: user_notes, 取消勾选 Public bucket
-- 3. 进入 bucket > Policies, 添加 3 条策略:
--
-- SELECT:  (auth.uid())::text = (storage.foldername(name))[1]
-- INSERT:  (auth.uid())::text = (storage.foldername(name))[1]
-- DELETE:  (auth.uid())::text = (storage.foldername(name))[1]
