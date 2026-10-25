# Gestoría eMadrid - Chat Interno & Transferencia de Documentos

Aplicación web moderna, fluida y con foco principal en el intercambio ágil de todo tipo de archivos (PDFs, Excels, nóminas, imágenes, ZIPs) entre el equipo de [Gestoría eMadrid](https://www.gestoriaemadrid.com).

Diseñada con arquitectura multiusuario escalable desde el día 1 (canales temáticos, chats directos, control de roles de permisos: admins/jefatura, miembros y becarios).

---

## 🚀 Arquitectura y Stack Tecnológico

- **Frontend:**
  - **Vue 3** (Composition API, `<script setup>`) con **Vite**.
  - **Tailwind CSS** con diseño *Neo-Clean / Glassmorphism* (inspirado en Linear, Telegram Web y Raycast).
  - **Lucide Icons** para iconografía moderna.
  - **Pinia** para gestión de estados reactivos (Auth, Chat y Bóveda Documental).
  - **Vue Router** con navegación fluida y guardas de autenticación.
  - **@vueuse/core** para atajos globales de teclado (`Ctrl + K`), tema oscuro/claro y eventos de arrastre.

- **Backend & Base de Datos:**
  - **PocketBase** (servidor ligero todo en uno con SQLite WAL, autenticación multi-rol, almacenamiento nativo de archivos y WebSockets/SSE en tiempo real).
  - **pb_migrations declarativas** con esquema versionado para `users`, `channels`, `messages` y `attachments`.
  - **pb_hooks** para automatización e integración con **n8n**.

- **Despliegue & DevOps:**
  - Contenedores Docker multi-stage optimizados (Alpine + Nginx para frontend y PocketBase binario para backend).
  - Orquestación con `docker-compose.yml` listo para **Dokploy** y VPS.

---

## 📁 Estructura del Proyecto

```
chat-gestoria/
├── backend/
│   ├── pb_migrations/                  # Migraciones declarativas JS de PocketBase
│   │   ├── 1700000000_init_roles_and_users.js
│   │   ├── 1700000001_create_channels.js
│   │   ├── 1700000002_create_messages.js
│   │   ├── 1700000003_create_attachments.js
│   │   └── 1700000004_seed_initial_data.js
│   ├── pb_hooks/                       # Hooks para n8n y eventos
│   │   └── webhook_n8n.pb.js
│   ├── pb_schema.json                  # Exportación completa del esquema para importación directa
│   ├── Dockerfile                      # Imagen ligera de PocketBase
│   └── README.md
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── logo-emadrid.svg
│   ├── src/
│   │   ├── api/
│   │   │   └── pocketbase.js           # Cliente PB y mock interactivo para desarrollo
│   │   ├── assets/
│   │   │   └── main.css                # Estilos base y tokens Glassmorphism
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInput.vue       # Barra de chat con indicador de progreso y atajos
│   │   │   │   ├── ChatMessageBubble.vue # Burbuja con spring animation y avatar
│   │   │   │   ├── ChatWindow.vue      # Contenedor principal con eventos Drag & Drop
│   │   │   │   ├── FileLightbox.vue    # Visor flotante de imágenes y visor PDF
│   │   │   │   ├── FileUploadZone.vue  # Dropzone inmersivo con backdrop blur
│   │   │   │   ├── SmartFileCard.vue   # Tarjeta interactiva según tipo de fichero
│   │   │   │   └── TypingIndicator.vue # Indicador animado de "escribiendo..."
│   │   │   ├── command/
│   │   │   │   └── CommandPalette.vue  # Buscador estilo Raycast / Linear (Ctrl + K)
│   │   │   └── layout/
│   │   │       ├── AppHeader.vue       # Cabecera superior y toggle de Bóveda
│   │   │       ├── DocumentVaultDrawer.vue # Bóveda de Documentos retráctil (Slide-over)
│   │   │       └── SidebarChannels.vue # Navegación, canales y selector de rol
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── stores/
│   │   │   ├── auth.js                 # Sesión y roles de usuarios
│   │   │   ├── chat.js                 # Mensajes y canales en tiempo real
│   │   │   └── documents.js            # Bóveda documental, filtros y buscador
│   │   ├── utils/
│   │   │   ├── fileIcons.js            # Detección y badges temáticos por fichero
│   │   │   └── formatters.js           # Fechas y formateador de tamaños
│   │   ├── views/
│   │   │   ├── ChatView.vue            # Vista principal integrada
│   │   │   └── LoginView.vue           # Pantalla de acceso rápido del equipo
│   │   ├── App.vue
│   │   └── main.js
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 👥 Equipo Inicial y Roles

Las migraciones preparan a los miembros iniciales con acceso preconfigurado:

| Nombre | Rol | Posición | Email |
| :--- | :--- | :--- | :--- |
| **Andrés** | `admin` (Jefatura) | Director / Titular | `andres@gestoriaemadrid.com` |
| **Jose Luis** | `admin` (Desarrollo) | Desarrollador | `joseluis@gestoriaemadrid.com` |
| **Johan** | `member` (Desarrollo) | Desarrollador | `johanfernix9@gmail.com` |

*(Las contraseñas no se publican aquí: el administrador las establece desde el panel `/_/`.)*

---

## 💬 Canales Temáticos Iniciales

1. **`#general`**: Canal central para comunicados de toda la gestoría.
2. **`#fiscal-tributario`**: Presentación de modelos (303, 111, 115, Sociedades), liquidaciones de IVA e IRPF y notificaciones AEAT.
3. **`#laboral-nominas`**: Contratos de trabajo, altas/bajas de la TGSS y envío de remesas de nóminas.
4. **`#contable-cierres`**: Asientos contables, balances de sumas y saldos, conciliación bancaria y libros oficiales.
5. **`#urgencias`**: Requerimientos con plazo perentorio o incidencias inmediatas de clientes.

---

## ⚡ Características Principales de la UI/UX

1. **Drag & Drop Inmersivo:**
   - Arrastra cualquier archivo dentro de la ventana de chat para activar la zona con efecto desenfocado (`backdrop-blur`).
   - Muestra barra de progreso animada al enviar.
2. **Tarjetas Inteligentes de Documentos (`SmartFileCard`):**
   - **PDFs:** Badge rojizo con previsualizador flotante embebido.
   - **Excels:** Badge esmeralda con peso del archivo y descarga directa.
   - **Imágenes:** Miniatura expandible mediante Lightbox modal.
   - **ZIPs / Docs:** Badge temático para empaquetados contables.
3. **"Bóveda de Documentos" (Panel retráctil):**
   - Acceso con un clic desde la barra superior.
   - Pestañas de filtrado: *Todos*, *PDFs / Modelos*, *Excels / Nóminas*, *Imágenes*, *ZIPs*.
   - Buscador en tiempo real por nombre de archivo, asesor o canal.
4. **Command Palette (`Ctrl + K` / `Cmd + K`):**
   - Salto instantáneo entre canales temáticos.
   - Búsqueda de documentos.
   - Selector rápido para alternar la sesión entre Andrés, Johan y Elmes y probar la experiencia de cada rol.
5. **Micro-interacciones y presencia:**
   - Indicador de usuarios online en tiempo real (pulso verde activo).
   - Simulación de estado *"Johan está escribiendo..."* al interactuar.
   - Modo oscuro/claro elegante con persistencia.

---

## 🛠️ Puesta en Marcha en Desarrollo

### 1. Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 2. Iniciar Backend (PocketBase)
Si descargas el binario de PocketBase:
```bash
cd backend
./pocketbase serve --automigrate=1
```
Panel de administración en: `http://localhost:8090/_/`

---

## 🚢 Despliegue en Producción (Dokploy / VPS)

Con Docker Compose:
```bash
docker compose up -d --build
```
Dokploy detectará el archivo `docker-compose.yml` o puedes configurar el backend y frontend como servicios independientes en la misma red privada.
