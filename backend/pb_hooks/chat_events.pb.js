/// <reference path="../pb_data/types.d.ts" />

/**
 * Papelera de mensajes.
 *
 * Un mensaje enviado a la papelera deja de ser visible para los demás, así que
 * PocketBase ya no les manda su evento realtime de "update". Por eso se avisa
 * aparte por el topic "chat_events" para que lo quiten (o lo recuperen) al momento.
 */
onRecordAfterUpdateRequest((e) => {
  const before = e.record.originalCopy();
  const wasDeleted = before.getBool("deleted");
  const isDeleted = e.record.getBool("deleted");
  if (wasDeleted === isDeleted) return;

  const message = new SubscriptionMessage({
    name: "chat_events",
    data: JSON.stringify({
      type: isDeleted ? "hidden" : "restored",
      id: e.record.id,
      channel: e.record.getString("channel")
    })
  });

  const clients = $app.subscriptionsBroker().clients();
  for (let clientId in clients) {
    if (clients[clientId].hasSubscription("chat_events")) {
      clients[clientId].send(message);
    }
  }
}, "messages");

// Vaciado automático: lo que lleva más de 30 días en la papelera se borra de verdad
cronAdd("purge_trash", "30 4 * * *", () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
  const dao = $app.dao();
  const old = dao.findRecordsByFilter(
    "messages", "deleted = true && deleted_at != '' && deleted_at < {:cutoff}", "", 500, 0, { cutoff: cutoff }
  );
  for (const msg of old) {
    try {
      const atts = dao.findRecordsByFilter("attachments", "message = {:id}", "", 100, 0, { id: msg.id });
      for (const att of atts) dao.deleteRecord(att);
      dao.deleteRecord(msg);
    } catch (err) {
      console.error("[papelera] No se pudo purgar", msg.id, err);
    }
  }
});
