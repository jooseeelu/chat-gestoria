import PocketBase from 'pocketbase';
import { ref } from 'vue';

export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? 'http://localhost:8090' : '/');
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

/**
 * Token para descargar adjuntos protegidos. Lo emite PocketBase solo a usuarios
 * con sesión y caduca (1 h): se renueva un minuto antes de que expire.
 */
export const fileToken = ref('');
let fileTokenTimer = null;

function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000;
  } catch (_) {
    return Date.now() + 60_000;
  }
}

export async function refreshFileToken() {
  if (fileTokenTimer) clearTimeout(fileTokenTimer);
  if (!pb.authStore.isValid) {
    fileToken.value = '';
    return;
  }
  let nextIn = 30_000;
  try {
    const token = await pb.files.getToken();
    fileToken.value = token;
    nextIn = Math.max(30_000, tokenExpiry(token) - Date.now() - 60_000);
  } catch (e) {
    console.warn('No se pudo obtener el token de archivos:', e);
  }
  fileTokenTimer = setTimeout(refreshFileToken, nextIn);
}

export function clearFileToken() {
  if (fileTokenTimer) clearTimeout(fileTokenTimer);
  fileTokenTimer = null;
  fileToken.value = '';
}

/**
 * URL de un adjunto protegido con el token vigente
 */
export function protectedFileUrl(fileRef) {
  if (!fileRef) return '';
  return pb.files.getUrl(fileRef, fileRef.file, fileToken.value ? { token: fileToken.value } : undefined);
}

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
