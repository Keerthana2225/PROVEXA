const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { connectSQL } = require('./config/database');

// SQL Server Connection
connectSQL();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const itemRoutes = require('./routes/items');
const issueRoutes = require('./routes/issues');
const replacementRoutes = require('./routes/replacements');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const verificationRoutes = require('./routes/verification');

// Note: cron jobs might need update to use services
require('./jobs/cron');

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (server-to-server, mobile apps)
        if (!origin) return callback(null, true);
        // Allow all localhost variants
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // Allow all private LAN IPs (192.168.x, 10.x, 172.16-31.x)
        if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
            return callback(null, true);
        }
        // Log and reject unknown origins
        console.warn('[CORS] Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

app.options(/(.*)/, cors(corsOptions));
app.use(cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/replacements', replacementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/verification', verificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Mode: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: SQL Server Express (Sequelize)`);
});
