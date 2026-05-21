const { Op } = require('sequelize');
const { Admin } = require('../models');
const jwt = require('jsonwebtoken');

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

        if (!admin || admin.password !== password) {
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
