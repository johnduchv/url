// controllers/sseController.js
const { EventEmitter } = require('events');

class SSEController {
    constructor() {
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        this.setupRedisSubscriber();
    }

    // Thêm client mới kết nối SSE
    // addClient(req, res) {
    //     // Setup SSE headers
    //     res.writeHead(200, {
    //         'Content-Type': 'text/event-stream',
    //         'Cache-Control': 'no-cache',
    //         'Connection': 'keep-alive'
    //     });

    //     // Trả về initial response
    //     res.write('data: {"type": "connected"}\n\n');
    //     res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

    //     // Thêm interval để gửi periodic chunks
    //     const interval = setInterval(() => {
    //         res.write(':\n\n');
    //     }, 30000); // 30 seconds

    //     const client = { id: Date.now(), res };
    //     this.clients.add(client);

    //     // Cleanup on client disconnect
    //     req.on('close', () => {
    //         clearInterval(interval);
    //         this.clients.delete(client);
    //         client.res.end();
    //     });
    // }

    addClient(req, res) {
        // Setup SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        // Initial response
        res.write('data: {"type": "connected"}\n\n');
        res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

        // Keep-alive interval
        const interval = setInterval(() => {
            this.clients.forEach(client => {
                try {
                    client.res.write(': keep-alive\n\n'); // Ping SSE
                } catch (err) {
                    console.error('Failed to send keep-alive ping:', err);
                    this.clients.delete(client); // Xóa client không hợp lệ
                }
            });
        }, 20000);

        // Add client to set
        const client = { id: Date.now(), res };
        this.clients.add(client);

        // Cleanup on disconnect
        req.on('close', () => {
            clearInterval(interval);
            this.clients.delete(client);
            if (!res.writableEnded) res.end();
        });
    }


    // Setup Redis subscriber
    setupRedisSubscriber() {
        const redis = require('../config/redis');
        const subscriber = redis.duplicate();

        subscriber.subscribe('cache-updates', (err) => {
            if (err) {
                console.error('Failed to subscribe to Redis channel:', err);
                return;
            }
            console.log('Subscribed to cache-updates channel');
        });

        subscriber.on('message', (channel, message) => {
            if (channel === 'cache-updates') {
                this.broadcastUpdate(JSON.parse(message));
            }
        });
    }

    // Broadcast update to relevant clients
    broadcastUpdate(data) {
        this.clients.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (err) {
                console.error('Error sending SSE update:', err);
                this.clients.delete(client);
            }
        });
    }
}

module.exports = new SSEController();