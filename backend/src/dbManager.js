// dbManager.js
const path = require('path');
// Load .env từ thư mục gốc của project
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = require('./config/database');
const Url = require('./models/url');
const cacheService = require('./services/cacheService');

class DbManager {
    async ensureConnection() {
        try {
            await sequelize.authenticate();
            return true;
        } catch (error) {
            console.error('Database connection error:', error);
            return false;
        }
    }

    async listAllUrls() {
        try {
            await this.ensureConnection();
            const urls = await Url.findAll();
            console.table(urls.map(url => url.toJSON()));
            return urls;
        } catch (error) {
            console.error('Error listing URLs:', error);
            throw error;
        }
    }

    async addUrl(originalUrl, shortUrl) {
        try {
            // Kiểm tra tồn tại
            const existingOriginal = await Url.findOne({ where: { originalUrl } });
            const existingShort = await Url.findOne({ where: { shortUrl } });

            if (existingOriginal || existingShort) {
                console.log('URL already exists');
                return null;
            }

            const url = await Url.create({ originalUrl, shortUrl });
            console.log('URL added successfully:', url.toJSON());

            // Cập nhật cache
            await cacheService.setUrlPair(originalUrl, shortUrl);

            return url;
        } catch (error) {
            console.error('Error adding URL:', error);
            throw error;
        }
    }

    async updateOriginalUrl(oldOriginalUrl, newOriginalUrl) {
        try {
            const url = await Url.findOne({ where: { originalUrl: oldOriginalUrl } });

            if (!url) {
                console.log('Original URL not found:', oldOriginalUrl);
                return false;
            }

            const existing = await Url.findOne({ where: { originalUrl: newOriginalUrl } });
            if (existing) {
                console.log('New original URL already exists:', newOriginalUrl);
                return false;
            }

            const shortUrl = url.shortUrl;
            await url.update({ originalUrl: newOriginalUrl });

            // Cập nhật cache
            await cacheService.updateUrlPair(
                oldOriginalUrl,
                shortUrl,
                newOriginalUrl,
                shortUrl
            );

            console.log('Updated URL mapping:', {
                old: oldOriginalUrl,
                new: newOriginalUrl,
                shortUrl
            });

            return true;
        } catch (error) {
            console.error('Error updating original URL:', error);
            throw error;
        }
    }

    async updateShortUrl(oldShortUrl, newShortUrl) {
        try {
            await this.ensureConnection();
            const url = await Url.findOne({ where: { shortUrl: oldShortUrl } });

            if (!url) {
                console.log('Short URL not found:', oldShortUrl);
                return false;
            }

            const existing = await Url.findOne({ where: { shortUrl: newShortUrl } });
            if (existing) {
                console.log('New short URL already exists:', newShortUrl);
                return false;
            }

            const originalUrl = url.originalUrl;
            await url.update({ shortUrl: newShortUrl });

            // Sử dụng method mới của cacheService
            try {
                await cacheService.updateShortUrl(originalUrl, oldShortUrl, newShortUrl);
            } catch (cacheError) {
                console.error('Cache update error:', cacheError);
                // Continue even if cache update fails
            }

            console.log('Updated URL mapping:', {
                originalUrl,
                oldShortUrl,
                newShortUrl
            });

            return true;
        } catch (error) {
            console.error('Error updating short URL:', error);
            return false;
        }
    }

    async deleteUrl(identifier) {
        try {
            const url = await Url.findOne({
                where: sequelize.or(
                    { originalUrl: identifier },
                    { shortUrl: identifier }
                )
            });

            if (!url) {
                console.log('URL not found:', identifier);
                return false;
            }

            await url.destroy();

            // Xóa cache
            await cacheService.invalidateUrlPair(url.originalUrl, url.shortUrl);

            console.log('Deleted URL:', url.toJSON());
            return true;
        } catch (error) {
            console.error('Error deleting URL:', error);
            throw error;
        }
    }

    async deleteAllUrls() {
        try {
            await Url.destroy({ where: {} });
            await cacheService.clearCache();
            console.log('All URLs deleted and cache cleared');
            return true;
        } catch (error) {
            console.error('Error deleting all URLs:', error);
            throw error;
        }
    }

    async showCache() {
        try {
            const cache = await cacheService.getCacheData();
            console.log('\nCurrent Cache Status:');
            console.log('------------------------');
            for (const [key, data] of Object.entries(cache)) {
                console.log(`${key}:`, data);
            }
            console.log('------------------------');
            return cache;
        } catch (error) {
            console.error('Error showing cache:', error);
            throw error;
        }
    }

    // Thêm một số phương thức hữu ích
    async syncDatabase() {
        try {
            await sequelize.sync();
            console.log('Database synced successfully');
            return true;
        } catch (error) {
            console.error('Error syncing database:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const totalUrls = await Url.count();
            const cache = await cacheService.getCacheData();
            const cacheSize = Object.keys(cache).length;

            console.log('\nSystem Statistics:');
            console.log('------------------');
            console.log(`Total URLs: ${totalUrls}`);
            console.log(`Cache Entries: ${cacheSize}`);
            console.log('------------------');

            return { totalUrls, cacheSize };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    async showSystemStatus() {
        try {
            await this.ensureConnection();
            const urlCount = await Url.count();
            console.log('\nSystem Status:');
            console.log('--------------');
            console.log('Database Connection: OK');
            console.log(`Total URLs: ${urlCount}`);

            try {
                const cacheData = await cacheService.getCacheData();
                console.log('Cache Status: OK');
                console.log(`Cache Entries: ${Object.keys(cacheData).length}`);
            } catch (cacheError) {
                console.log('Cache Status: Error');
                console.error('Cache error:', cacheError.message);
            }

            console.log('--------------');
        } catch (error) {
            console.error('Error getting system status:', error);
        }
    }
}

// Command line interface
// if (require.main === module) {
//     const manager = new DbManager();
//     const command = process.argv[2];
//     const args = process.argv.slice(3);

//     (async () => {
//         try {
//             switch (command) {
//                 case 'list':
//                     await manager.listAllUrls();
//                     break;
//                 case 'update-short':
//                     if (args.length !== 2) {
//                         console.log('Usage: node dbManager.js update-short <oldShortUrl> <newShortUrl>');
//                         break;
//                     }
//                     const result = await manager.updateShortUrl(args[0], args[1]);
//                     if (result) {
//                         console.log('Short URL updated successfully');
//                     }
//                     break;
//                 case 'status':
//                     await manager.showSystemStatus();
//                     break;
//                 default:
//                     console.log(`
// Available commands:
//   list                                    - List all URLs
//   update-short <oldShort> <newShort>     - Update short URL
//   status                                  - Show system status
//                     `);
//             }
//         } catch (error) {
//             console.error('Operation failed:', error.message);
//         } finally {
//             // Optional: Close database connection
//             try {
//                 await sequelize.close();
//             } catch (err) {
//                 console.error('Error closing database connection:', err);
//             }
//             process.exit(0);
//         }
//     })();
// }

// Phần command line interface
if (require.main === module) {
    const manager = new DbManager();
    const command = process.argv[2];
    const args = process.argv.slice(3);

    (async () => {
        try {
            switch (command) {
                case 'list':
                    await manager.listAllUrls();
                    break;

                case 'add':
                    if (args.length !== 2) {
                        console.log('Usage: node dbManager.js add <originalUrl> <shortUrl>');
                        break;
                    }
                    const addResult = await manager.addUrl(args[0], args[1]);
                    if (addResult) {
                        console.log('URL added successfully');
                    }
                    break;

                case 'update-short':
                    if (args.length !== 2) {
                        console.log('Usage: node dbManager.js update-short <oldShortUrl> <newShortUrl>');
                        break;
                    }
                    const updateShortResult = await manager.updateShortUrl(args[0], args[1]);
                    if (updateShortResult) {
                        console.log('Short URL updated successfully');
                    }
                    break;

                case 'update-original':
                    if (args.length !== 2) {
                        console.log('Usage: node dbManager.js update-original <oldOriginalUrl> <newOriginalUrl>');
                        break;
                    }
                    const updateOrigResult = await manager.updateOriginalUrl(args[0], args[1]);
                    if (updateOrigResult) {
                        console.log('Original URL updated successfully');
                    }
                    break;

                case 'delete':
                    if (args.length !== 1) {
                        console.log('Usage: node dbManager.js delete <url>');
                        break;
                    }
                    const deleteResult = await manager.deleteUrl(args[0]);
                    if (deleteResult) {
                        console.log('URL deleted successfully');
                    }
                    break;

                case 'delete-all':
                    if (args[0] !== '--confirm') {
                        console.log('Use --confirm to delete all URLs');
                        break;
                    }
                    await manager.deleteAllUrls();
                    break;

                case 'show-cache':
                    await manager.showCache();
                    break;

                case 'sync':
                    await manager.syncDatabase();
                    break;

                case 'stats':
                    await manager.getStats();
                    break;

                case 'status':
                    await manager.showSystemStatus();
                    break;

                default:
                    console.log(`
Available commands:
  list                                    - List all URLs
  add <originalUrl> <shortUrl>           - Add new URL
  update-original <oldUrl> <newUrl>      - Update original URL
  update-short <oldShort> <newShort>     - Update short URL
  delete <url>                           - Delete URL (either original or short)
  delete-all --confirm                   - Delete all URLs (requires confirmation)
  show-cache                             - Show current cache data
  sync                                   - Sync database
  stats                                  - Show system statistics
  status                                 - Show complete system status
                    `);
            }
        } catch (error) {
            console.error('Operation failed:', error.message);
        } finally {
            try {
                await sequelize.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
            process.exit(0);
        }
    })();
}

module.exports = DbManager;