const { Admin } = require('../models');
const jwt = require('jsonwebtoken');

class AuthService {
    async login(identifier, password) {
        // Find by username OR email
        const admin = await Admin.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        });

        if (!admin || admin.password !== password) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'provexa-super-secret-jwt-key-2024',
            { expiresIn: '24h' }
        );

        return { admin, token };
    }

    async getMe(id) {
        try {
            // If the ID is not a valid ObjectId (e.g. an old SQL UUID), this will fail safely
            if (!id || typeof id !== 'string' || id.length !== 24) {
                return null;
            }
            return await Admin.findById(id).select('-password');
        } catch (err) {
            console.warn('[Auth] Invalid User ID format detected in token:', id);
            return null;
        }
    }
}

module.exports = new AuthService();
