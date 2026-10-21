/**
 * Clasificación y estilos de tipos de archivos para Gestoría eMadrid
 */

export function detectFileType(filename, mimeType = '') {
  if (!filename) return 'other';
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'pdf' || mimeType.includes('pdf')) return 'pdf';
  
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return 'spreadsheet';
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archive';
  }

  if (['doc', 'docx', 'odt', 'txt'].includes(ext) || mimeType.includes('word') || mimeType.includes('document')) {
    return 'document';
  }

  return 'other';
}

export function getFileTypeBadge(fileType) {
  switch (fileType) {
    case 'pdf':
      return {
        label: 'PDF Oficial',
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        iconName: 'FileText'
      };
    case 'spreadsheet':
      return {
        label: 'Excel / Hoja',
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconName: 'FileSpreadsheet'
      };
    case 'image':
      return {
        label: 'Imagen',
        bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        iconName: 'Image'
      };
    case 'archive':
      return {
        label: 'Comprimido ZIP',
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconName: 'Archive'
      };
    case 'document':
      return {
        label: 'Documento Word',
        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        iconName: 'FileCheck'
      };
    default:
      return {
        label: 'Archivo',
        bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        iconName: 'File'
      };
  }
}
