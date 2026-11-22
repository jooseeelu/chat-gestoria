/// <reference path="../pb_data/types.d.ts" />

/**
 * Hora de lectura de cada mensaje ("Leído hoy a las 14:32", como la info de WhatsApp).
 * `read_by` solo dice quién lo ha leído; `read_receipts` guarda { userId: fecha }.
 * Lo rellena el servidor (pb_hooks/read_receipts.pb.js), nunca el navegador.
 */
migrate((db) => {
  const dao = new Dao(db);
  const messages = dao.findCollectionByNameOrId("messages");

  if (!messages.schema.getFieldByName("read_receipts")) {
    messages.schema.addField(new SchemaField({
      name: "read_receipts",
      type: "json",
      required: false,
      options: { maxSize: 20000 }
    }));
  }

  return dao.saveCollection(messages);
}, (db) => {
  return null;
});
