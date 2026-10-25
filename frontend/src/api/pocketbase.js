import PocketBase from 'pocketbase';

export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? 'http://localhost:8090' : '/');
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export function getPbFileUrl(record, filename, thumb = '') {
  if (!record || !filename) return '';
  if (filename.startsWith('blob:') || filename.startsWith('data:') || filename.startsWith('http')) {
    return filename;
  }
  return pb.files.getUrl(record, filename, thumb ? { thumb } : undefined);
}

const AVATAR_COLORS = ['#c59a3e', '#b45309', '#0f766e', '#1d4ed8', '#7c3aed', '#be123c', '#4d7c0f'];

/**
 * Avatar con iniciales (SVG en data URL) para usuarios sin foto subida
 */
export function initialsAvatar(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || '?';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${color}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="48" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Convierte un registro de `users` de PocketBase al formato que usa la UI
 */
export function mapUser(record) {
  if (!record) return null;
  const name = record.name || record.username || record.email?.split('@')[0] || 'Usuario';
  return {
    id: record.id,
    name,
    email: record.email,
    role: record.role || 'member',
    position: record.position || '',
    status: record.status || 'offline',
    avatar: record.avatar
      ? pb.files.getUrl(record, record.avatar, { thumb: '160x160' })
      : initialsAvatar(name)
  };
}
