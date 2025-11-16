# AlertaUTEC - Especificación de Microservicios

**Fecha:** 15 de Noviembre, 2025  
**Proyecto:** Sistema de Gestión de Incidentes UTEC  
**Arquitectura:** Serverless (AWS Lambda + API Gateway + DynamoDB)

---

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Microservicios y Lambdas](#microservicios-y-lambdas)
4. [Modelos de Datos](#modelos-de-datos)
5. [API Endpoints](#api-endpoints)
6. [Flujos de Trabajo](#flujos-de-trabajo)

---

## Resumen Ejecutivo

Se propone una arquitectura serverless con **5 microservicios principales** y **15 funciones Lambda** en total. Esto optimiza costos, reduce complejidad y mantiene la escalabilidad.

### Microservicios
1. **Auth Service** - Autenticación de administradores (2 Lambdas)
2. **Incidents Service** - Gestión completa de incidentes (6 Lambdas)
3. **Notification Service** - Envío de notificaciones (2 Lambdas)
4. **WebSocket Service** - Actualizaciones en tiempo real (3 Lambdas)
5. **Analytics Service** - Estadísticas y reportes (2 Lambdas)

**Total: 15 Funciones Lambda**

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                     CloudFront CDN                       │
│                  (Distribución Frontend)                 │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    S3 Bucket                            │
│               (Frontend React/Vite)                      │
└─────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   API Gateway                            │
│            REST API + WebSocket API                      │
└─┬──────┬──────┬──────┬──────┬──────────────────────────┘
  │      │      │      │      │
  │      │      │      │      └──────┐
  │      │      │      │             │
┌─▼──────▼──────▼──────▼──────▼─────▼─────────────────────┐
│              Lambda Functions (15 total)                 │
│  Auth | Incidents | Notifications | WebSocket | Analytics│
└─┬────────────────────┬─────────────┬────────────────────┘
  │                    │             │
┌─▼────────────────────▼─────────────▼────────────────────┐
│  DynamoDB Tables     │ SES/SNS     │ CloudWatch          │
│  • Incidents         │ (Notif.)    │ (Logs/Metrics)      │
│  • Users             │             │                     │
│  • WebSocketConn     │             │                     │
└──────────────────────┴─────────────┴────────────────────┘
```

---

## Microservicios y Lambdas

### 1. Auth Service
**Propósito:** Gestión de autenticación y autorización de administradores

#### Lambda 1.1: `auth-login`
**Descripción:** Autentica administradores y genera JWT tokens

**Trigger:** API Gateway POST `/api/auth/login`

**Input:**
```json
{
  "email": "string (required, formato email @utec.edu.pe)",
  "password": "string (required, min 6 caracteres)"
}
```

**Output Success (200):**
```json
{
  "success": true,
  "token": "string (JWT token válido por 24h)",
  "refreshToken": "string (válido por 7 días)",
  "user": {
    "id": "string (UUID)",
    "name": "string",
    "email": "string",
    "role": "string (admin | super-admin)"
  }
}
```

**Output Error (401):**
```json
{
  "success": false,
  "error": "Credenciales incorrectas",
  "code": "INVALID_CREDENTIALS"
}
```

**Lógica:**
1. Validar formato de email y password
2. Buscar usuario en DynamoDB (tabla `Users`)
3. Comparar password hasheado (bcrypt)
4. Generar JWT con payload: `{ userId, email, role }`
5. Generar refresh token
6. Retornar tokens y datos de usuario

**DynamoDB Query:**
- Tabla: `Users`
- Operación: `GetItem`
- Key: `email`

---

#### Lambda 1.2: `auth-validate`
**Descripción:** Valida tokens JWT (usado como authorizer)

**Trigger:** API Gateway Authorizer (todas las rutas `/api/*` excepto login y crear incidente)

**Input:**
```json
{
  "authorizationToken": "Bearer <jwt_token>",
  "methodArn": "string (ARN del recurso solicitado)"
}
```

**Output:**
```json
{
  "principalId": "string (userId)",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [{
      "Action": "execute-api:Invoke",
      "Effect": "Allow|Deny",
      "Resource": "string"
    }]
  },
  "context": {
    "userId": "string",
    "email": "string",
    "role": "string"
  }
}
```

**Lógica:**
1. Extraer token del header
2. Verificar firma JWT
3. Validar expiración
4. Retornar policy de acceso

---

### 2. Incidents Service
**Propósito:** Gestión completa del ciclo de vida de incidentes

#### Lambda 2.1: `incidents-create`
**Descripción:** Crea nuevo incidente (público, sin autenticación)

**Trigger:** API Gateway POST `/api/incidents`

**Input:**
```json
{
  "type": "string (required, enum: Infraestructura|Servicio|Tecnología|Seguridad|Emergencia|Mantenimiento|Otro)",
  "location": "string (required, debe existir en lista predefinida)",
  "description": "string (required, min 20 caracteres, max 500)",
  "urgency": "string (required, enum: baja|media|alta|critica)",
  "contactEmail": "string (optional, para notificaciones)",
  "images": ["string (optional, URLs de S3)"]
}
```

**Output Success (201):**
```json
{
  "success": true,
  "incident": {
    "id": "string (INC-YYYY-###)",
    "trackingCode": "string (mismo que id)",
    "type": "string",
    "location": "string",
    "description": "string",
    "urgency": "string",
    "status": "string (siempre 'pendiente' al crear)",
    "assignedTo": null,
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "createdBy": "string (siempre 'Anónimo')",
    "history": [{
      "action": "string (Incidente creado)",
      "timestamp": "string (ISO 8601)",
      "user": "string (Sistema)"
    }]
  }
}
```

**Lógica:**
1. Validar datos de entrada
2. Generar ID único: `INC-${año}-${contador incremental de 3 dígitos}`
3. Crear objeto de incidente con status 'pendiente'
4. Guardar en DynamoDB
5. **Trigger:** Enviar evento a WebSocket (nuevo incidente)
6. **Trigger:** Enviar notificación si urgencia es 'critica' o 'alta'
7. Retornar incidente creado

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `PutItem`
- Tabla: `Counters` (para generar ID secuencial)
- Operación: `UpdateItem` con `ADD counter 1`

---

#### Lambda 2.2: `incidents-list`
**Descripción:** Lista y filtra incidentes (requiere autenticación)

**Trigger:** API Gateway GET `/api/incidents`

**Authentication:** Required (JWT)

**Input (Query Params):**
```typescript
{
  status?: "pendiente" | "en-proceso" | "resuelto" | "cerrado" | "all"
  urgency?: "baja" | "media" | "alta" | "critica" | "all"
  type?: string
  location?: string
  assignedTo?: string | "unassigned"
  search?: string  // Busca en description, location, type
  page?: number    // Default: 1
  limit?: number   // Default: 20, Max: 100
  sortBy?: "createdAt" | "updatedAt" | "urgency"
  sortOrder?: "asc" | "desc"  // Default: desc
}
```

**Output Success (200):**
```json
{
  "success": true,
  "incidents": [
    {
      "id": "string",
      "type": "string",
      "location": "string",
      "description": "string",
      "urgency": "string",
      "status": "string",
      "assignedTo": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "total": "number (total de incidentes que cumplen filtro)",
    "page": "number (página actual)",
    "limit": "number (items por página)",
    "totalPages": "number (total de páginas)",
    "hasNext": "boolean",
    "hasPrev": "boolean"
  }
}
```

**Lógica:**
1. Validar parámetros de query
2. Construir filtros para DynamoDB
3. Ejecutar Scan o Query con filtros
4. Aplicar búsqueda de texto si existe `search`
5. Paginar resultados
6. Retornar lista

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `Scan` con FilterExpression
- Consideración: Usar índice secundario (GSI) para filtros comunes

---

#### Lambda 2.3: `incidents-get-by-id`
**Descripción:** Obtiene detalle completo de un incidente

**Trigger:** API Gateway GET `/api/incidents/{id}`

**Authentication:** Required (JWT)

**Input:**
```typescript
{
  id: string  // Path parameter (INC-2024-001)
}
```

**Output Success (200):**
```json
{
  "success": true,
  "incident": {
    "id": "string",
    "type": "string",
    "location": "string",
    "description": "string",
    "urgency": "string",
    "status": "string",
    "assignedTo": "string | null",
    "contactEmail": "string | null",
    "images": ["string"],
    "createdAt": "string",
    "updatedAt": "string",
    "createdBy": "string",
    "history": [
      {
        "action": "string",
        "timestamp": "string",
        "user": "string",
        "details": "object (opcional, datos adicionales del cambio)"
      }
    ]
  }
}
```

**Output Error (404):**
```json
{
  "success": false,
  "error": "Incidente no encontrado",
  "code": "INCIDENT_NOT_FOUND"
}
```

**Lógica:**
1. Validar formato de ID
2. Buscar en DynamoDB por PK
3. Retornar incidente con historial completo

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `GetItem`
- Key: `id`

---

#### Lambda 2.4: `incidents-assign`
**Descripción:** Asigna un incidente a un administrador

**Trigger:** API Gateway PATCH `/api/incidents/{id}/assign`

**Authentication:** Required (JWT)

**Input:**
```json
{
  "assignedTo": "string (required, nombre del admin, debe coincidir con admin autenticado)",
  "autoAssign": "boolean (optional, si es true, asigna al admin actual)"
}
```

**Output Success (200):**
```json
{
  "success": true,
  "incident": {
    "id": "string",
    "assignedTo": "string",
    "status": "string (cambia automáticamente a 'en-proceso')",
    "updatedAt": "string"
  },
  "message": "Incidente asignado exitosamente"
}
```

**Output Error (409):**
```json
{
  "success": false,
  "error": "Este incidente ya está asignado",
  "code": "ALREADY_ASSIGNED",
  "assignedTo": "string"
}
```

**Lógica:**
1. Validar que incidente existe
2. Verificar que NO esté ya asignado
3. Asignar a admin (del body o del contexto JWT)
4. Cambiar status a 'en-proceso' automáticamente
5. Agregar entrada al historial
6. **Trigger:** Enviar evento WebSocket (incidente asignado)
7. **Trigger:** Enviar notificación al admin asignado
8. Retornar incidente actualizado

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `UpdateItem` con ConditionExpression `assignedTo = null`
- Si falla la condición, retornar error 409

---

#### Lambda 2.5: `incidents-update-status`
**Descripción:** Cambia el estado de un incidente

**Trigger:** API Gateway PATCH `/api/incidents/{id}/status`

**Authentication:** Required (JWT)

**Input:**
```json
{
  "status": "string (required, enum: pendiente|en-proceso|resuelto|cerrado)",
  "notes": "string (optional, notas sobre el cambio)"
}
```

**Output Success (200):**
```json
{
  "success": true,
  "incident": {
    "id": "string",
    "status": "string",
    "updatedAt": "string"
  },
  "message": "Estado actualizado exitosamente"
}
```

**Output Error (400):**
```json
{
  "success": false,
  "error": "Transición de estado no válida",
  "code": "INVALID_STATUS_TRANSITION",
  "currentStatus": "string",
  "attemptedStatus": "string"
}
```

**Validaciones de Transición:**
- `pendiente` → `en-proceso`, `cerrado`
- `en-proceso` → `resuelto`, `pendiente`
- `resuelto` → `cerrado`, `en-proceso`
- `cerrado` → (no permite cambios)

**Lógica:**
1. Validar que incidente existe
2. Validar transición de estado
3. Actualizar status
4. Agregar entrada al historial con notas
5. **Trigger:** Enviar evento WebSocket (status cambiado)
6. **Trigger:** Notificar si se marca como resuelto/cerrado
7. Retornar incidente actualizado

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `UpdateItem`

---

#### Lambda 2.6: `incidents-get-stats`
**Descripción:** Obtiene estadísticas agregadas de incidentes

**Trigger:** API Gateway GET `/api/incidents/stats`

**Authentication:** Required (JWT)

**Input (Query Params):**
```typescript
{
  period?: "today" | "week" | "month" | "year" | "all"  // Default: all
  groupBy?: "type" | "location" | "urgency" | "status" | "assignedTo"
}
```

**Output Success (200):**
```json
{
  "success": true,
  "stats": {
    "total": "number",
    "byStatus": {
      "pendiente": "number",
      "en-proceso": "number",
      "resuelto": "number",
      "cerrado": "number"
    },
    "byUrgency": {
      "baja": "number",
      "media": "number",
      "alta": "number",
      "critica": "number"
    },
    "byType": {
      "Infraestructura": "number",
      "Servicio": "number",
      "Tecnología": "number",
      "...": "number"
    },
    "byLocation": {
      "Edificio A - Piso 1": "number",
      "...": "number"
    },
    "topAssignees": [
      {
        "name": "string",
        "count": "number",
        "resolved": "number",
        "inProgress": "number"
      }
    ],
    "averageResolutionTime": "number (horas)",
    "period": {
      "start": "string (ISO 8601)",
      "end": "string (ISO 8601)"
    }
  }
}
```

**Lógica:**
1. Determinar rango de fechas según `period`
2. Escanear incidentes en ese rango
3. Agregar datos en memoria
4. Calcular promedios y totales
5. Retornar estadísticas

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `Scan` con FilterExpression para fechas
- Consideración: Cachear resultado en CloudFront o ElastiCache por 5 minutos

---

### 3. Notification Service
**Propósito:** Envío de notificaciones por email y SMS

#### Lambda 3.1: `notification-send`
**Descripción:** Envía notificaciones según tipo y urgencia

**Trigger:** 
- EventBridge (eventos de DynamoDB Streams)
- Invocación directa desde otras Lambdas

**Input:**
```json
{
  "type": "string (enum: incident_created|incident_assigned|status_changed|incident_critical)",
  "incidentId": "string",
  "urgency": "string",
  "recipients": [
    {
      "email": "string (optional)",
      "phone": "string (optional, formato +51XXXXXXXXX)"
    }
  ],
  "data": {
    "incidentType": "string",
    "location": "string",
    "description": "string",
    "assignedTo": "string (optional)",
    "status": "string (optional)"
  }
}
```

**Output:**
```json
{
  "success": true,
  "sent": {
    "email": "number (cantidad enviada)",
    "sms": "number (cantidad enviada)"
  },
  "messageIds": ["string (IDs de SES/SNS)"]
}
```

**Lógica:**
1. Determinar template según `type`
2. Renderizar mensaje con datos del incidente
3. **Email:** Usar AWS SES para enviar correos
4. **SMS:** Usar AWS SNS para urgencia 'critica' o 'alta'
5. Log de notificaciones enviadas
6. Retornar resultado

**Reglas de Notificación:**
- `incident_created` + `urgency: critica|alta` → Email + SMS a admins
- `incident_assigned` → Email al admin asignado
- `status_changed` → Email al admin responsable
- `incident_critical` → Email + SMS a todos los admins

**AWS Services:**
- SES: Envío de emails
- SNS: Envío de SMS
- DynamoDB: Guardar log en tabla `NotificationLogs`

---

#### Lambda 3.2: `notification-get-preferences`
**Descripción:** Obtiene preferencias de notificación de un admin

**Trigger:** API Gateway GET `/api/notifications/preferences`

**Authentication:** Required (JWT)

**Output:**
```json
{
  "success": true,
  "preferences": {
    "userId": "string",
    "email": {
      "enabled": "boolean",
      "incidentCreated": "boolean",
      "incidentAssigned": "boolean",
      "statusChanged": "boolean"
    },
    "sms": {
      "enabled": "boolean",
      "onlyCritical": "boolean"
    },
    "push": {
      "enabled": "boolean"
    }
  }
}
```

**Lógica:**
1. Obtener userId del contexto JWT
2. Buscar preferencias en DynamoDB
3. Retornar configuración

**DynamoDB Operations:**
- Tabla: `NotificationPreferences`
- Operación: `GetItem`

---

### 4. WebSocket Service
**Propósito:** Actualizaciones en tiempo real para el dashboard administrativo

#### Lambda 4.1: `websocket-connect`
**Descripción:** Maneja nuevas conexiones WebSocket

**Trigger:** API Gateway WebSocket $connect

**Input:**
```json
{
  "requestContext": {
    "connectionId": "string",
    "routeKey": "$connect"
  },
  "queryStringParameters": {
    "token": "string (JWT token para autenticación)"
  }
}
```

**Output:**
```json
{
  "statusCode": 200,
  "body": "Connected"
}
```

**Lógica:**
1. Extraer y validar JWT token
2. Guardar connectionId en DynamoDB
3. Asociar userId con connectionId
4. Retornar 200 para aceptar conexión

**DynamoDB Operations:**
- Tabla: `WebSocketConnections`
- Operación: `PutItem`
- Item: `{ connectionId, userId, connectedAt, expiresAt }`

---

#### Lambda 4.2: `websocket-disconnect`
**Descripción:** Maneja desconexiones

**Trigger:** API Gateway WebSocket $disconnect

**Input:**
```json
{
  "requestContext": {
    "connectionId": "string",
    "routeKey": "$disconnect"
  }
}
```

**Output:**
```json
{
  "statusCode": 200,
  "body": "Disconnected"
}
```

**Lógica:**
1. Eliminar connectionId de DynamoDB
2. Retornar 200

**DynamoDB Operations:**
- Tabla: `WebSocketConnections`
- Operación: `DeleteItem`

---

#### Lambda 4.3: `websocket-broadcast`
**Descripción:** Envía actualizaciones a todos los clientes conectados

**Trigger:** 
- EventBridge (eventos de cambios en incidentes)
- Invocación directa desde otras Lambdas

**Input:**
```json
{
  "event": "string (enum: incident_created|incident_updated|incident_assigned|status_changed)",
  "data": {
    "incidentId": "string",
    "type": "string (optional)",
    "location": "string (optional)",
    "urgency": "string (optional)",
    "status": "string (optional)",
    "assignedTo": "string (optional)",
    "timestamp": "string (ISO 8601)"
  },
  "targetUsers": ["string (optional, userIds específicos)"] // Si null, broadcast a todos
}
```

**Output:**
```json
{
  "success": true,
  "sent": "number (cantidad de conexiones que recibieron el mensaje)",
  "failed": "number (cantidad de errores)"
}
```

**Lógica:**
1. Obtener todas las conexiones activas de DynamoDB
2. Filtrar por `targetUsers` si se especifica
3. Construir mensaje JSON
4. Enviar a cada connectionId usando API Gateway Management API
5. Eliminar conexiones stale (si falla el envío)
6. Retornar resultado

**DynamoDB Operations:**
- Tabla: `WebSocketConnections`
- Operación: `Scan` (o Query si tiene índice por userId)

**AWS Services:**
- API Gateway Management API: `postToConnection()`

---

### 5. Analytics Service
**Propósito:** Análisis avanzado y generación de reportes

#### Lambda 5.1: `analytics-generate-report`
**Descripción:** Genera reporte detallado en formato PDF o CSV

**Trigger:** 
- API Gateway POST `/api/analytics/report`
- EventBridge (scheduled, para reportes automáticos)

**Authentication:** Required (JWT)

**Input:**
```json
{
  "format": "string (enum: pdf|csv|json)",
  "period": "string (enum: today|week|month|quarter|year|custom)",
  "startDate": "string (ISO 8601, required si period=custom)",
  "endDate": "string (ISO 8601, required si period=custom)",
  "filters": {
    "type": ["string"],
    "location": ["string"],
    "urgency": ["string"],
    "status": ["string"]
  },
  "includeGraphs": "boolean (solo para PDF)",
  "email": "string (optional, enviar por email)"
}
```

**Output Success (200):**
```json
{
  "success": true,
  "report": {
    "id": "string (UUID)",
    "format": "string",
    "period": "string",
    "generatedAt": "string (ISO 8601)",
    "downloadUrl": "string (URL presignada de S3, válida por 1 hora)",
    "expiresAt": "string (ISO 8601)",
    "summary": {
      "totalIncidents": "number",
      "resolved": "number",
      "pending": "number",
      "averageResolutionTime": "number (horas)"
    }
  }
}
```

**Lógica:**
1. Validar parámetros
2. Obtener datos de incidentes según filtros
3. Procesar y agregar datos
4. Generar archivo según formato:
   - **PDF:** Usar biblioteca como pdfkit o puppeteer
   - **CSV:** Generar string CSV
   - **JSON:** Retornar datos estructurados
5. Subir a S3 bucket
6. Generar URL presignada
7. Si `email` está presente, enviar notificación
8. Retornar URL de descarga

**AWS Services:**
- S3: Almacenamiento de reportes
- SES: Envío de reporte por email (opcional)

---

#### Lambda 5.2: `analytics-dashboard-metrics`
**Descripción:** Métricas en tiempo real para el dashboard (optimizado)

**Trigger:** API Gateway GET `/api/analytics/dashboard`

**Authentication:** Required (JWT)

**Input (Query Params):**
```typescript
{
  refresh?: boolean  // Force refresh cache
}
```

**Output Success (200):**
```json
{
  "success": true,
  "metrics": {
    "overview": {
      "total": "number",
      "pendientes": "number",
      "enProceso": "number",
      "resueltos": "number",
      "cerrados": "number"
    },
    "trends": {
      "last7Days": [
        {
          "date": "string (YYYY-MM-DD)",
          "created": "number",
          "resolved": "number"
        }
      ],
      "percentageChange": {
        "created": "number (%, vs semana anterior)",
        "resolved": "number (%, vs semana anterior)"
      }
    },
    "hotspots": [
      {
        "location": "string",
        "count": "number",
        "urgencyBreakdown": {
          "critica": "number",
          "alta": "number",
          "media": "number",
          "baja": "number"
        }
      }
    ],
    "topPerformers": [
      {
        "adminName": "string",
        "resolved": "number",
        "avgResolutionTime": "number (horas)"
      }
    ],
    "cachedAt": "string (ISO 8601)",
    "ttl": "number (segundos hasta próxima actualización)"
  }
}
```

**Lógica:**
1. Verificar si existe datos en caché (DynamoDB o ElastiCache)
2. Si caché válido y no se fuerza refresh, retornar caché
3. Si no, calcular métricas:
   - Escanear incidentes de últimos 30 días
   - Agregar datos por fecha, ubicación, admin
   - Calcular tendencias
4. Guardar en caché con TTL de 5 minutos
5. Retornar métricas

**DynamoDB Operations:**
- Tabla: `Incidents`
- Operación: `Query` con índice por fecha
- Tabla: `MetricsCache`
- Operación: `GetItem` / `PutItem`

---

## Modelos de Datos

### DynamoDB Tables

#### Tabla: `Incidents`
**Partition Key:** `id` (String)

```typescript
{
  id: string                    // "INC-2024-001"
  type: string                  // "Infraestructura"
  location: string              // "Edificio A - Piso 3"
  description: string           // Descripción del problema
  urgency: string               // "baja"|"media"|"alta"|"critica"
  status: string                // "pendiente"|"en-proceso"|"resuelto"|"cerrado"
  assignedTo: string | null     // Nombre del admin
  contactEmail: string | null   // Email de contacto (opcional)
  images: string[]              // URLs de S3
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
  createdBy: string             // "Anónimo" o userId
  history: Array<{
    action: string
    timestamp: string
    user: string
    details?: object
  }>
  
  // Campos para búsqueda/filtrado
  statusUrgency: string         // GSI: "pendiente#alta"
  createdAtTimestamp: number    // GSI: timestamp numérico
}
```

**Global Secondary Indexes (GSI):**
1. **StatusIndex:** 
   - PK: `status`
   - SK: `createdAtTimestamp`
   - Uso: Filtrar por estado y ordenar por fecha

2. **UrgencyIndex:**
   - PK: `urgency`
   - SK: `createdAtTimestamp`
   - Uso: Filtrar por urgencia

3. **AssignedToIndex:**
   - PK: `assignedTo`
   - SK: `updatedAtTimestamp`
   - Uso: Ver incidentes de un admin

---

#### Tabla: `Users`
**Partition Key:** `email` (String)

```typescript
{
  id: string                    // UUID
  email: string                 // "admin@utec.edu.pe"
  passwordHash: string          // bcrypt hash
  name: string                  // "Juan Pérez"
  role: string                  // "admin"|"super-admin"
  phone: string | null          // "+51999999999"
  active: boolean               // true
  createdAt: string             // ISO 8601
  lastLogin: string | null      // ISO 8601
}
```

---

#### Tabla: `WebSocketConnections`
**Partition Key:** `connectionId` (String)

```typescript
{
  connectionId: string          // ID de la conexión WebSocket
  userId: string                // ID del usuario conectado
  connectedAt: string           // ISO 8601
  expiresAt: number             // TTL en epoch seconds (2 horas)
}
```

**TTL Enabled:** Campo `expiresAt` (limpieza automática)

---

#### Tabla: `Counters`
**Partition Key:** `name` (String)

```typescript
{
  name: string                  // "incident_counter"
  value: number                 // 152
  year: number                  // 2024
}
```

**Uso:** Generar IDs secuenciales para incidentes

---

#### Tabla: `NotificationLogs`
**Partition Key:** `id` (String)
**Sort Key:** `timestamp` (Number)

```typescript
{
  id: string                    // UUID
  timestamp: number             // Epoch timestamp
  incidentId: string            // "INC-2024-001"
  type: string                  // "incident_created"
  recipient: string             // Email o teléfono
  channel: string               // "email"|"sms"
  status: string                // "sent"|"failed"
  messageId: string | null      // ID de SES/SNS
  error: string | null          // Error si falló
}
```

---

#### Tabla: `NotificationPreferences`
**Partition Key:** `userId` (String)

```typescript
{
  userId: string
  email: {
    enabled: boolean
    incidentCreated: boolean
    incidentAssigned: boolean
    statusChanged: boolean
  }
  sms: {
    enabled: boolean
    onlyCritical: boolean
  }
  push: {
    enabled: boolean
  }
}
```

---

#### Tabla: `MetricsCache`
**Partition Key:** `cacheKey` (String)

```typescript
{
  cacheKey: string              // "dashboard_metrics"
  data: object                  // JSON con métricas
  cachedAt: string              // ISO 8601
  expiresAt: number             // TTL epoch
}
```

**TTL Enabled:** Campo `expiresAt`

---

## API Endpoints

### Autenticación
| Método | Endpoint | Auth | Lambda | Descripción |
|--------|----------|------|--------|-------------|
| POST | `/api/auth/login` | No | auth-login | Login de administradores |

### Incidentes
| Método | Endpoint | Auth | Lambda | Descripción |
|--------|----------|------|--------|-------------|
| POST | `/api/incidents` | No | incidents-create | Crear incidente (público) |
| GET | `/api/incidents` | Sí | incidents-list | Listar incidentes con filtros |
| GET | `/api/incidents/{id}` | Sí | incidents-get-by-id | Detalle de incidente |
| PATCH | `/api/incidents/{id}/assign` | Sí | incidents-assign | Asignar incidente |
| PATCH | `/api/incidents/{id}/status` | Sí | incidents-update-status | Cambiar estado |
| GET | `/api/incidents/stats` | Sí | incidents-get-stats | Estadísticas |

### Notificaciones
| Método | Endpoint | Auth | Lambda | Descripción |
|--------|----------|------|--------|-------------|
| GET | `/api/notifications/preferences` | Sí | notification-get-preferences | Preferencias de notificación |

### Analytics
| Método | Endpoint | Auth | Lambda | Descripción |
|--------|----------|------|--------|-------------|
| POST | `/api/analytics/report` | Sí | analytics-generate-report | Generar reporte |
| GET | `/api/analytics/dashboard` | Sí | analytics-dashboard-metrics | Métricas dashboard |

### WebSocket
| Ruta | Lambda | Descripción |
|------|--------|-------------|
| `$connect` | websocket-connect | Conectar WebSocket |
| `$disconnect` | websocket-disconnect | Desconectar WebSocket |

---

## Flujos de Trabajo

### Flujo 1: Usuario Reporta Incidente

```
1. Usuario llena formulario en frontend
   ↓
2. POST /api/incidents
   ↓
3. Lambda: incidents-create
   - Valida datos
   - Genera ID (INC-2024-XXX)
   - Guarda en DynamoDB
   ↓
4. Si urgencia es ALTA o CRITICA:
   - Invoca: notification-send
   - Envía email + SMS a admins
   ↓
5. Invoca: websocket-broadcast
   - Notifica a admins conectados en tiempo real
   ↓
6. Retorna código de seguimiento al usuario
```

---

### Flujo 2: Admin Asigna Incidente

```
1. Admin hace clic en "Asignarme" en dashboard
   ↓
2. PATCH /api/incidents/{id}/assign
   ↓
3. Lambda: incidents-assign
   - Valida que no esté asignado
   - Asigna al admin
   - Cambia status a "en-proceso"
   - Actualiza historial
   ↓
4. Invoca: websocket-broadcast
   - Notifica cambio a todos los admins conectados
   ↓
5. Invoca: notification-send
   - Envía email de confirmación al admin
   ↓
6. Retorna incidente actualizado
```

---

### Flujo 3: Admin Cambia Estado a Resuelto

```
1. Admin cambia estado a "resuelto"
   ↓
2. PATCH /api/incidents/{id}/status
   ↓
3. Lambda: incidents-update-status
   - Valida transición
   - Actualiza status
   - Actualiza historial
   - Calcula tiempo de resolución
   ↓
4. Invoca: websocket-broadcast
   - Actualiza dashboard en tiempo real
   ↓
5. Si hay contactEmail:
   - Invoca: notification-send
   - Envía email al reportante
   ↓
6. Actualiza métricas en caché
   ↓
7. Retorna incidente actualizado
```

---

### Flujo 4: Dashboard Carga Métricas

```
1. Admin abre dashboard
   ↓
2. GET /api/analytics/dashboard
   ↓
3. Lambda: analytics-dashboard-metrics
   - Verifica caché (TTL: 5 min)
   ↓
4A. Si caché válido:
   - Retorna datos en caché
   ↓
4B. Si caché expiró:
   - Query DynamoDB (últimos 30 días)
   - Calcula métricas
   - Guarda en caché
   - Retorna datos
   ↓
5. Frontend renderiza dashboard
   ↓
6. Conecta WebSocket para actualizaciones en tiempo real
```

---

## Consideraciones Técnicas

### Seguridad
- **JWT:** HS256 con secret en AWS Secrets Manager
- **API Gateway:** Throttling (100 req/s por IP)
- **CORS:** Configurado solo para dominio de frontend
- **DynamoDB:** Encriptación en reposo habilitada
- **Passwords:** Bcrypt con 10 rounds

### Performance
- **Caché:** CloudFront para frontend, DynamoDB TTL para métricas
- **Paginación:** Máximo 100 items por request
- **Índices:** GSI en DynamoDB para queries frecuentes
- **Lambda:** Memory: 512MB, Timeout: 30s (reportes: 5min)

### Costos Estimados (Mensual)
- **Lambda:** ~$5 (1M invocaciones)
- **DynamoDB:** ~$10 (On-demand, 10K writes/day)
- **API Gateway:** ~$3.50 (1M requests)
- **S3:** ~$1 (10GB storage)
- **CloudFront:** ~$5 (50GB transfer)
- **SES/SNS:** ~$5 (1K emails, 100 SMS)

**Total: ~$30-40/mes** (asumiendo uso moderado)

### Escalabilidad
- Lambda escala automáticamente hasta 1000 concurrent executions
- DynamoDB on-demand escala automáticamente
- WebSocket API Gateway soporta hasta 100K conexiones simultáneas

---

## Resumen

**Total de Recursos AWS:**
- ✅ 15 Funciones Lambda
- ✅ 7 Tablas DynamoDB
- ✅ 1 API Gateway REST
- ✅ 1 API Gateway WebSocket
- ✅ 1 S3 Bucket (frontend + reportes)
- ✅ 1 CloudFront Distribution
- ✅ SES + SNS para notificaciones

**Endpoints API:** 11 endpoints REST + 2 rutas WebSocket

Esta arquitectura es **100% serverless**, escalable, y optimizada para costos bajos con alta disponibilidad.
