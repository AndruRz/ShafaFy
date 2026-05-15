# ShafaFy 🎵

Reproductor de música virtual desarrollado como proyecto final de la asignatura
**Estructuras de Datos II** — Universidad Autónoma de Occidente, Grupo 51, 2026-1S.

Inspirado en la experiencia de Spotify, ShafaFy implementa cinco estructuras de
datos (Pila, Cola, Árbol, Trie y Grafo) dentro de una aplicación web real con
autenticación, historial de reproducción, foro en tiempo real y sistema de
recomendaciones personalizadas.

---

## 👥 Integrantes

| Nombre | Rol |
|---|---|
| Andre Rodriguez | Full Stack — Backend, estructuras de datos, despliegue |
| Julián Viafara | Frontend — UI/UX, componentes React, mockup |

**Docente:** Jonathan López Londoño

---

## 🔗 Enlaces

| Recurso | URL |
|---|---|
| 🌐 Plataforma en producción | https://shafafy-production-frontend.up.railway.app/ |
| 🎨 Propuesta gráfica (mockup) | https://julianviafara.github.io/ShafaFy-Mockup/index.html |
| 📁 Repositorio mockup | https://github.com/julianviafara/ShafaFy-Mockup |

---

## 🛠️ Tecnologías

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** MongoDB Atlas
- **Tiempo real:** Socket.IO
- **APIs externas:** Spotify Web API · YouTube Data API v3
- **Despliegue:** Railway

---

## 🚀 Despliegue en producción

El proyecto está desplegado íntegramente en Railway bajo un mismo proyecto,
con dos servicios independientes:

- **Frontend:** https://shafafy-production-frontend.up.railway.app/
- **Backend:** conectado internamente al frontend mediante la variable de
  entorno `VITE_API_URL`

No se requiere ninguna configuración adicional para usar la plataforma en
producción. Basta con abrir el enlace del frontend en cualquier navegador.

---

## 💻 Ejecución local

### Requisitos previos

- Node.js v18 o superior
- npm v9 o superior
- Cuenta en MongoDB Atlas (o instancia local de MongoDB)
- Credenciales de Spotify Developer Portal
- Clave de YouTube Data API v3

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/AndruRz/ShafaFy.git
cd ShafaFy
```

---

### 2. Configurar y arrancar el Backend

```bash
cd backend
npm install
```

Crear el archivo `.env` dentro de la carpeta `backend/` con el siguiente
contenido (reemplazar los valores entre ángulos):

```env
MONGODB_URI=<tu_cadena_de_conexión_mongodb>
JWT_SECRET=<clave_secreta_para_jwt>
SPOTIFY_CLIENT_ID=<tu_spotify_client_id>
SPOTIFY_CLIENT_SECRET=<tu_spotify_client_secret>
YOUTUBE_API_KEY=<tu_youtube_api_key>
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Iniciar el servidor:

```bash
npm run dev
```

El backend quedará disponible en **http://localhost:3000**

---

### 3. Configurar y arrancar el Frontend

Abrir una nueva terminal:

```bash
cd frontend
npm install
```

Crear el archivo `.env` dentro de la carpeta `frontend/` con el siguiente
contenido:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

> **Nota:** si no puedes levantar el backend localmente, puedes apuntar
> directamente al servidor de Railway para que la aplicación funcione igual:
>
> ```env
> VITE_API_URL=https://shafafy-production-backend.up.railway.app/api
> VITE_SOCKET_URL=https://shafafy-production-backend.up.railway.app
> ```

Iniciar el frontend:

```bash
npm run dev
```

La aplicación quedará disponible en **http://localhost:5173**

---

## 📁 Estructura del proyecto

```
ShafaFy/
├── backend/
│   ├── config/           # Conexión a MongoDB
│   ├── controllers/      # Lógica de negocio (auth, spotify, foro, grafo...)
│   ├── middleware/        # Autenticación JWT
│   ├── models/           # Esquemas Mongoose
│   ├── routes/           # Endpoints REST
│   ├── services/         # Socket.IO en tiempo real
│   └── server.js         # Punto de entrada
│
└── frontend/
    ├── src/
    │   ├── config/           # Instancia Axios
    │   ├── data_structures/  # Pila, Cola, Grafo, Trie, Hash Table
    │   ├── components/       # Componentes reutilizables
    │   ├── pages/            # Páginas por ruta
    │   ├── services/         # Llamadas a la API
    │   └── utils/            # Utilidades (árbol del foro)
    └── index.html
```

## 🧩 Estructuras de datos implementadas

| Estructura | Ubicación | Uso |
|---|---|---|
| **Pila (Stack)** | `data_structures/EstructurasLineales.js` | Historial de reproducción — botón anterior |
| **Cola (Queue)** | `data_structures/EstructurasLineales.js` | Cola de reproducción con contexto activo |
| **Árbol n-ario** | `utils/foroArbol.js` + `controllers/forumController.js` | Hilos de comentarios anidados del foro |
| **Trie + Hash Table** | `data_structures/HashTablesTries.js` | Buscador con autocompletado y caché jerárquico |
| **Grafo** | `data_structures/Grafos.js` + `controllers/graphController.js` | Sistema de recomendaciones de artistas y canciones |

---

## 📄 Documento técnico

El documento final del proyecto se encuentra en la raíz del repositorio:
`ShafaFy_Proyecto_Final.docx`

Describe el alcance del sistema, las tecnologías utilizadas, la explicación
detallada de cada estructura de datos implementada y el razonamiento detrás
de cada decisión de diseño.

---

*Proyecto académico sin fines comerciales — UAO 2026*
