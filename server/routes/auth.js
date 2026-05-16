const express = require('express');
const router = express.Router();
const authService = require('../services/AuthService');
const { protect } = require('../middleware/auth');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        // Clear the old lingering MongoDB token just in case
        res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });

        // Set JWT as an HTTP-only cookie using a new name
        res.cookie('provexa_token', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ admin: result.admin });
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: error.message });
    }
});

router.get('/me', protect, async (req, res) => {
    try {
        const admin = await authService.getMe(req.admin.id);
        if (!admin) return res.status(401).json({ message: 'Session expired, please login again' });
        res.json(admin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('provexa_token', { httpOnly: true, sameSite: 'lax' });
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
