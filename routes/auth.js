const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'remitpay_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, phone, country } = req.body;

        // Validaciones básicas
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                error: 'Todos los campos obligatorios deben ser completados' 
            });
        }

        // Verificar si el usuario ya existe
        const existingUserByEmail = await db.getUserByEmail(email);
        if (existingUserByEmail) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const existingUserByUsername = await db.getUserByUsername(username);
        if (existingUserByUsername) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }

        // Crear usuario
        const newUser = await db.createUser({
            username, email, password, firstName, lastName, phone, country
        });

        // Generar JWT
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email },
            process.env.JWT_SECRET || 'remitpay_secret_key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login de usuario
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Validar credenciales
        const user = await db.validatePassword(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'remitpay_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                country: user.country,
                walletAddress: user.wallet_address,
                profileImage: user.profile_image
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener perfil de usuario
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                country: user.country,
                walletAddress: user.wallet_address,
                profileImage: user.profile_image,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar perfil de usuario
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, country, walletAddress, profileImage } = req.body;

        const result = await db.updateUser(req.user.id, {
            firstName, lastName, phone, country, walletAddress, profileImage
        });

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener usuario actualizado
        const updatedUser = await db.getUserById(req.user.id);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                phone: updatedUser.phone,
                country: updatedUser.country,
                walletAddress: updatedUser.wallet_address,
                profileImage: updatedUser.profile_image
            }
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        user: req.user
    });
});

// Logout (invalidar token en el cliente)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout exitoso'
    });
});

module.exports = router;