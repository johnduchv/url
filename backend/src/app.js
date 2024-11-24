// app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const http = require('http');
const v8 = require('v8');
const sequelize = require('./config/database');
const urlRoutes = require('./routes/urlRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const urlController = require('./controllers/urlController');
const { redirectLimiter } = require('./middleware/rateLimiter');
const urlRepository = require('./repositories/urlRepository');
const sseRoutes = require('./routes/sseRoutes');
const { shortenQueue, redirectQueue } = require('./config/queueConfig');
const urlService = require('./services/urlService');
// Performance Configurations
const performanceConfig = {
    threadPool: {
        size: numCPUs * 2
    },
    server: {
        keepAliveTimeout: 65000,
        headersTimeout: 66000,
        timeout: 30000,
        maxHeaderSize: 16384,
        maxConnections: 1000
    },
    memory: {
        maxHeapSize: 2048,
        gcInterval: 30000
    }
};

// Set Thread Pool Size
process.env.UV_THREADPOOL_SIZE = performanceConfig.threadPool.size;

// Create Express app at the top level
const app = express();

// Memory Monitoring
const monitorMemory = () => {
    const used = process.memoryUsage();
    console.log('Memory Usage:',
        Object.entries(used).map(([key, value]) =>
            `${key}: ${Math.round(value / 1024 / 1024)}MB`
        ).join(', ')
    );
};

// Configure Express App
const configureApp = () => {
    // Basic Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use('/api', sseRoutes);

    // Performance Middleware
    app.use((req, res, next) => {
        req.setTimeout(performanceConfig.server.timeout, () => {
            res.status(408).json({ error: 'Request timeout' });
        });

        const startHrTime = process.hrtime();
        res.on('finish', () => {
            const elapsedHrTime = process.hrtime(startHrTime);
            const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
            console.log(`${req.method} ${req.url} - ${elapsedTimeInMs}ms`);
        });

        next();
    });

    // Routes
    app.use('/api', urlRoutes);
    app.use('/monitor', monitorRoutes);
    app.use(express.static(path.join(__dirname, '../public')));

    // Short URL Route
    // app.get('/:shortUrl', redirectLimiter, async (req, res, next) => {
    //     const { shortUrl } = req.params;

    //     // Bỏ qua static files
    //     if (shortUrl.includes('.')) {
    //         return next();
    //     }

    //     try {
    //         // Kiểm tra trực tiếp trong database
    //         const urlData = await urlRepository.findByShortUrl(shortUrl);
    //         //console.log('Found URL data:', urlData);

    //         if (!urlData) {
    //             console.log('URL not found:', shortUrl);
    //             return res.status(404).json({ error: 'Short URL not found' });
    //         }

    //         const originalUrl = urlData.originalUrl;
    //         console.log('Redirecting to:', originalUrl);

    //         if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
    //             return res.redirect(`http://${originalUrl}`);
    //         }

    //         res.redirect(originalUrl);
    //     } catch (error) {
    //         console.error('Redirect error:', error);
    //         res.status(404).json({ error: 'Short URL not found' });
    //     }
    // });

    // Trong app.js
    // app.get('/:shortUrl', redirectLimiter, async (req, res, next) => {
    //     const { shortUrl } = req.params;

    //     // Bỏ qua static files
    //     if (shortUrl.includes('.')) {
    //         return next();
    //     }

    //     try {
    //         // Sử dụng urlService có sẵn để get originalUrl
    //         // urlService đã implement sẵn việc check cache Redis và database
    //         const urlService = require('./services/urlService');
    //         const originalUrl = await urlService.getOriginalUrl(shortUrl);

    //         if (!originalUrl) {
    //             return res.status(404).json({ error: 'Short URL not found' });
    //         }

    //         // Handle redirect với protocol check
    //         if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
    //             return res.redirect(`http://${originalUrl}`);
    //         }
    //         res.redirect(originalUrl);

    //     } catch (error) {
    //         console.error('Redirect error:', error);
    //         res.status(404).json({ error: 'Short URL not found' });
    //     }
    // });

    // app.get('/:shortUrl', redirectLimiter, async (req, res, next) => {
    //     const { shortUrl } = req.params;

    //     if (shortUrl.includes('.')) {
    //         return next();
    //     }

    //     try {
    //         // Đẩy vào queue xử lý
    //         // const job = await redirectQueue.add({
    //         //     shortUrl,
    //         //     timestamp: Date.now()
    //         // });

    //         // const result = await job.finished();

    //         // Gọi trực tiếp urlService 
    //         const originalUrl = await urlService.getOriginalUrl(shortUrl);

    //         if (result && result.originalUrl) {
    //             const url = result.originalUrl;
    //             if (!url.startsWith('http://') && !url.startsWith('https://')) {
    //                 return res.redirect(`http://${url}`);
    //             }
    //             res.redirect(url);
    //         } else {
    //             throw new Error('Short URL not found');
    //         }

    //     } catch (error) {
    //         console.error('Redirect error:', error);
    //         res.status(404).json({ error: 'Short URL not found' });
    //     }
    // });

    app.get('/:shortUrl', redirectLimiter, async (req, res, next) => {
        const { shortUrl } = req.params;

        if (shortUrl.includes('.')) {
            return next();
        }

        try {
            // Gọi trực tiếp urlService 
            const originalUrl = await urlService.getOriginalUrl(shortUrl);

            if (!originalUrl) {
                return res.status(404).json({ error: 'Short URL not found' });
            }

            // Check và thêm protocol nếu cần
            if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
                return res.redirect(`http://${originalUrl}`);
            }
            res.redirect(originalUrl);

        } catch (error) {
            console.error('Redirect error:', error);
            res.status(404).json({ error: 'Short URL not found' });
        }
    });

    // Error Handling
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
};

// Database Connection with Retry
const connectDatabase = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.sync();
            console.log('Database connected successfully');
            return true;
        } catch (err) {
            console.error(`Database connection attempt ${i + 1} failed:`, err);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Graceful Shutdown
const gracefulShutdown = (server) => {
    console.log('Received shutdown signal');
    server.close(() => {
        console.log('Server closed');
        sequelize.close().then(() => {
            console.log('Database connection closed');
            process.exit(0);
        });
    });
};

// Start Server
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Starting new worker...`);
        cluster.fork();
    });

    setInterval(monitorMemory, performanceConfig.memory.gcInterval);
} else {
    // Worker process
    connectDatabase()
        .then(() => {
            // Configure the app
            configureApp();

            const server = http.createServer(app);

            // Server configurations
            server.keepAliveTimeout = performanceConfig.server.keepAliveTimeout;
            server.headersTimeout = performanceConfig.server.headersTimeout;
            server.maxHeaderSize = performanceConfig.server.maxHeaderSize;
            server.timeout = performanceConfig.server.timeout;
            server.maxConnections = performanceConfig.server.maxConnections;

            // Periodic garbage collection
            if (global.gc) {
                setInterval(() => {
                    global.gc();
                    monitorMemory();
                }, performanceConfig.memory.gcInterval);
            }

            // Graceful shutdown handlers
            process.on('SIGTERM', () => gracefulShutdown(server));
            process.on('SIGINT', () => gracefulShutdown(server));

            // Start server
            const PORT = process.env.PORT || 3000;
            server.listen(PORT, () => {
                console.log(`Worker ${process.pid} started`);
                console.log(`Server running on port ${PORT}`);
                console.log(`Monitor available at http://localhost:${PORT}/monitor.html`);
            });
        })
        .catch(err => {
            console.error('Failed to start server:', err);
            process.exit(1);
        });
}

// Export the app
module.exports = app;