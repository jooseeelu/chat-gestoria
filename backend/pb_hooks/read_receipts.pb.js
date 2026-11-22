/// <reference path="../pb_data/types.d.ts" />

/**
 * Cuando alguien se añade a `read_by` (read_by+), se apunta la hora exacta en
 * `read_receipts`. Siempre se recalcula a partir del valor guardado, así que lo
 * que mande el navegador en `read_receipts` se ignora y nadie puede falsear horas.
 */
onRecordBeforeUpdateRequest((e) => {
  const before = e.record.originalCopy();
  const oldIds = before.getStringSlice("read_by");
  const newIds = e.record.getStringSlice("read_by");

  let receipts = {};
  try {
    receipts = JSON.parse(before.getString("read_receipts") || "{}") || {};
  } catch (_) {
    receipts = {};
  }

  const now = new Date().toISOString();
  for (const id of newIds) {
    if (oldIds.indexOf(id) === -1 && !receipts[id]) {
      receipts[id] = now;
    }
  }

  e.record.set("read_receipts", JSON.stringify(receipts));
}, "messages");
