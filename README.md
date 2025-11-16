# AlertaUTEC - Sistema de Gestión de Incidentes

Sistema serverless para reportar, monitorear y gestionar incidentes dentro del campus de UTEC.

## 📁 Estructura del Proyecto

```
cloud-hackaton/
├── frontend/           # Aplicación React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── PublicView.jsx       # Vista pública de reportes
│   │   │   ├── AdminLogin.jsx       # Login administrativo
│   │   │   └── AdminDashboard.jsx   # Panel de administración
│   │   ├── mockData.js              # Data estática para desarrollo
│   │   ├── App.jsx                  # Componente principal con routing
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Estilos globales
│   ├── package.json
│   └── README.md                    # Documentación del frontend
│
└── backend/            # (Por implementar - Microservicios serverless)
    ├── api-gateway/    # Configuración API Gateway
    ├── lambdas/        # Funciones Lambda
    ├── airflow/        # DAGs de Apache Airflow
    └── infrastructure/ # IaC (Terraform/CloudFormation)
```

## 🎯 Objetivos del Proyecto

- ✅ **Fase 1**: Frontend estático con data mock (COMPLETADO)
- 🔄 **Fase 2**: Diseño de arquitectura serverless
- 🔄 **Fase 3**: Implementación de microservicios
- 🔄 **Fase 4**: Integración con AWS (Lambda, DynamoDB, S3)
- 🔄 **Fase 5**: WebSockets para tiempo real
- 🔄 **Fase 6**: Orquestación con Airflow
- 🔄 **Fase 7**: Análisis predictivo con SageMaker

## 🚀 Quick Start

```bash
# Navegar al frontend
cd frontend

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📱 Características Implementadas

### Sistema de Autenticación
- Login único para estudiantes y administradores
- Redirección automática según rol
- Protección de rutas basada en roles
- Mock de usuarios con diferentes permisos

### Vista Estudiante
- Dashboard personal con incidentes propios
- Estadísticas personales (total, pendientes, en proceso, resueltos)
- Formulario para reportar nuevos incidentes
- Vista detallada de cada incidente con historial
- Asociación automática del incidente al estudiante que lo crea

### Panel Administrativo
- Dashboard con estadísticas globales
- Tabla de todos los incidentes con filtros avanzados
- Búsqueda por múltiples criterios
- Asignación de incidentes
- Gestión de estados (Pendiente → En Proceso → Resuelto)
- Historial completo de cambios por incidente
- Información del estudiante que reportó cada incidente

## 🔐 Credenciales de Prueba

**Administrador:**
```
Email: admin@utec.edu.pe
Contraseña: admin123
```

**Estudiante:**
```
Email: juan.lopez@utec.edu.pe
Contraseña: estudiante123
```

Usuarios adicionales disponibles en `frontend/src/mockData.js`

## 🏗️ Arquitectura Futura (Serverless)

```
┌─────────────────┐
│   CloudFront    │  ← Distribución del frontend
└────────┬────────┘
         │
┌────────▼────────┐
│  S3/Amplify     │  ← Hosting del frontend
└─────────────────┘
         │
┌────────▼────────┐
│  API Gateway    │  ← REST API + WebSocket
└────────┬────────┘
         │
    ┌────▼────┐
    │  Lambda  │  ← Funciones serverless
    └────┬────┘
         │
    ┌────▼────────────────────┐
    │  DynamoDB  │  S3  │ SES  │  ← Servicios AWS
    └──────────────────────────┘
         │
    ┌────▼────┐
    │ Airflow  │  ← Orquestación de flujos
    └─────────┘
```

## 🔌 APIs a Implementar

Ver documentación completa en `frontend/README.md`

**Endpoints principales:**
- `POST /api/incidents` - Crear incidente
- `GET /api/incidents` - Listar incidentes
- `PATCH /api/incidents/:id/assign` - Asignar incidente
- `PATCH /api/incidents/:id/status` - Cambiar estado
- `POST /api/admin/login` - Autenticación admin
- `WS /ws` - WebSocket para tiempo real

## 📊 Tecnologías

**Frontend:**
- React 18.3
- Vite 5.4
- TailwindCSS 3.4
- React Router 6.26

**Backend (Por implementar):**
- AWS Lambda (Node.js/Python)
- API Gateway (REST + WebSocket)
- DynamoDB
- S3
- Cognito
- Apache Airflow
- AWS SageMaker (opcional)

## 👥 Roles de Usuario

### Estudiante
- Reportar incidentes (requiere autenticación)
- Ver solo sus propios incidentes reportados
- Recibir código de seguimiento
- Ver historial y estado de sus reportes

### Administrador
- Visualizar todos los incidentes del campus
- Asignarse incidentes
- Cambiar estados de incidentes
- Ver historial completo de cada incidente
- Acceso a estadísticas globales
- Ver información del estudiante que reportó cada incidente

## 📈 Próximos Pasos

1. **Diseñar arquitectura serverless detallada**
2. **Crear funciones Lambda para CRUD de incidentes**
3. **Configurar DynamoDB con diseño de tablas**
4. **Implementar autenticación con Cognito**
5. **Setup API Gateway con endpoints REST**
6. **Implementar WebSocket para actualizaciones en tiempo real**
7. **Configurar Airflow para automatizaciones**
8. **Agregar análisis predictivo con SageMaker**

## 📝 Notas

- El frontend está completamente funcional con data mock
- Todos los puntos de integración con APIs están claramente marcados en el código
- La UI está diseñada para ser responsive y accesible
- Se recomienda revisar `frontend/README.md` para detalles técnicos completos

---

**Universidad de Ingeniería y Tecnología (UTEC)**  
Sistema AlertaUTEC v1.0
