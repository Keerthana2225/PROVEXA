const { Admin } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    async login(email, password) {
        // The frontend sends { email, password }
        // In SQL, the email is stored in the 'username' column (mapped during migration)
        const admin = await Admin.findOne({ where: { username: email } });
        if (!admin) throw new Error('Invalid credentials');

        let isMatch = false;

        // Try bcrypt compare first (for properly hashed passwords)
        try {
            isMatch = await bcrypt.compare(password, admin.password);
        } catch (e) {
            // If bcrypt fails (e.g. password is not a valid hash), fall back to plain comparison
            isMatch = false;
        }

        // Fallback: plain text comparison for development/initial setup
        if (!isMatch && admin.password === password) {
            isMatch = true;
        }

        if (!isMatch) throw new Error('Invalid credentials');

        const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return { 
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role
            }, 
            token 
        };
    }

    async getMe(id) {
        return await Admin.findByPk(id, { attributes: { exclude: ['password'] } });
    }
}

module.exports = new AuthService();
