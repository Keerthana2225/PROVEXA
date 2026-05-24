const { Op } = require('sequelize');
const { Admin } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
    async login(identifier, password) {
        const admin = await Admin.findOne({
            where: {
                [Op.or]: [
                    { username: identifier },
                    { email: identifier }
                ]
            }
        });

        if (!admin) {
            throw new Error('Invalid credentials');
        }

        // Check password using bcrypt if it's hashed, otherwise do a plain-text check
        let isMatch = false;
        if (admin.password && admin.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, admin.password);
        } else {
            isMatch = admin.password === password;
        }

        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'provexa-super-secret-jwt-key-2024',
            { expiresIn: '24h' }
        );

        return { admin: admin.toJSON(), token };
    }

    async getMe(id) {
        try {
            if (!id) return null;
            const admin = await Admin.findByPk(id, { attributes: { exclude: ['password'] } });
            return admin ? admin.toJSON() : null;
        } catch (err) {
            console.warn('[Auth] Invalid User ID format detected in token:', id);
            return null;
        }
    }
}

module.exports = new AuthService();
