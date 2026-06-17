export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num) {
  if (num == null) return '—';
  return num.toLocaleString('en-US');
}

export function formatScore(score) {
  if (score == null) return '—';
  return `${score.toFixed(1)}%`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function truncate(str, len = 30) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function getScoreColor(score) {
  if (score == null) return 'var(--text-secondary)';
  if (score >= 90) return 'var(--accent-success)';
  if (score >= 75) return 'var(--accent-primary)';
  if (score >= 50) return 'var(--accent-warning)';
  return 'var(--accent-error)';
}

export function getScoreLabel(score) {
  if (score == null) return 'N/A';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}
