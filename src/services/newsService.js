const axios = require('axios');
const Parser = require('rss-parser');
const logger = require('../utils/logger');
const { redis } = require('../config/database');

class NewsService {
    constructor() {
        this.parser = new Parser({ timeout: 5000 });
        this.sources = {
            world: [
                { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC' },
                { url: 'https://rss.cnn.com/rss/edition_world.rss', name: 'CNN' }
            ],
            kr: [
                { url: 'https://fs.jtbc.co.kr/RSS/newsflash.xml', name: 'JTBC' }
            ],
            tech: [
                { url: 'https://feeds.feedburner.com/TechCrunch/', name: 'TechCrunch' }
            ]
        };
    }

    async getNews(section = 'world') {
        const cacheKey = `news:${section}`;
        
        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            logger.warn('Cache read failed:', error.message);
        }

        // Fetch fresh data
        const sources = this.sources[section] || this.sources.world;
        const articles = [];

        for (const source of sources) {
            try {
                const feed = await this.parser.parseURL(source.url);
                const items = feed.items.slice(0, 10).map(item => ({
                    title: item.title,
                    description: item.contentSnippet || item.content,
                    url: item.link,
                    source: source.name,
                    publishedAt: item.pubDate || new Date().toISOString()
                }));
                articles.push(...items);
            } catch (error) {
                logger.error(`Failed to fetch from ${source.name}:`, error.message);
            }
        }

        const result = {
            section,
            articles,
            total: articles.length,
            timestamp: new Date().toISOString()
        };

        // Cache result
        try {
            await redis.set(cacheKey, JSON.stringify(result), { EX: 600 });
        } catch (error) {
            logger.warn('Cache write failed:', error.message);
        }

        return result;
    }
}

module.exports = new NewsService();
