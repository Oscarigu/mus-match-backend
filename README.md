# Mus-Match Backend

Servidor backend para la aplicación Mus-Match, proporcionando una API RESTful para la gestión de partidas de mus, usuarios y comunicación en tiempo real.

## 🚀 Características

- 🔐 Autenticación JWT
- 📝 API RESTful
- 💾 Base de datos MongoDB
- 💬 Sistema de chat
- 🎮 Gestión de partidas
- 👥 Gestión de usuarios

## 🛠️ Tecnologías

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens
- Socket.io (para chat en tiempo real)

## 📁 Estructura del Proyecto

```
├── config/           # Configuración de la aplicación
├── db/              # Configuración de la base de datos
├── error-handling/  # Manejo de errores
├── middleware/      # Middleware personalizado
│   └── jwt.middleware.js
├── models/          # Modelos de MongoDB
│   ├── Conversation.model.js
│   ├── Game.model.js
│   └── User.model.js
└── routes/          # Rutas de la API
    ├── auth.routes.js
    ├── conversation.routes.js
    ├── game.routes.js
    └── index.routes.js
```

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Oscarigu/mus-match-backend.git
```

2. Instala las dependencias:
```bash
cd mus-match-backend
npm install
```

3. Crea un archivo `.env` con las siguientes variables:
```
PORT=5005
ORIGIN=http://localhost:5173
TOKEN_SECRET=tuSecretKey
MONGODB_URI=mongodb://localhost/mus-match
```

4. Inicia el servidor:
```bash
npm run dev
```

## 🔌 Endpoints de la API

### Autenticación
- `POST /api/auth/signup` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/verify` - Verificar token

### Partidas
- `GET /api/games` - Obtener todas las partidas
- `POST /api/games` - Crear nueva partida
- `GET /api/games/:id` - Obtener detalles de partida
- `PUT /api/games/:id` - Actualizar partida
- `DELETE /api/games/:id` - Eliminar partida

### Chat/Conversaciones
- `GET /api/conversation` - Obtener conversaciones
- `POST /api/conversation` - Crear nueva conversación
- `GET /api/conversation/:id` - Obtener mensajes de conversación

## 📊 Modelos de Datos

### Usuario
```javascript
{
  username: String,
  email: String,
  password: String,
  // otros campos...
}
```

### Partida
```javascript
{
  title: String,
  players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: String,
  // otros campos...
}
```

### Conversación
```javascript
{
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    timestamp: Date
  }]
}
```

## 🔒 Seguridad

- Middleware de autenticación JWT
- Sanitización de datos
- Validación de entrada
- Manejo de errores personalizado
- CORS configurado

## 🚀 Scripts Disponibles

- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm start` - Inicia el servidor en modo producción
- `npm test` - Ejecuta los tests

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.