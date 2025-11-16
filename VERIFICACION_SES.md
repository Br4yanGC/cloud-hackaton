# Verificación de AWS SES desde la Consola

## Opción 1: Verificar permisos de IAM

1. Ve a la consola de AWS Academy
2. Busca **IAM** en el buscador superior
3. En el menú izquierdo, selecciona **Roles**
4. Busca el rol **LabRole** (es el que usa tu Lambda)
5. Haz clic en el rol y ve a la pestaña **Permissions**
6. Busca si tiene permisos para SES:
   - `ses:SendEmail`
   - `ses:SendRawEmail`
   - `ses:VerifyEmailIdentity`
   
Si NO aparecen estos permisos, entonces AWS Academy tiene SES bloqueado.

## Opción 2: Intentar verificar un email desde la consola SES

1. Ve a la consola de AWS Academy
2. Busca **SES** (Simple Email Service) o **Amazon SES**
3. Si el servicio está disponible:
   - En el menú izquierdo, busca **Verified identities** o **Email Addresses**
   - Intenta verificar tu email: brayan.gomero@utec.edu.pe
   - Haz clic en "Verify a New Email Address"
   
Si NO puedes acceder al servicio SES o te da error de permisos, está bloqueado.

## Opción 3: Revisar logs de CloudWatch

1. Ve a **CloudWatch** en la consola AWS
2. En el menú izquierdo, selecciona **Log groups**
3. Busca el log group: `/aws/lambda/alertautec-notifications-service-dev-sendEmail`
4. Abre los últimos logs
5. Si ves errores como:
   - "not authorized to perform: ses:SendEmail"
   - "not authorized to perform: ses:VerifyEmailIdentity"
   
Entonces SES está bloqueado por AWS Academy.

## Resultado esperado

**AWS Academy bloquea estos servicios:**
- ❌ SNS SMS (confirmado)
- ❌ SES Email (muy probable)

**Pero permite:**
- ✅ DynamoDB
- ✅ Lambda
- ✅ API Gateway
- ✅ WebSocket (API Gateway WebSocket)
- ✅ Notificaciones in-app (funcionan perfectamente)

## Solución alternativa

Si SES está bloqueado, tu sistema de notificaciones actual funciona con:
1. **Notificaciones in-app** ✅ (guardadas en DynamoDB)
2. **WebSocket en tiempo real** ✅ (notificación instantánea)
3. **Badge con contador** ✅
4. **Toast notifications** ✅

Para tener emails en producción, necesitarías usar una cuenta AWS real (no AWS Academy).
