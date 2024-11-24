// performance.js
const v8 = require('v8');
const os = require('os');

// Performance Configuration
const performanceConfig = {
    // Worker Configuration
    workers: {
        count: os.cpus().length, // Số lượng CPU cores
        maxMemoryRestart: '3G'   // Restart worker nếu vượt quá 1GB memory
    },

    // Event Loop Configuration
    eventLoop: {
        maxLag: 70,             // Maximum event loop lag (ms)
        checkInterval: 1000     // Check interval (ms)
    },

    // Memory Configuration
    memory: {
        maxOldSpaceSize: 4096,  // Maximum old space size (MB)
        maxHeapSize: '2g',      // Maximum heap size
        heapSizeLimit: '4g'     // Heap size limit
    },

    // Garbage Collection
    gc: {
        gcInterval: 30000,      // GC interval (ms)
        gcType: 'scavenge'      // GC type (scavenge/mark-sweep)
    }
};

// Cấu hình Node.js flags
const nodeFlags = [
    // Memory Flags
    `--max-old-space-size=${performanceConfig.memory.maxOldSpaceSize}`,
    '--optimize-for-size',
    '--max-semi-space-size=128',

    // Garbage Collection Flags
    '--expose-gc',
    '--gc-interval=100',

    // V8 Optimization Flags
    '--use-idle-notification',
    '--max-inlined-source-size=10000',

    // Performance Flags
    '--nouse-idle-notification',
    '--predictable-gc-schedule',
    '--max-semi-space-size=128',
    '--noconcurrent_sweeping',
];

const setupPerformance = () => {
    // Set Memory Limits
    v8.setFlagsFromString('--max_old_space_size=' + performanceConfig.memory.maxOldSpaceSize);

    // Monitor Event Loop
    let lastLoop = Date.now();

    const monitorEventLoop = () => {
        const now = Date.now();
        const lag = now - lastLoop;

        if (lag > performanceConfig.eventLoop.maxLag) {
            console.warn(`Event loop lag detected: ${lag}ms`);
        }

        lastLoop = now;
        setTimeout(monitorEventLoop, performanceConfig.eventLoop.checkInterval);
    };

    // Start Event Loop Monitoring
    monitorEventLoop();

    // Schedule Garbage Collection
    if (global.gc) {
        setInterval(() => {
            try {
                global.gc();
                const heapStats = v8.getHeapStatistics();
                console.log('Heap stats after GC:', {
                    totalHeapSize: (heapStats.total_heap_size / 1024 / 1024).toFixed(2) + 'MB',
                    usedHeapSize: (heapStats.used_heap_size / 1024 / 1024).toFixed(2) + 'MB',
                    heapSizeLimit: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2) + 'MB'
                });
            } catch (error) {
                console.error('GC Error:', error);
            }
        }, performanceConfig.gc.gcInterval);
    }

    // Monitor Memory Usage
    setInterval(() => {
        const used = process.memoryUsage();
        console.log('Memory usage:', {
            rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(used.heapTotaleapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(used.external / 1024 / 1024)}MB`
        });
    }, 30000);

    // Handle Memory Leaks
    process.on('memoryUsage', (info) => {
        if (info.rss > performanceConfig.memory.maxOldSpaceSize * 1024 * 1024) {
            console.error('Memory limit exceeded, restarting worker...');
            process.exit(1);
        }
    });

    return {
        getPerformanceStats: () => ({
            memory: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            uptime: process.uptime(),
            eventLoopLag: Date.now() - lastLoop
        })
    };
};

module.exports = {
    performanceConfig,
    nodeFlags,
    setupPerformance
};