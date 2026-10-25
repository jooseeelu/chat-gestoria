import { watch } from 'vue';

/**
 * "Atrás" cierra lo que esté abierto (como en WhatsApp) en vez de salir de la app
 * o volver al login: cada panel abierto añade una entrada al historial y el gesto
 * o botón atrás de Android/iOS la consume cerrando ese panel.
 *
 * Cada entrada de `stack` corresponde 1:1 a una entrada del historial. Si un panel
 * se cierra desde la propia UI (botón X), su entrada queda "gastada": no se llama a
 * history.back() (varias llamadas seguidas se pisan entre sí); se reutiliza al abrir
 * el siguiente panel o se salta automáticamente al pulsar atrás.
 */
const stack = [];
let listening = false;

function ensureListener() {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', () => {
    const entry = stack.pop();
    if (!entry) return;
    if (entry.stale) {
      // Entrada de un panel ya cerrado: saltarla hasta la siguiente con algo abierto
      if (stack.length > 0) history.back();
      return;
    }
    entry.close();
  });
}

function push(entry) {
  ensureListener();
  const top = stack[stack.length - 1];
  // Conservar el estado de vue-router para no romper su navegación
  const state = { ...(history.state || {}), overlay: true };
  if (top && top.stale) {
    stack[stack.length - 1] = entry;
    history.replaceState(state, '');
  } else {
    stack.push(entry);
    history.pushState(state, '');
  }
}

/**
 * @param {() => boolean} isOpen  getter reactivo: ¿está abierto el panel?
 * @param {() => void} close      cómo cerrarlo
 */
export function useBackToClose(isOpen, close) {
  let entry = null;
  watch(isOpen, (open) => {
    if (open && !entry) {
      const current = {
        stale: false,
        close: () => {
          entry = null;
          close();
        }
      };
      entry = current;
      push(current);
    } else if (!open && entry) {
      // Cerrado desde la UI: su entrada del historial queda gastada
      entry.stale = true;
      entry = null;
    }
  });
}
