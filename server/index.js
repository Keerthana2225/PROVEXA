const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

// MongoDB Connection Global Plugin (MUST be before models are required)
mongoose.plugin(schema => {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        }
    });
    schema.set('toObject', {
        virtuals: true,
        versionKey: false,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        }
    });
});

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const itemRoutes = require('./routes/items');
const issueRoutes = require('./routes/issues');
const replacementRoutes = require('./routes/replacements');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

// Note: cron jobs might need update to use mongoose models
require('./jobs/cron');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
        if (!origin) return callback(null, true);
        const allowed = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://10.29.74.219:5173',
        ];
        if (allowed.includes(origin)) return callback(null, true);
        // Allow any local network IP (192.168.x.x, 10.x.x.x, 172.x.x.x)
        if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

// Handle preflight for ALL routes (required for Express 5 compatibility)
// NOTE: Express 5 uses path-to-regexp v8 which does NOT support bare '*' wildcard.
// Use a regex pattern instead.
app.options(/(.*)/,  cors(corsOptions));
app.use(cors(corsOptions));

mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/replacements', replacementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
