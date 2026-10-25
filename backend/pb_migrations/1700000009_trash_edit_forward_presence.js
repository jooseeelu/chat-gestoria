/// <reference path="../pb_data/types.d.ts" />

/**
 * Funciones tipo WhatsApp:
 * - Papelera: borrar un mensaje lo marca como `deleted` (se puede restaurar).
 *   Los mensajes en la papelera solo los ven su autor y los admins.
 * - Editar: `edited_at` marca el mensaje como "editado".
 * - Reenviar: `forwarded` muestra la etiqueta "Reenviado".
 * - Presencia por dispositivo: `push_subscriptions.active_at` indica que ese
 *   dispositivo tiene la app abierta, para no mandarle notificaciones push.
 */
migrate((db) => {
  const dao = new Dao(db);
  const messages = dao.findCollectionByNameOrId("messages");

  if (!messages.schema.getFieldByName("deleted")) {
    messages.schema.addField(new SchemaField({ name: "deleted", type: "bool", required: false, options: {} }));
  }
  if (!messages.schema.getFieldByName("deleted_at")) {
    messages.schema.addField(new SchemaField({ name: "deleted_at", type: "date", required: false, options: { min: "", max: "" } }));
  }
  if (!messages.schema.getFieldByName("deleted_by")) {
    messages.schema.addField(new SchemaField({
      name: "deleted_by",
      type: "relation",
      required: false,
      options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1 }
    }));
  }
  if (!messages.schema.getFieldByName("edited_at")) {
    messages.schema.addField(new SchemaField({ name: "edited_at", type: "date", required: false, options: { min: "", max: "" } }));
  }
  if (!messages.schema.getFieldByName("forwarded")) {
    messages.schema.addField(new SchemaField({ name: "forwarded", type: "bool", required: false, options: {} }));
  }

  const visible = "@request.auth.id != '' && (deleted != true || sender = @request.auth.id || @request.auth.role = 'admin')";
  messages.listRule = visible;
  messages.viewRule = visible;

  // - El autor puede todo (editar, mandar a la papelera, restaurar).
  // - Un admin puede mandar a la papelera mensajes ajenos, pero no cambiar su texto.
  // - El resto solo puede tocar reacciones y leídos.
  const lockedForOthers = [
    "content", "sender", "channel", "type", "deleted", "deleted_at", "deleted_by", "edited_at", "forwarded", "reply_to"
  ].map((f) => "@request.data." + f + ":isset = false").join(" && ");
  const lockedForAdmin = [
    "content", "sender", "channel", "type", "edited_at", "forwarded", "reply_to"
  ].map((f) => "@request.data." + f + ":isset = false").join(" && ");

  messages.updateRule =
    "@request.auth.id = sender" +
    " || (@request.auth.role = 'admin' && " + lockedForAdmin + ")" +
    " || (@request.auth.id != '' && " + lockedForOthers + ")";

  dao.saveCollection(messages);

  const subs = dao.findCollectionByNameOrId("push_subscriptions");
  if (!subs.schema.getFieldByName("active_at")) {
    subs.schema.addField(new SchemaField({ name: "active_at", type: "date", required: false, options: { min: "", max: "" } }));
  }
  dao.saveCollection(subs);

  return null;
}, (db) => {
  return null;
});
