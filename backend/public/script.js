// LRU Cache implementation
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map(); // Sử dụng Map để tracking order tự động
    }

    // Lấy item và move lên đầu list
    get(key) {
        if (!this.cache.has(key)) return null;

        // Delete và set lại để update order
        const item = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, item);

        return item;
    }

    // Thêm item mới, xóa item cũ nếu đầy
    put(key, value) {
        if (this.cache.has(key)) {
            // Nếu key đã tồn tại, xóa để update position
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Xóa item least recently used (first item in Map)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, value);
    }

    // Xóa item
    remove(key) {
        this.cache.delete(key);
    }

    // Lấy danh sách keys theo thứ tự LRU
    getLRUKeys() {
        return Array.from(this.cache.keys());
    }

    // Clear tất cả
    clear() {
        this.cache.clear();
    }

    // Lấy size hiện tại
    size() {
        return this.cache.size;
    }
}


// Cache Management Class
// Cập nhật UrlCache class để sử dụng LRU
class UrlCache {
    constructor() {
        this.PREFIX = 'url_cache_';
        //this.TTL = 3600000; // 1 hour
        this.TTL = 3600000 / 60 / 2 / 2;
        this.MAX_ITEMS = 5; // Số lượng items tối đa
        this.BASE_URL = window.location.origin;

        // Khởi tạo LRU Cache
        this.lruCache = new LRUCache(this.MAX_ITEMS);

        // Load existing items từ localStorage vào LRU
        this.loadFromLocalStorage();

        this.init();
        this.setupSSE();
    }

    init() {
        this.clearExpired();
        setInterval(() => this.clearExpired(), 300000); // Clean every 5 minutes
    }

    setupSSE() {
        const eventSource = new EventSource('/api/cache-events');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleCacheEvent(data);
            } catch (error) {
                console.error('Error processing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            // console.error('SSE Connection Error:', error);
            // Retry connection after 5 seconds
            // setTimeout(() => this.setupSSE(), 5000);
        };
    }

    loadFromLocalStorage() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => {
                const item = JSON.parse(localStorage.getItem(key));
                // Chỉ load các items chưa expire
                if (Date.now() - item.timestamp <= item.ttl) {
                    this.lruCache.put(key.slice(this.PREFIX.length), {
                        ...item,
                        lastAccessed: Date.now()
                    });
                } else {
                    localStorage.removeItem(key);
                }
            });
    }

    // // Trong class UrlCache, sửa lại method handleCacheEvent
    // handleCacheEvent(data) {
    //     const prefix = this.PREFIX;

    //     switch (data.type) {
    //         case 'url_updated':
    //             // Nếu có trong cache thì update
    //             if (this.getItem(data.originalUrl) || this.getItem(data.oldShortUrl)) {
    //                 // Xóa mapping với old short URL
    //                 if (data.oldShortUrl) {
    //                     localStorage.removeItem(prefix + data.oldShortUrl);
    //                 }

    //                 // Update mapping mới
    //                 this.setItem(data.originalUrl, data.newShortUrl);
    //                 this.setItem(data.newShortUrl, data.originalUrl);

    //                 console.log('Cache updated via SSE:', {
    //                     originalUrl: data.originalUrl,
    //                     newShortUrl: data.newShortUrl
    //                 });
    //             }
    //             break;

    //         case 'url_deleted':
    //             if (localStorage.getItem(prefix + data.originalUrl)) {
    //                 localStorage.removeItem(prefix + data.originalUrl);
    //             }
    //             if (localStorage.getItem(prefix + data.shortUrl)) {
    //                 localStorage.removeItem(prefix + data.shortUrl);
    //             }
    //             console.log('Cache deleted via SSE:', data);
    //             break;

    //         default:
    //             console.log('Unknown cache event type:', data.type);
    //     }
    // }

    // handleCacheEvent(data) {
    //     const prefix = this.PREFIX;

    //     switch (data.type) {
    //         case 'url_updated':
    //             // Nếu có trong cache thì update
    //             const oldFullShortUrl = `${this.BASE_URL}/${data.oldShortUrl}`;
    //             const newFullShortUrl = `${this.BASE_URL}/${data.newShortUrl}`;

    //             if (this.getItem(data.originalUrl) || this.getItem(oldFullShortUrl)) {
    //                 // Xóa mapping với old short URL
    //                 if (data.oldShortUrl) {
    //                     localStorage.removeItem(prefix + oldFullShortUrl);
    //                 }

    //                 // Update mapping mới với full URL
    //                 this.setItem(data.originalUrl, newFullShortUrl);
    //                 this.setItem(newFullShortUrl, data.originalUrl);

    //                 console.log('Cache updated via SSE:', {
    //                     originalUrl: data.originalUrl,
    //                     newShortUrl: newFullShortUrl
    //                 });
    //             }
    //             break;

    //         case 'url_deleted':
    //             const fullShortUrl = `${this.BASE_URL}/${data.shortUrl}`;

    //             if (localStorage.getItem(prefix + data.originalUrl)) {
    //                 localStorage.removeItem(prefix + data.originalUrl);
    //             }
    //             if (localStorage.getItem(prefix + fullShortUrl)) {
    //                 localStorage.removeItem(prefix + fullShortUrl);
    //             }
    //             console.log('Cache deleted via SSE:', data);
    //             break;

    //         default:
    //             console.log('Unknown cache event type:', data.type);
    //     }
    // }

    async getOriginalUrlFromCache(shortUrl) {
        // Check browser cache first
        const cachedUrl = this.getItem(shortUrl);
        if (cachedUrl) {
            console.log('Browser cache hit:', shortUrl);
            return cachedUrl;
        }
        return null;
    }


    handleCacheEvent(data) {
        const prefix = this.PREFIX;
        const baseUrl = this.BASE_URL || window.location.origin; // Fallback

        switch (data.type) {
            case 'url_updated':
                // Nếu có trong cache thì update
                const oldFullShortUrl = `${baseUrl}/${data.oldShortUrl}`;
                const newFullShortUrl = `${baseUrl}/${data.newShortUrl}`;

                if (this.getItem(data.originalUrl) || this.getItem(oldFullShortUrl)) {
                    // Xóa mapping với old short URL
                    if (data.oldShortUrl) {
                        localStorage.removeItem(prefix + oldFullShortUrl);
                    }

                    // Update mapping mới với full URL
                    this.setItem(data.originalUrl, newFullShortUrl);
                    this.setItem(newFullShortUrl, data.originalUrl);

                    console.log('Cache updated via SSE:', {
                        originalUrl: data.originalUrl,
                        newShortUrl: newFullShortUrl
                    });
                }
                break;

            case 'url_deleted':
                const fullShortUrl = `${baseUrl}/${data.shortUrl}`;

                if (localStorage.getItem(prefix + data.originalUrl)) {
                    localStorage.removeItem(prefix + data.originalUrl);
                }
                if (localStorage.getItem(prefix + fullShortUrl)) {
                    localStorage.removeItem(prefix + fullShortUrl);
                }
                console.log('Cache deleted via SSE:', data);
                break;

            default:
                console.log('Unknown cache event type:', data.type);
        }
    }

    // setItem(key, value) {
    //     const item = {
    //         value: value,
    //         timestamp: Date.now(),
    //         ttl: this.TTL
    //     };
    //     localStorage.setItem(this.PREFIX + key, JSON.stringify(item));
    // }

    setItem(key, value) {
        // Kiểm tra số lượng items hiện tại trong localStorage
        const currentItems = Object.keys(localStorage)
            .filter(k => k.startsWith(this.PREFIX));

        // Nếu đã đạt limit, xóa các items cũ nhất theo LRU
        while (currentItems.length >= this.MAX_ITEMS) {
            const lruKeys = this.lruCache.getLRUKeys();
            if (lruKeys.length > 0) {
                const oldestKey = lruKeys[0];
                this.removeItem(oldestKey);
                currentItems.shift(); // Giảm số lượng items
            }
        }

        // Tạo cache item mới
        const item = {
            value: !value.startsWith('http') ? `${this.BASE_URL}/${value}` : value,
            timestamp: Date.now(),
            ttl: this.TTL,
            lastAccessed: Date.now(),
            accessCount: 1
        };

        // Update LRU Cache và localStorage
        this.lruCache.put(key, item);
        localStorage.setItem(this.PREFIX + key, JSON.stringify(item));
    }

    getItem(key) {
        // Check LRU Cache first
        const cachedItem = this.lruCache.get(key);

        if (!cachedItem) {
            // Check localStorage as fallback
            const item = localStorage.getItem(this.PREFIX + key);
            if (!item) return null;

            const parsedItem = JSON.parse(item);
            if (Date.now() - parsedItem.timestamp > parsedItem.ttl) {
                this.removeItem(key);
                return null;
            }

            // Update LRU Cache với item từ localStorage
            parsedItem.lastAccessed = Date.now();
            parsedItem.accessCount = (parsedItem.accessCount || 0) + 1;
            this.lruCache.put(key, parsedItem);
            localStorage.setItem(this.PREFIX + key, JSON.stringify(parsedItem));

            return parsedItem.value;
        }

        // Update access info
        cachedItem.lastAccessed = Date.now();
        cachedItem.accessCount = (cachedItem.accessCount || 0) + 1;
        this.lruCache.put(key, cachedItem);
        localStorage.setItem(this.PREFIX + key, JSON.stringify(cachedItem));

        return cachedItem.value;
    }

    removeItem(key) {
        this.lruCache.remove(key);
        localStorage.removeItem(this.PREFIX + key);
        // Xóa cả reverse mapping nếu có
        const item = this.getItem(key);
        if (item) {
            localStorage.removeItem(this.PREFIX + item);
        }
    }

    clearExpired() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => {
                const item = JSON.parse(localStorage.getItem(key));
                if (Date.now() - item.timestamp > item.ttl) {
                    localStorage.removeItem(key);
                }
            });
    }

    clear() {
        this.lruCache.clear();
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => localStorage.removeItem(key));
    }

    getCacheStats() {
        const lruKeys = this.lruCache.getLRUKeys();
        const totalItems = lruKeys.length;
        const mostUsed = lruKeys.length > 0 ?
            this.lruCache.get(lruKeys[lruKeys.length - 1]) : null;
        const leastUsed = lruKeys.length > 0 ?
            this.lruCache.get(lruKeys[0]) : null;

        let size = 0;
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.PREFIX))
            .forEach(key => {
                size += localStorage.getItem(key).length;
            });

        return {
            count: totalItems,
            capacity: this.MAX_ITEMS,
            size: Math.round(size / 1024) + 'KB',
            timeLeft: Math.round(this.TTL / 1000 / 60) + ' minutes',
            mostRecent: mostUsed ? {
                key: lruKeys[lruKeys.length - 1],
                accessCount: mostUsed.accessCount,
                lastAccessed: new Date(mostUsed.lastAccessed).toLocaleString()
            } : null,
            leastRecent: leastUsed ? {
                key: lruKeys[0],
                accessCount: leastUsed.accessCount,
                lastAccessed: new Date(leastUsed.lastAccessed).toLocaleString()
            } : null
        };
    }
}

// Initialize cache
const urlCache = new UrlCache();

async function shortenUrl(retryCount = 0, maxRetries = 3) {
    const urlInput = document.getElementById('urlInput');
    const errorDiv = document.getElementById('error');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const shortenButton = document.getElementById('shortenButton');

    const url = urlInput.value.trim();

    // Reset displays
    errorDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'none';

    if (!url) {
        showError('Please enter a URL');
        return;
    }

    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'https://' + url;
    }

    // Check cache first
    const cachedUrl = urlCache.getItem(processedUrl);
    if (cachedUrl) {
        console.log('Cache hit:', processedUrl);
        showResult(processedUrl, cachedUrl, true);
        return;
    }

    try {
        loadingDiv.style.display = 'block';
        shortenButton.disabled = true;

        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: processedUrl })
        });

        const data = await response.json();

        if (response.ok) {
            const shortUrl = `${window.location.origin}/${data.shortUrl}`;
            // Cache the result
            urlCache.setItem(processedUrl, shortUrl);
            urlCache.setItem(shortUrl, processedUrl);
            showResult(processedUrl, shortUrl, false);
        } else if (response.status === 429) {
            const retryAfter = data.retryAfter || 60;
            if (retryCount < maxRetries) {
                showRetryStatus(retryCount, maxRetries, retryAfter);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return shortenUrl(retryCount + 1, maxRetries);
            } else {
                showError(`Maximum retry attempts (${maxRetries}) reached. Please try again later.`);
            }
        } else {
            throw new Error(data.error || 'Failed to shorten URL');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        loadingDiv.style.display = 'none';
        shortenButton.disabled = false;
    }
}

function showRetryStatus(currentRetry, maxRetries, waitTime) {
    const errorDiv = document.getElementById('error');
    let timeLeft = waitTime;

    const updateStatus = () => {
        errorDiv.innerHTML = `
            <div class="retry-status">
                Retry attempt ${currentRetry + 1}/${maxRetries}<br>
                Next attempt in: ${timeLeft} seconds
                <button onclick="cancelRetry()" class="retry-cancel">Cancel</button>
            </div>
        `;
    };

    updateStatus();
    window.retryTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            updateStatus();
        } else {
            clearInterval(window.retryTimer);
        }
    }, 1000);
}

function cancelRetry() {
    if (window.retryTimer) {
        clearInterval(window.retryTimer);
        showError('Retry cancelled by user');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Thêm function check và handle redirect khi page load
async function handlePageLoadRedirect() {
    // Lấy path từ URL hiện tại (bỏ dấu / đầu tiên)
    const shortUrl = window.location.pathname.substring(1);

    // Bỏ qua nếu là static files hoặc routes khác
    if (!shortUrl || shortUrl.includes('.') || shortUrl.startsWith('api')) {
        return;
    }

    // Check browser cache
    const cachedUrl = urlCache.getItem(shortUrl);
    if (cachedUrl) {
        console.log('Browser cache hit on load:', shortUrl);
        window.location.replace(cachedUrl.startsWith('http') ?
            cachedUrl : `http://${cachedUrl}`);
        return;
    }

    // Không có trong cache -> để server xử lý redirect
}

function showResult(originalUrl, shortUrl, fromCache = false) {
    const resultDiv = document.getElementById('result');
    const stats = urlCache.getCacheStats();

    resultDiv.innerHTML = `
        <p><strong>Original URL:</strong> <br>${originalUrl}</p>
        <p><strong>Shortened URL:</strong> <br>
            <a href="${shortUrl}" target="_blank">${shortUrl}</a>
            <button onclick="copyToClipboard('${shortUrl}')" class="copy-button">Copy</button>
            <span id="copied-message" class="copied-message">Copied!</span>
        </p>
        ${fromCache ? '<div class="cache-hit">✓ Retrieved from cache</div>' : ''}
        <div class="cache-stats">
            <small>
                Cache Info: 
                <br>- Items: ${stats.count}/${stats.capacity}
                <br>- Size: ${stats.size}
                <br>- TTL: ${stats.timeLeft}
                ${stats.mostRecent ? `
                    <br>- Most Recent: ${stats.mostRecent.key} 
                    (${stats.mostRecent.accessCount} accesses, 
                    last: ${stats.mostRecent.lastAccessed})
                ` : ''}
                ${stats.leastRecent ? `
                    <br>- Least Recent: ${stats.leastRecent.key}
                    (${stats.leastRecent.accessCount} accesses, 
                    last: ${stats.leastRecent.lastAccessed})
                ` : ''}
            </small>
            <button onclick="clearCache()" class="clear-cache-btn">Clear Cache</button>
        </div>
    `;
    resultDiv.style.display = 'block';
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        const copiedMessage = document.getElementById('copied-message');
        copiedMessage.style.display = 'inline';
        setTimeout(() => {
            copiedMessage.style.display = 'none';
        }, 2000);
    } catch (err) {
        showError('Failed to copy to clipboard');
    }
}

function clearCache() {
    if (confirm('Are you sure you want to clear the browser cache?')) {
        urlCache.clear();
        showError('Cache cleared successfully');
    }
}

// Event Listeners
document.getElementById('urlInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        shortenUrl();
    }
});

document.getElementById('urlInput').addEventListener('input', function () {
    document.getElementById('error').style.display = 'none';
});


// Chạy check khi page load
document.addEventListener('DOMContentLoaded', handlePageLoadRedirect);

// Giữ nguyên event listener cho click
document.addEventListener('click', async (e) => {
    if (e.target.tagName === 'A' && e.target.href.includes(window.location.origin)) {
        e.preventDefault();
        const shortUrl = e.target.pathname.substring(1);

        const cachedUrl = urlCache.getItem(shortUrl);
        if (cachedUrl) {
            window.location.href = cachedUrl.startsWith('http') ?
                cachedUrl : `http://${cachedUrl}`;
            return;
        }
        window.location.href = e.target.href;
    }
});