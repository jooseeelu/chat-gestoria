/// <reference path="../pb_data/types.d.ts" />

/**
 * Notificaciones push. El cifrado Web Push lo hace el servicio `push`
 * (Node + web-push) de docker-compose; aquí solo se decide a quién avisar.
 * Si ese servicio no está levantado, el chat sigue funcionando igual.
 */

// Clave pública VAPID para que el navegador pueda suscribirse
routerAdd("GET", "/api/push/vapid-public-key", (c) => {
  const res = $http.send({
    url: "http://push:3000/vapid-public-key",
    method: "GET",
    timeout: 5
  });
  if (res.statusCode !== 200) {
    throw new BadRequestError("El servicio de notificaciones no está disponible");
  }
  return c.json(200, { key: res.raw.trim() });
});

// Un mismo navegador solo puede pertenecer a un usuario: si otra persona
// inicia sesión en él, la suscripción anterior se reemplaza.
onRecordBeforeCreateRequest((e) => {
  const endpoint = e.record.getString("endpoint");
  const old = $app.dao().findRecordsByFilter(
    "push_subscriptions", "endpoint = {:ep}", "", 10, 0, { ep: endpoint }
  );
  for (const r of old) {
    $app.dao().deleteRecord(r);
  }
}, "push_subscriptions");

// Cada mensaje nuevo avisa a todos los demás usuarios con notificaciones activas
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  if (record.getString("type") === "system") return;

  try {
    const senderId = record.getString("sender");
    // Solo a dispositivos que NO tengan la app abierta ahora mismo (presencia en los últimos 45 s)
    const activeCutoff = new Date(Date.now() - 45 * 1000).toISOString().replace("T", " ");
    const subs = $app.dao().findRecordsByFilter(
      "push_subscriptions",
      "user != {:sender} && (active_at = '' || active_at < {:cutoff})",
      "", 500, 0, { sender: senderId, cutoff: activeCutoff }
    );
    if (!subs || subs.length === 0) return;

    let senderName = "Alguien";
    try {
      const sender = $app.dao().findRecordById("users", senderId);
      senderName = sender.getString("name") || sender.getString("username") || senderName;
    } catch (_) {}

    let channelName = "";
    try {
      channelName = $app.dao().findRecordById("channels", record.getString("channel")).getString("name");
    } catch (_) {}

    const content = record.getString("content");
    const body = content
      ? (content.length > 140 ? content.slice(0, 140) + "…" : content)
      : "📎 Ha enviado un archivo";

    const res = $http.send({
      url: "http://push:3000/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: 5,
      body: JSON.stringify({
        payload: {
          title: channelName ? senderName + " · " + channelName : senderName,
          body: body,
          channel: record.getString("channel"),
          messageId: record.id
        },
        subscriptions: subs.map((s) => ({
          id: s.id,
          endpoint: s.getString("endpoint"),
          keys: JSON.parse(s.getString("keys") || "{}")
        }))
      })
    });

    // Borrar las suscripciones que el servicio push ha detectado como caducadas
    const expired = (res.json && res.json.expired) || [];
    for (const id of expired) {
      try {
        $app.dao().deleteRecord($app.dao().findRecordById("push_subscriptions", id));
      } catch (_) {}
    }
  } catch (err) {
    console.error("[push] Error preparando notificaciones:", err);
  }
}, "messages");
