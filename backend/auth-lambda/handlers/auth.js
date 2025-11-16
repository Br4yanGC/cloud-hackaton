const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUser, createUser, getUserByEmail, listAdministrators } = require('../utils/dynamodb');
const { success, error, validate } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Lambda: Register new user
module.exports.register = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, name, role, code, phoneNumber, email_notification } = body;

    // Validación básica
    if (!email || !password || !name || !role) {
      return error(400, 'Email, password, name y role son requeridos');
    }

    if (!['estudiante', 'administrador', 'superadmin'].includes(role)) {
      return error(400, 'Role debe ser "estudiante", "administrador" o "superadmin"');
    }

    if (password.length < 6) {
      return error(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    // Validar formato de teléfono si se proporciona
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      return error(400, 'El número de teléfono debe estar en formato E.164 (+51999999999)');
    }

    // Verificar si el email ya existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return error(409, 'El email ya está registrado');
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario en DynamoDB
    const user = await createUser({
      email,
      passwordHash,
      name,
      role,
      code: code || null,
      phoneNumber: phoneNumber || null,
      email_notification: email_notification || email
    });

    // Generar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({
      message: 'Usuario registrado exitosamente',
      token,
      user: userResponse
    }, 201);

  } catch (err) {
    console.error('Register error:', err);
    return error(500, 'Error al registrar usuario', err.message);
  }
};

// Lambda: Login
module.exports.login = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;

    // Validación
    if (!email || !password) {
      return error(400, 'Email y password son requeridos');
    }

    // Buscar usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
      return error(401, 'Credenciales inválidas');
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return error(401, 'Credenciales inválidas');
    }

    // Generar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Actualizar último login (opcional, requiere UpdateItem)
    // await updateLastLogin(user.id);

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Login error:', err);
    return error(500, 'Error al iniciar sesión', err.message);
  }
};

// Lambda: Get profile
module.exports.getProfile = async (event) => {
  try {
    // Extraer token del header Authorization
    const token = event.headers?.Authorization?.replace('Bearer ', '') ||
                  event.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return error(401, 'Token no proporcionado');
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(401, 'Token expirado');
      }
      return error(403, 'Token inválido');
    }

    // Obtener usuario de DynamoDB
    const user = await getUser(decoded.id);
    if (!user) {
      return error(404, 'Usuario no encontrado');
    }

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({ user: userResponse });

  } catch (err) {
    console.error('Get profile error:', err);
    return error(500, 'Error al obtener perfil', err.message);
  }
};

// Lambda: Validate token (para otros microservicios)
module.exports.validateToken = async (event) => {
  try {
    // Buscar token en headers o en body
    let token = event.headers?.Authorization?.replace('Bearer ', '') ||
                event.headers?.authorization?.replace('Bearer ', '');
    
    // Si no está en headers, buscar en body
    if (!token && event.body) {
      const body = JSON.parse(event.body);
      token = body.token;
    }

    if (!token) {
      return error(401, 'Token no proporcionado');
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(401, 'Token expirado');
      }
      return error(403, 'Token inválido');
    }

    return success({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });

  } catch (err) {
    console.error('Validate token error:', err);
    return error(500, 'Error al validar token', err.message);
  }
};

// Lambda: List all administrators (for superadmin)
module.exports.listAdmins = async (event) => {
  try {
    // Verificar autenticación
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error(401, 'Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return error(403, 'Token inválido');
    }

    // Verificar que sea superadmin
    if (decoded.role !== 'superadmin') {
      return error(403, 'Solo superadmins pueden listar administradores');
    }

    // Obtener todos los administradores
    const admins = await listAdministrators();

    // Quitar información sensible
    const safeAdmins = admins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt
    }));

    return success({
      admins: safeAdmins,
      total: safeAdmins.length
    });

  } catch (err) {
    console.error('List admins error:', err);
    return error(500, 'Error al listar administradores', err.message);
  }
};
