/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);

  // 1. Respuestas/citas guardadas en servidor (antes solo existían en el navegador del emisor)
  const messages = dao.findCollectionByNameOrId("messages");
  if (!messages.schema.getFieldByName("reply_to")) {
    messages.schema.addField(new SchemaField({
      name: "reply_to",
      type: "relation",
      required: false,
      options: {
        collectionId: messages.id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1
      }
    }));
  }

  // 2. Nadie puede enviar mensajes en nombre de otro ni editar el texto ajeno.
  //    Los demás solo pueden tocar reacciones / pinned / read_by.
  messages.createRule = "@request.auth.id != '' && @request.data.sender = @request.auth.id";
  messages.updateRule = "@request.auth.id = sender || (@request.auth.id != '' && @request.data.content:isset = false && @request.data.sender:isset = false && @request.data.channel:isset = false && @request.data.type:isset = false)";
  dao.saveCollection(messages);

  const attachments = dao.findCollectionByNameOrId("attachments");
  attachments.createRule = "@request.auth.id != '' && @request.data.uploader = @request.auth.id";
  dao.saveCollection(attachments);

  // 3. Limpiar los registros basura del antiguo indicador "escribiendo..."
  db.newQuery("DELETE FROM messages WHERE type = 'system' AND content = '__TYPING__'").execute();

  return null;
}, (db) => {
  return null;
});
