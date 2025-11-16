# AlertaUTEC - Frontend

Sistema de gestión de incidentes para el campus UTEC. Frontend desarrollado con React, Vite y TailwindCSS.

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Instalación
```bash
cd frontend
npm install
```

### Ejecutar en Desarrollo
```bash
npm run dev
```
La aplicación se abrirá automáticamente en `http://localhost:3000`

### Build para Producción
```bash
npm run build
npm run preview
```

## 📱 Vistas de la Aplicación

### 1. Login (/)
- **Propósito**: Vista inicial para autenticación de todos los usuarios
- **Características**:
  - Login único para administradores y estudiantes
  - Validación de credenciales institucionales
  - Redirección automática según rol de usuario
- **Credenciales de prueba**:
  - **Admin**: `admin@utec.edu.pe` / `admin123`
  - **Estudiante**: `juan.lopez@utec.edu.pe` / `estudiante123`

### 2. Dashboard Estudiante (/student/dashboard)
- **Propósito**: Vista personal del estudiante con sus incidentes reportados
- **Características**:
  - Estadísticas personales (total, pendientes, en proceso, resueltos)
  - Tabla con todos los incidentes que el estudiante ha reportado
  - Vista detallada de cada incidente con historial completo
  - Botón para crear nuevo incidente
  - Información del creador visible (nombre y código de estudiante)

### 3. Crear Incidente (/student/create-incident)
- **Propósito**: Formulario para que estudiantes reporten nuevos incidentes
- **Características**:
  - Formulario con validación
  - Selección de tipo de incidente
  - Ubicación del campus
  - Nivel de urgencia
  - Descripción detallada (mínimo 20 caracteres)
  - Generación de código de seguimiento
  - Los incidentes quedan asociados al estudiante que los creó

### 4. Panel Administrativo (/admin/dashboard)
- **Propósito**: Gestión completa de todos los incidentes del campus
- **Características**:
  - Dashboard con estadísticas globales en tiempo real
  - Tabla de todos los incidentes con filtros avanzados
  - Búsqueda por ID, tipo, ubicación, descripción
  - Filtros por estado y urgencia
  - Asignación de incidentes a administradores
  - Cambio de estados (Pendiente → En Proceso → Resuelto → Cerrado)
  - Vista detallada de cada incidente
  - Historial completo de cambios
  - Información del estudiante que reportó el incidente

## 🔌 APIs Necesarias (Para Backend)

### Autenticación

#### POST /api/auth/login
Autenticación de administradores y estudiantes
```json
Request:
{
  "email": "admin@utec.edu.pe",
  "password": "admin123"
}

Response (200):
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "Juan Pérez",
    "email": "admin@utec.edu.pe",
    "role": "administrador" | "estudiante",
    "code": "202010001" // Solo para estudiantes
  }
}

Response (401):
{
  "error": "Credenciales incorrectas"
}
```

### Gestión de Incidentes

#### POST /api/incidents
Crear nuevo incidente (requiere autenticación)
```json
Headers:
Authorization: Bearer <token>

Request:
{
  "type": "Infraestructura",
  "location": "Edificio A - Piso 3",
  "description": "Fuga de agua en el baño del tercer piso",
  "urgency": "alta"
}

Response (201):
{
  "id": "INC-2024-001",
  "trackingCode": "INC-2024-001",
  "createdAt": "2024-11-15T08:30:00Z",
  "createdBy": "student-001",
  "createdByName": "Juan López",
  "status": "pendiente",
  "message": "Incidente reportado exitosamente"
}
```

#### GET /api/incidents
Listar todos los incidentes (administradores) o solo los propios (estudiantes)
```json
Query params:
- status: "pendiente" | "en-proceso" | "resuelto" | "cerrado" | "all"
- urgency: "baja" | "media" | "alta" | "critica" | "all"
- assignedTo: string (nombre del admin) | "unassigned"
- createdBy: string (id del usuario) // Automático para estudiantes
- search: string
- page: number
- limit: number

Headers:
Authorization: Bearer <token>

Response (200):
{
  "incidents": [
    {
      "id": "INC-2024-001",
      "type": "Infraestructura",
      "location": "Edificio A - Piso 3",
      "description": "Fuga de agua...",
      "urgency": "alta",
      "status": "pendiente",
      "assignedTo": null,
      "createdAt": "2024-11-15T08:30:00Z",
      "updatedAt": "2024-11-15T08:30:00Z",
      "createdBy": "student-001",
      "createdByName": "Juan López",
      "history": [...]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

#### GET /api/incidents/:id
Obtener detalles de un incidente específico
```json
Headers:
Authorization: Bearer <token>

Response (200):
{
  "id": "INC-2024-001",
  "type": "Infraestructura",
  "location": "Edificio A - Piso 3",
  "description": "Fuga de agua...",
  "urgency": "alta",
  "status": "pendiente",
  "assignedTo": null,
  "createdAt": "2024-11-15T08:30:00Z",
  "updatedAt": "2024-11-15T08:30:00Z",
  "createdBy": "Anónimo",
  "history": [
    {
      "action": "Creado",
      "timestamp": "2024-11-15T08:30:00Z",
      "user": "Sistema"
    }
  ]
}
```

#### PATCH /api/incidents/:id/assign
Asignar incidente a un administrador
```json
Headers:
Authorization: Bearer <token>

Request:
{
  "assignedTo": "Juan Pérez"
}

Response (200):
{
  "id": "INC-2024-001",
  "assignedTo": "Juan Pérez",
  "updatedAt": "2024-11-15T10:00:00Z",
  "message": "Incidente asignado exitosamente"
}
```

#### PATCH /api/incidents/:id/status
Cambiar estado de un incidente
```json
Headers:
Authorization: Bearer <token>

Request:
{
  "status": "en-proceso",
  "updatedBy": "Juan Pérez"
}

Response (200):
{
  "id": "INC-2024-001",
  "status": "en-proceso",
  "updatedAt": "2024-11-15T10:15:00Z",
  "message": "Estado actualizado exitosamente"
}
```

#### GET /api/incidents/stats
Obtener estadísticas de incidentes
```json
Headers:
Authorization: Bearer <token>

Response (200):
{
  "total": 100,
  "pendientes": 25,
  "enProceso": 40,
  "resueltos": 30,
  "cerrados": 5,
  "byType": {
    "Infraestructura": 30,
    "Servicio": 25,
    "Tecnología": 20,
    "Seguridad": 15,
    "Emergencia": 10
  },
  "byUrgency": {
    "baja": 20,
    "media": 40,
    "alta": 30,
    "critica": 10
  }
}
```

## 🔄 WebSocket (Tiempo Real)

Para implementar actualizaciones en tiempo real:

### Conexión WebSocket
```javascript
// Conectar al WebSocket
const ws = new WebSocket('ws://your-api.com/ws');

// Autenticación
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));

// Escuchar eventos
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'incident_created':
      // Nuevo incidente creado
      break;
    case 'incident_updated':
      // Incidente actualizado
      break;
    case 'incident_assigned':
      // Incidente asignado
      break;
    case 'status_changed':
      // Estado cambiado
      break;
  }
};
```

### Eventos WebSocket

#### incident_created
```json
{
  "type": "incident_created",
  "incident": {
    "id": "INC-2024-001",
    "type": "Infraestructura",
    "location": "Edificio A - Piso 3",
    "urgency": "alta",
    "status": "pendiente",
    "createdAt": "2024-11-15T08:30:00Z"
  }
}
```

#### incident_updated
```json
{
  "type": "incident_updated",
  "incidentId": "INC-2024-001",
  "changes": {
    "status": "en-proceso",
    "assignedTo": "Juan Pérez"
  },
  "updatedAt": "2024-11-15T10:00:00Z"
}
```

## 📊 Estructura de Datos

### Incident Object
```typescript
interface Incident {
  id: string;                    // INC-2024-XXX
  type: string;                  // Infraestructura, Servicio, etc.
  location: string;              // Edificio X - Piso Y
  description: string;           // Descripción del problema
  urgency: 'baja' | 'media' | 'alta' | 'critica';
  status: 'pendiente' | 'en-proceso' | 'resuelto' | 'cerrado';
  assignedTo: string | null;     // Nombre del admin o null
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  createdBy: string;             // Anónimo o ID de usuario
  history: HistoryEntry[];       // Historial de cambios
}

interface HistoryEntry {
  action: string;                // Descripción de la acción
  timestamp: string;             // ISO 8601 timestamp
  user: string;                  // Usuario que realizó la acción
}
```

## 🎨 Colores y Tema

### Colores Principales
- **UTEC Blue**: `#003366`
- **UTEC Orange**: `#FF6B35`

### Estados
- **Pendiente**: Gris (🔴)
- **En Proceso**: Azul (🟡)
- **Resuelto**: Verde (🟢)
- **Cerrado**: Gris oscuro (⚫)

### Urgencias
- **Baja**: Verde
- **Media**: Amarillo
- **Alta**: Naranja
- **Crítica**: Rojo

## 🔐 Autenticación

El frontend actualmente usa autenticación mock. Para integración con backend:

1. Al hacer login exitoso, almacenar el token JWT en localStorage
2. Incluir el token en todas las peticiones con header `Authorization: Bearer <token>`
3. Manejar expiración de token (401) y redirigir a login
4. Implementar refresh token si es necesario

## 📦 Dependencias Principales

- **React 18.3**: Framework UI
- **React Router DOM 6.26**: Navegación SPA
- **TailwindCSS 3.4**: Estilos utility-first
- **Vite 5.4**: Build tool y dev server

## 🚀 Próximos Pasos para Backend

1. **Configurar AWS Amplify** para hosting del frontend
2. **Crear API Gateway** con endpoints REST
3. **Implementar Lambda functions** para lógica de negocio
4. **Configurar DynamoDB** para almacenamiento de incidentes
5. **Implementar API Gateway WebSocket** para tiempo real
6. **Configurar Amazon Cognito** para autenticación
7. **Setup S3** para almacenamiento de imágenes (opcional)
8. **Configurar Apache Airflow** para orquestación
9. **Implementar notificaciones** (SES para email, SNS para SMS)
10. **Integrar SageMaker** para análisis predictivo (opcional)

## 📝 Notas

- Todos los comentarios `// En producción: ...` indican dónde se deben hacer llamadas API reales
- La data mock está en `src/mockData.js` para facilitar desarrollo
- El frontend está preparado para ser totalmente serverless
- Se recomienda implementar paginación en la tabla de incidentes
- Considerar implementar upload de imágenes para evidencia de incidentes
