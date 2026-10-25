/// <reference path="../pb_data/types.d.ts" />

// La lista blanca de mimeTypes rechazaba HTML, SVG, 7z, ODT, XML, JSON...
// La subida fallaba en silencio: el emisor veía su copia local y el resto del equipo nada.
// Lista vacía = se admite cualquier tipo (PocketBase sirve los ficheros con CSP sandbox).
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
      protected: false
    }
  }));

  return dao.saveCollection(collection);
}, (db) => {
  return null;
});
