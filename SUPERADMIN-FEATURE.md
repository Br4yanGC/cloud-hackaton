# Feature: Rol SuperAdministrador

## Resumen
Se implementó un nuevo rol **superadmin** que permite a usuarios con privilegios elevados asignar incidentes a cualquier administrador del sistema basándose en su carga de trabajo actual.

## Características Implementadas

### Backend

#### 1. Auth Lambda - Soporte para Superadmin
- **Archivos modificados:**
  - `backend/auth-lambda/handlers/auth.js`
  - `backend/auth-lambda/utils/dynamodb.js`
  - `backend/auth-lambda/serverless.yml`

- **Cambios realizados:**
  - Modificado el endpoint de registro para aceptar el rol 'superadmin'
  - Creado endpoint `GET /auth/admins` para listar todos los administradores
  - Implementada función `listAdministrators()` que consulta DynamoDB con filtro por rol
  - Requiere autenticación JWT con rol superadmin para acceder a la lista de admins

- **Endpoint nuevo:**
  ```
  GET https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev/auth/admins
  Headers: Authorization: Bearer <token>
  ```

#### 2. Incidents Lambda - Carga de Trabajo y Asignación
- **Archivos modificados:**
  - `backend/incidents-lambda/handlers/incidents.js`
  - `backend/incidents-lambda/serverless.yml`

- **Cambios realizados:**
  - Creado endpoint `GET /incidents/admins-workload` que devuelve:
    - Lista de administradores
    - Número de incidentes activos por administrador
    - Ordenados por carga de trabajo (menor a mayor)
  - Modificada función `assign()` para permitir que superadmin asigne a cualquier administrador
  - Requiere autenticación JWT con rol superadmin

- **Endpoint nuevo:**
  ```
  GET https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com/dev/incidents/admins-workload
  Headers: Authorization: Bearer <token>
  Response: {
    admins: [
      {
        id: "uuid",
        name: "Nombre Admin",
        email: "email@example.com",
        activeCount: 2
      }
    ],
    totalAdmins: 5,
    totalActiveIncidents: 10
  }
  ```

- **Modificación de asignación:**
  ```
  PUT https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com/dev/incidents/{id}/assign
  Body: {
    assignToAdminId: "uuid-del-admin",
    assignedToName: "Nombre del Admin"
  }
  ```

### Frontend

#### 1. Componente SuperAdminDashboard
- **Archivo creado:**
  - `frontend/src/components/SuperAdminDashboard.jsx`

- **Funcionalidades:**
  - Vista similar a AdminDashboard pero con capacidades de asignación
  - Muestra todos los incidentes del sistema
  - Botón "Asignar" en lugar de "Tomar responsabilidad"
  - Modal de asignación que muestra:
    - Lista de administradores ordenados por carga de trabajo
    - Indicador visual de carga (verde: 0, amarillo: 1-2, rojo: 3+)
    - Contador de incidentes activos por administrador
  - Integración con WebSocket para actualizaciones en tiempo real
  - Toast notifications con tema verde
  - Recarga automática de cargas de trabajo al asignar

#### 2. Routing y Navegación
- **Archivo modificado:**
  - `frontend/src/App.jsx`

- **Cambios realizados:**
  - Agregada ruta `/superadmin/dashboard`
  - Protección de ruta para rol superadmin
  - Redirección automática al login para superadmin
  - Importación del componente SuperAdminDashboard

## Flujo de Usuario SuperAdmin

1. **Login:** SuperAdmin inicia sesión con credenciales de rol 'superadmin'
2. **Redirección:** Automáticamente redirigido a `/superadmin/dashboard`
3. **Vista de Incidentes:** Ve todos los incidentes del sistema con filtros
4. **Asignación:**
   - Click en botón "Asignar" de incidente pendiente
   - Se abre modal con lista de administradores
   - Administradores ordenados por menor carga de trabajo
   - Click en administrador seleccionado
   - Incidente asignado instantáneamente
5. **Notificaciones:**
   - Toast notification de confirmación
   - WebSocket notifica al admin asignado
   - WebSocket notifica al estudiante que creó el incidente
   - Actualización en tiempo real de la lista

## Endpoints Desplegados

### Auth Service
- `POST /auth/register` - Registro de usuario (incluye superadmin)
- `POST /auth/login` - Login
- `GET /auth/me` - Obtener perfil
- `POST /auth/validate` - Validar token
- `GET /auth/admins` - Listar administradores (superadmin only)

### Incidents Service
- `POST /incidents` - Crear incidente
- `GET /incidents` - Listar incidentes
- `GET /incidents/{id}` - Obtener incidente
- `PUT /incidents/{id}` - Actualizar incidente
- `PUT /incidents/{id}/assign` - Asignar incidente (admin o superadmin)
- `PUT /incidents/{id}/status` - Cambiar estado
- `DELETE /incidents/{id}` - Eliminar incidente
- `GET /incidents/admins-workload` - Obtener cargas de trabajo (superadmin only)

## Estructura de Datos

### Usuario SuperAdmin
```json
{
  "id": "uuid",
  "email": "superadmin@utec.edu.pe",
  "name": "Super Administrator",
  "role": "superadmin",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Carga de Trabajo
```json
{
  "admins": [
    {
      "id": "admin-uuid-1",
      "name": "Admin 1",
      "email": "admin1@utec.edu.pe",
      "activeCount": 0
    },
    {
      "id": "admin-uuid-2",
      "name": "Admin 2",
      "email": "admin2@utec.edu.pe",
      "activeCount": 3
    }
  ],
  "totalAdmins": 2,
  "totalActiveIncidents": 3
}
```

## Seguridad

- Todos los endpoints requieren JWT token válido
- Endpoints de superadmin verifican rol antes de ejecutar
- No se exponen contraseñas en respuestas de API
- Validación de permisos en cada operación

## Testing

### Crear un SuperAdmin
```bash
curl -X POST https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@utec.edu.pe",
    "password": "SuperAdmin123!",
    "name": "Super Administrator",
    "role": "superadmin"
  }'
```

### Listar Administradores
```bash
curl -X GET https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev/auth/admins \
  -H "Authorization: Bearer <superadmin-token>"
```

### Obtener Cargas de Trabajo
```bash
curl -X GET https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com/dev/incidents/admins-workload \
  -H "Authorization: Bearer <superadmin-token>"
```

### Asignar Incidente
```bash
curl -X PUT https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com/dev/incidents/{id}/assign \
  -H "Authorization: Bearer <superadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assignToAdminId": "admin-uuid",
    "assignedToName": "Admin Name"
  }'
```

## Deployment

- **Backend:** Desplegado exitosamente con Serverless Framework
- **Frontend:** Push a GitHub activa despliegue automático en AWS Amplify
- **WebSocket:** No requiere cambios, funciona con todos los roles

## Estado Actual

✅ Backend desplegado y funcional
✅ Frontend subido a GitHub
🔄 Esperando despliegue automático de Amplify
✅ WebSocket integrado
✅ Toast notifications configuradas

## Próximos Pasos (Opcional)

- Dashboard de métricas de carga de trabajo
- Historial de asignaciones por superadmin
- Reportes de distribución de incidentes
- Reasignación automática en caso de sobrecarga
