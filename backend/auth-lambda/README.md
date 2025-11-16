# Auth Service - Lambda + DynamoDB + Serverless Framework

Servicio de autenticación serverless para AlertaUTEC usando AWS Lambda, DynamoDB y Serverless Framework.

## 🚀 Características

- ✅ **4 Lambdas:** register, login, getProfile, validateToken
- ✅ **DynamoDB:** Base de datos no relacional creada automáticamente
- ✅ **JWT:** Autenticación con tokens
- ✅ **Serverless Framework:** Deploy con un comando
- ✅ **API Gateway:** Creado automáticamente
- ✅ **CORS:** Configurado para Amplify
- ✅ **IAM Roles:** Generados automáticamente

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Instalar Serverless Framework globalmente (si no lo tienes)
npm install -g serverless
```

## 🔧 Configuración

### 1. Configurar credenciales AWS

```bash
# Opción 1: Con AWS CLI
aws configure

# Opción 2: Con Serverless
serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET
```

### 2. Configurar JWT Secret

Edita `serverless.yml` o usa variable de entorno:

```bash
export JWT_SECRET="your-super-secret-key"
```

## 🚀 Deploy

### Deploy a AWS

```bash
# Deploy a dev (por defecto)
npm run deploy

# Deploy a producción
npm run deploy:prod
```

Después del deploy verás:

```
✔ Service deployed to stack alertautec-auth-dev

endpoints:
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth/register
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth/login
  GET - https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth/me
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth/validate

functions:
  register: alertautec-auth-dev-register
  login: alertautec-auth-dev-login
  getProfile: alertautec-auth-dev-getProfile
  validateToken: alertautec-auth-dev-validateToken
```

### Deploy local (desarrollo)

```bash
npm run offline
```

Esto inicia un servidor local en `http://localhost:3000`

## 📝 Endpoints

### POST /auth/register

Registrar nuevo usuario.

**Request:**
```json
{
  "email": "admin@utec.edu.pe",
  "password": "admin123",
  "name": "Juan Pérez",
  "role": "administrador",
  "code": null
}
```

**Response:**
```json
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@utec.edu.pe",
    "name": "Juan Pérez",
    "role": "administrador",
    "code": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /auth/login

Iniciar sesión.

**Request:**
```json
{
  "email": "admin@utec.edu.pe",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@utec.edu.pe",
    "name": "Juan Pérez",
    "role": "administrador"
  }
}
```

### GET /auth/me

Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@utec.edu.pe",
    "name": "Juan Pérez",
    "role": "administrador"
  }
}
```

### POST /auth/validate

Validar token (para otros microservicios).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@utec.edu.pe",
    "role": "administrador"
  }
}
```

## 🗄️ DynamoDB

### Tabla: Users

**Estructura:**
```javascript
{
  "id": "uuid",              // Partition Key
  "email": "string",         // GSI
  "passwordHash": "string",
  "name": "string",
  "role": "estudiante | administrador",
  "code": "string | null",   // Código UTEC para estudiantes
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "lastLogin": "ISO8601"     // Opcional
}
```

**Índices:**
- Primary Key: `id` (HASH)
- Global Secondary Index: `EmailIndex` (email)

**Billing Mode:** PAY_PER_REQUEST (on-demand, no necesitas provisionar capacidad)

## 🧪 Pruebas

### Con curl:

```bash
# Register
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@utec.edu.pe",
    "password": "test123",
    "name": "Test User",
    "role": "estudiante",
    "code": "202010001"
  }'

# Login
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'

# Get Profile
curl -X GET https://your-api.execute-api.us-east-1.amazonaws.com/dev/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Con Postman:

Importa estos endpoints:
- `POST {{API_URL}}/auth/register`
- `POST {{API_URL}}/auth/login`
- `GET {{API_URL}}/auth/me` (con header Authorization)

## 📊 Logs

Ver logs de una función:

```bash
# Ver logs en tiempo real
serverless logs -f login -t

# Ver logs recientes
serverless logs -f login
```

## 🗑️ Eliminar todo

```bash
npm run remove
```

Esto elimina:
- Todas las Lambdas
- API Gateway
- Tabla DynamoDB
- IAM Roles

## 💰 Costos estimados

Con AWS Free Tier:

| Servicio | Free Tier | Costo después |
|----------|-----------|---------------|
| Lambda | 1M requests/mes | $0.20 por millón |
| DynamoDB | 25GB + 25 WCU + 25 RCU | ~$0.25/GB |
| API Gateway | 1M requests/mes | $3.50 por millón |

**Estimado para UTEC:** ~$0-2/mes (dentro de free tier)

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ JWT tokens con expiración
- ✅ CORS configurado
- ✅ IAM roles con permisos mínimos
- ✅ Secrets en variables de entorno (no en código)

## 🏗️ Estructura del proyecto

```
auth-lambda/
├── handlers/
│   └── auth.js              # 4 Lambdas: register, login, getProfile, validate
├── utils/
│   ├── dynamodb.js          # Funciones DynamoDB
│   └── response.js          # Helpers de respuesta
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── serverless.yml           # Configuración Serverless Framework
```

## 🔗 Integración con Frontend (Amplify)

En tu frontend React, usa la URL del API Gateway:

```javascript
// frontend/src/config.js
export const API_URL = 'https://abc123.execute-api.us-east-1.amazonaws.com/dev';

// frontend/src/components/Login.jsx
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

## 🆘 Troubleshooting

### Error: "User: ... is not authorized to perform: dynamodb:PutItem"

Verifica que las credenciales AWS tengan permisos de DynamoDB.

### Error: "Cannot find module '@aws-sdk/client-dynamodb'"

Ejecuta `npm install`

### Cold start lento

Primera invocación puede tardar 1-2 segundos. Invocaciones posteriores son <100ms.

## 📚 Recursos

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
