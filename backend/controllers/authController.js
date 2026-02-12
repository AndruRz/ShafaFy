const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generar JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Expira en 24 horas
  );
};

// Registro de usuario
exports.register = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // Validar que todos los campos estén presentes
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el email ya existe
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Este correo electrónico ya está registrado'
      });
    }

    // Verificar si el username ya existe
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Este nombre de usuario ya está en uso'
      });
    }

    // Crear nuevo usuario
    const user = await User.create({
      fullName,
      username,
      email,
      password
    });

    // Generar token
    const token = generateToken(user._id);

    // Configurar cookie con el token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        isFirstLogin: user.isFirstLogin
      },
      token
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Validar campos
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username y contraseña son requeridos'
      });
    }

    // Buscar usuario por email o username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() }
      ]
    }).select('+password');

    // Verificar si el usuario existe
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Verificar contraseña
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Actualizar isFirstLogin a false después del primer login
    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      await user.save();
    }

    // Generar token
    const token = generateToken(user._id);

    // Configurar cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        isFirstLogin: false // Ya no es primer login
      },
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0)
    });

    res.status(200).json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });
  }
};

// Verificar si el usuario está autenticado
exports.verifyAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar autenticación'
    });
  }
};