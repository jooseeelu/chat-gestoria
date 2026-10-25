/// <reference path="../pb_data/types.d.ts" />

// Los adjuntos (nóminas, DNIs, modelos...) dejan de ser públicos: hasta ahora cualquiera
// con el enlace podía descargarlos sin sesión. Ahora el enlace necesita un token de archivo
// que solo obtiene un usuario autenticado (pb.files.getToken()) y que caduca en 1 hora.
migrate((db) => {
  const dao = new Dao(db);

  const collection = dao.findCollectionByNameOrId("attachments");
  const old = collection.schema.getFieldByName("file");
  collection.schema.addField(new SchemaField({
    id: old.id,
    name: "file",
    type: "file",
    required: true,
    options: {
      maxSelect: 1,
      maxSize: 104857600, // 100 MB
      mimeTypes: [],
      thumbs: ["100x100", "400x300"],
      protected: true
    }
  }));
  dao.saveCollection(collection);

  // Por defecto el token dura 2 minutos: las imágenes se recargarían constantemente
  const settings = dao.findSettings();
  settings.recordFileToken.duration = 3600;
  dao.saveSettings(settings);

  return null;
}, (db) => {
  return null;
});
