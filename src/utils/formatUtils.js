export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getFileIcon(fileType) {
  if (!fileType) return '\u{1F4C4}';
  if (fileType.includes('markdown') || fileType === 'text/md' || fileType === 'text/x-markdown') return '\u{1F4DD}';
  if (fileType === 'text/plain') return '\u{1F4C4}';
  if (fileType.includes('pdf')) return '\u{1F4D5}';
  return '\u{1F4C4}';
}

export function isEditable(file) {
  if (!file) return false;
  // 优先通过文件名后缀判断
  const name = file.file_name?.toLowerCase() || '';
  if (name.endsWith('.md')) return true;
  if (name.endsWith('.txt')) return true;
  // 其次通过 MIME 类型判断
  const type = file.file_type || '';
  return type === 'text/plain' || type === 'text/markdown' || type === 'text/x-markdown';
}

export function isPdf(file) {
  if (!file) return false;
  // 优先通过文件名后缀判断
  const name = file.file_name?.toLowerCase() || '';
  if (name.endsWith('.pdf')) return true;
  // 其次通过 MIME 类型判断
  return file.file_type?.includes('pdf');
}

export function getTypeLabel(file) {
  if (!file) return '';
  if (file.file_type === 'text/plain' || file.file_name?.endsWith('.txt')) return 'TXT';
  if (file.file_type?.includes('markdown') || file.file_name?.endsWith('.md')) return 'MD';
  if (file.file_type?.includes('pdf') || file.file_name?.endsWith('.pdf')) return 'PDF';
  return file.file_type?.split('/').pop()?.toUpperCase() || '未知';
}
