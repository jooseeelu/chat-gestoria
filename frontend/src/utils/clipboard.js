/**
 * Copiar una imagen del chat al portapapeles como IMAGEN (no como nombre de archivo),
 * para poder pegarla en otra app (WhatsApp, correo, Claude...) sin descargarla.
 *
 * Los navegadores solo aceptan image/png en el portapapeles: si la foto es JPG/WEBP
 * se convierte a PNG con un canvas. El ClipboardItem recibe una promesa para que
 * Safari (iPhone/Mac) lo acepte dentro del gesto del usuario.
 */
async function toPngBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
  const blob = await res.blob();
  if (blob.type === 'image/png') return blob;

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo convertir a PNG'))), 'image/png');
  });
}

export function canCopyImages() {
  return typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;
}

export async function copyImageToClipboard(url) {
  if (!canCopyImages()) throw new Error('Este navegador no permite copiar imágenes');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPngBlob(url) })]);
}
