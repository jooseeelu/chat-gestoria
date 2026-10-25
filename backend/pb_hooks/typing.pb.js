/// <reference path="../pb_data/types.d.ts" />

/**
 * Indicador "escribiendo..." sin tocar la base de datos.
 * El cliente hace POST /api/typing { channel } y se reenvía a todos los
 * suscritos al topic realtime "typing". Antes se creaban registros en
 * `messages` que un `member` no podía borrar y se quedaban como basura.
 */
routerAdd("POST", "/api/typing", (c) => {
  const authRecord = c.get("authRecord");
  const data = $apis.requestInfo(c).data || {};
  const channel = String(data.channel || "");

  if (!channel) {
    throw new BadRequestError("channel es obligatorio");
  }

  const message = new SubscriptionMessage({
    name: "typing",
    data: JSON.stringify({
      channel: channel,
      userId: authRecord.id,
      name: authRecord.getString("name") || authRecord.getString("username")
    })
  });

  const clients = $app.subscriptionsBroker().clients();
  for (let clientId in clients) {
    if (clients[clientId].hasSubscription("typing")) {
      clients[clientId].send(message);
    }
  }

  return c.noContent(204);
}, $apis.requireRecordAuth());
