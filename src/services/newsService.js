const axios = require('axios');
const Parser = require('rss-parser');
const logger = require('../utils/logger');
const database = require('../config/database');

class NewsService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail']
      }
    });
    
    // API 설정
    this.apis = {
      newsapi: {
        key: process.env.NEWS_API_KEY,
        baseUrl: 'https://newsapi.org/v2'
      },
      naver: {
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        baseUrl: 'https://openapi.naver.com/v1/search/news.json'
      },
      x: {
        bearerToken: process.env.X_BEARER_TOKEN,
        baseUrl: 'https://api.twitter.com/2'
      },
      youtube: {
        key: process.env.YOUTUBE_API_KEY,
        baseUrl: 'https://www.googleapis.com/youtube/v3'
      }
    };
    
    // RSS 소스 (보조 용도)
    this.rssSources = this.initializeRSSSources();
    this.cache = new Map();
    this.isUpdating = false;
  }

  initializeRSSSources() {
    return {
      world: [
        { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', language: 'en' },
        { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/worldNews', language: 'en' }
      ],
      kr: [
        { name: 'KBS', url: 'https://world.kbs.co.kr/rss/rss_news.htm?lang=k', language: 'ko' }
      ],
      japan: [
        { name: 'NHK', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', language: 'ja' },
        { name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed/', language: 'en' }
      ]
    };
  }

  async getNews(section = 'world', useCache = true) {
    try {
      logger.info(`📰 [${section.toUpperCase()}] Starting API-first news fetch...`);
      
      const cacheKey = `news:${section}`;
      
      // Check cache first
      if (useCache) {
        const cached = await this.getCachedNews(cacheKey);
        if (cached && cached.length > 0) {
          logger.info(`📰 [${section.toUpperCase()}] Returning cached news (${cached.length} articles)`);
          return {
            success: true,
            data: {
              section,
              articles: cached.slice(0, 20),
              total: cached.length,
              timestamp: new Date().toISOString(),
              cached: true
            }
          };
        }
      }

      // Fetch from appropriate APIs based on section
      let articles = [];
      
      switch (section) {
        case 'world':
          articles = await this.fetchWorldNews();
          break;
        case 'kr':
          articles = await this.fetchKoreanNews();
          break;
        case 'japan':
          articles = await this.fetchJapanNews();
          break;
        case 'tech':
          articles = await this.fetchTechNews();
          break;
        case 'business':
          articles = await this.fetchBusinessNews();
          break;
        case 'buzz':
          articles = await this.fetchBuzzNews();
          break;
        default:
          articles = await this.fetchWorldNews();
      }

      logger.info(`📰 [${section.toUpperCase()}] API fetch completed: ${articles.length} articles`);

      // Add RSS articles as supplementary content
      const rssArticles = await this.fetchRSSArticles(section);
      if (rssArticles.length > 0) {
        articles = [...articles, ...rssArticles];
        logger.info(`📰 [${section.toUpperCase()}] Added ${rssArticles.length} RSS articles`);
      }

      // Process and enhance articles
      const processedArticles = await this.processArticles(articles, section);
      
      // Cache the results
      if (processedArticles.length > 0) {
        await this.cacheNews(cacheKey, processedArticles);
      }

      return {
        success: true,
        data: {
          section,
          articles: processedArticles.slice(0, 20),
          total: processedArticles.length,
          timestamp: new Date().toISOString(),
          cached: false,
          sources: this.getActiveSources(section)
        }
      };

    } catch (error) {
      logger.error(`📰 [${section.toUpperCase()}] Error:`, error.message);
      
      // Return cached data or mock data as fallback
      try {
        const cached = await this.getCachedNews(`news:${section}`);
        if (cached && cached.length > 0) {
          return {
            success: true,
            data: {
              section,
              articles: cached.slice(0, 10),
              total: cached.length,
              timestamp: new Date().toISOString(),
              cached: true,
              fallback: true
            }
          };
        }
      } catch (cacheError) {
        logger.error(`📰 Cache fallback failed:`, cacheError);
      }

      // Final fallback: mock data
      const mockArticles = this.getMockArticles(section);
      return {
        success: true,
        data: {
          section,
          articles: mockArticles,
          total: mockArticles.length,
          timestamp: new Date().toISOString(),
          mock: true,
          fallback: true
        }
      };
    }
  }

  async fetchWorldNews() {
    const articles = [];
    
    try {
      // NewsAPI - 세계 뉴스
      if (this.apis.newsapi.key) {
        logger.info('📰 Fetching world news from NewsAPI...');
        const newsApiArticles = await this.fetchFromNewsAPI('general', 'us,gb,ca,au');
        articles.push(...newsApiArticles);
        logger.info(`📰 NewsAPI returned ${newsApiArticles.length} world articles`);
      }
    } catch (error) {
      logger.warn('📰 NewsAPI world news failed:', error.message);
    }

    return articles;
  }

  async fetchKoreanNews() {
    const articles = [];
    
    try {
      // Naver API - 한국 뉴스 (NewsAPI 대신)
      if (this.apis.naver.clientId && this.apis.naver.clientSecret) {
        logger.info('📰 Fetching Korean news from Naver API...');
        const naverArticles = await this.fetchFromNaverAPI();
        articles.push(...naverArticles);
        logger.info(`📰 Naver API returned ${naverArticles.length} Korean articles`);
      }
    } catch (error) {
      logger.warn('📰 Naver API failed:', error.message);
    }

    return articles;
  }

  async fetchJapanNews() {
    const articles = [];
    
    try {
      // NewsAPI - 일본 관련 뉴스
      if (this.apis.newsapi.key) {
        logger.info('📰 Fetching Japan news from NewsAPI...');
        const newsApiArticles = await this.fetchFromNewsAPI('general', 'jp');
        articles.push(...newsApiArticles);
        logger.info(`📰 NewsAPI returned ${newsApiArticles.length} Japan articles`);
      }
    } catch (error) {
      logger.warn('📰 NewsAPI Japan news failed:', error.message);
    }

    return articles;
  }

  async fetchTechNews() {
    const articles = [];
    
    try {
      // NewsAPI - 기술 뉴스
      if (this.apis.newsapi.key) {
        logger.info('📰 Fetching tech news from NewsAPI...');
        const newsApiArticles = await this.fetchFromNewsAPI('technology');
        articles.push(...newsApiArticles);
        logger.info(`📰 NewsAPI returned ${newsApiArticles.length} tech articles`);
      }
    } catch (error) {
      logger.warn('📰 NewsAPI tech news failed:', error.message);
    }

    return articles;
  }

  async fetchBusinessNews() {
    const articles = [];
    
    try {
      // NewsAPI - 비즈니스 뉴스
      if (this.apis.newsapi.key) {
        logger.info('📰 Fetching business news from NewsAPI...');
        const newsApiArticles = await this.fetchFromNewsAPI('business');
        articles.push(...newsApiArticles);
        logger.info(`📰 NewsAPI returned ${newsApiArticles.length} business articles`);
      }
    } catch (error) {
      logger.warn('📰 NewsAPI business news failed:', error.message);
    }

    return articles;
  }

  async fetchBuzzNews() {
    const articles = [];
    
    try {
      // X API - 트렌딩 뉴스
      if (this.apis.x.bearerToken) {
        logger.info('📰 Fetching buzz news from X API...');
        const xArticles = await this.fetchFromXAPI();
        articles.push(...xArticles);
        logger.info(`📰 X API returned ${xArticles.length} buzz articles`);
      }
    } catch (error) {
      logger.warn('📰 X API failed:', error.message);
    }

    // NewsAPI로 추가 엔터테인먼트 뉴스
    try {
      if (this.apis.newsapi.key) {
        const newsApiArticles = await this.fetchFromNewsAPI('entertainment');
        articles.push(...newsApiArticles);
        logger.info(`📰 NewsAPI returned ${newsApiArticles.length} entertainment articles`);
      }
    } catch (error) {
      logger.warn('📰 NewsAPI entertainment failed:', error.message);
    }

    return articles;
  }

  async fetchFromNewsAPI(category, country = 'us') {
    try {
      const params = {
        apiKey: this.apis.newsapi.key,
        category: category,
        pageSize: 20,
        sortBy: 'publishedAt'
      };

      if (country) {
        params.country = country;
      }

      const response = await axios.get(`${this.apis.newsapi.baseUrl}/top-headlines`, {
        params,
        timeout: 10000
      });

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.message}`);
      }

      return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: article.source.name,
        content: article.content,
        language: 'en',
        apiSource: 'NewsAPI'
      }));

    } catch (error) {
      logger.error('NewsAPI fetch failed:', error.message);
      return [];
    }
  }

  async fetchFromNaverAPI() {
    try {
      const response = await axios.get(this.apis.naver.baseUrl, {
        params: {
          query: '뉴스',
          display: 20,
          start: 1,
          sort: 'date'
        },
        headers: {
          'X-Naver-Client-Id': this.apis.naver.clientId,
          'X-Naver-Client-Secret': this.apis.naver.clientSecret
        },
        timeout: 10000
      });

      return response.data.items.map(item => ({
        title: this.cleanText(item.title),
        description: this.cleanText(item.description),
        url: item.link,
        urlToImage: null,
        publishedAt: new Date(item.pubDate).toISOString(),
        source: '네이버뉴스',
        content: this.cleanText(item.description),
        language: 'ko',
        apiSource: 'Naver'
      }));

    } catch (error) {
      logger.error('Naver API fetch failed:', error.message);
      return [];
    }
  }

  async fetchFromXAPI() {
    try {
      if (!this.apis.x.bearerToken) {
        logger.warn('X API bearer token not configured');
        return [];
      }

      // X API v2 - 트렌딩 토픽 검색
      const response = await axios.get(`${this.apis.x.baseUrl}/tweets/search/recent`, {
        params: {
          query: 'breaking news OR trending -is:retweet lang:en',
          max_results: 20,
          'tweet.fields': 'created_at,public_metrics,context_annotations',
          'user.fields': 'name,username,verified',
          expansions: 'author_id'
        },
        headers: {
          'Authorization': `Bearer ${this.apis.x.bearerToken}`
        },
        timeout: 10000
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data.map(tweet => ({
        title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        description: tweet.text,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        urlToImage: null,
        publishedAt: tweet.created_at,
        source: 'X (Twitter)',
        content: tweet.text,
        language: 'en',
        apiSource: 'X',
        metrics: tweet.public_metrics
      }));

    } catch (error) {
      logger.error('X API fetch failed:', error.message);
      return [];
    }
  }

  async fetchRSSArticles(section) {
    const sources = this.rssSources[section] || [];
    const articles = [];

    // RSS는 보조적으로만 사용, 실패해도 전체 서비스에 영향 없음
    for (const source of sources) {
      try {
        logger.info(`📰 [RSS Supplement] Fetching from ${source.name}...`);
        const rssArticles = await this.fetchFromRSSSource(source);
        if (rssArticles.length > 0) {
          articles.push(...rssArticles.slice(0, 5)); // RSS는 최대 5개씩만
          logger.info(`📰 [RSS Supplement] Got ${rssArticles.length} articles from ${source.name}`);
        }
      } catch (error) {
        logger.warn(`📰 [RSS Supplement] ${source.name} failed: ${error.message}`);
        // RSS 실패는 무시하고 계속 진행
        continue;
      }
    }

    return articles;
  }

  async fetchFromRSSSource(source) {
    try {
      const response = await axios.get(source.url, {
        timeout: 8000, // RSS는 짧은 타임아웃
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmarkNews/7.0; +https://emarknews.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        maxRedirects: 3
      });

      const feed = await this.parser.parseString(response.data);
      
      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      return feed.items.slice(0, 10).map(item => ({
        title: this.cleanText(item.title),
        description: this.cleanText(item.contentSnippet || item.description || ''),
        url: item.link,
        urlToImage: this.extractImageUrl(item),
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        content: this.cleanText(item.content || item.description || ''),
        language: source.language,
        apiSource: 'RSS'
      })).filter(article => article.title && article.url);

    } catch (error) {
      throw new Error(`RSS fetch failed: ${error.message}`);
    }
  }

  async processArticles(articles, section) {
    logger.info(`📰 Processing ${articles.length} articles for ${section}...`);
    
    // Remove duplicates
    const uniqueArticles = this.removeDuplicates(articles);
    
    // Sort by published date
    const sortedArticles = uniqueArticles
      .filter(article => article.title && article.url)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Enhance articles
    const enhancedArticles = sortedArticles.map(article => ({
      ...article,
      id: Buffer.from(article.url).toString('base64').substring(0, 10),
      timeAgo: this.formatTimeAgo(article.publishedAt),
      rating: this.calculateRating(article),
      tags: this.generateTags(article, section),
      titleKo: article.language === 'ko' ? article.title : article.title, // TODO: AI 번역
      descriptionKo: article.language === 'ko' ? article.description : article.description
    }));

    logger.info(`📰 Processed ${enhancedArticles.length} articles for ${section}`);
    return enhancedArticles;
  }

  calculateRating(article) {
    let rating = 3.0;
    
    // API 소스별 가중치
    if (article.apiSource === 'NewsAPI') rating += 0.3;
    if (article.apiSource === 'Naver') rating += 0.5; // 한국 뉴스는 높은 가중치
    if (article.apiSource === 'X') rating += 0.7; // 실시간 트렌드는 높은 가중치
    
    // 최신성
    const hoursSincePublished = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60);
    if (hoursSincePublished < 2) rating += 0.8;
    else if (hoursSincePublished < 6) rating += 0.4;
    else if (hoursSincePublished < 24) rating += 0.2;
    
    // 키워드 기반 중요도
    const text = (article.title + ' ' + article.description).toLowerCase();
    if (text.includes('breaking') || text.includes('urgent') || text.includes('긴급')) rating += 1.0;
    if (text.includes('important') || text.includes('major') || text.includes('중요')) rating += 0.6;
    
    // X 메트릭스 (있는 경우)
    if (article.metrics) {
      const engagement = article.metrics.retweet_count + article.metrics.like_count;
      if (engagement > 1000) rating += 0.5;
      if (engagement > 10000) rating += 0.8;
    }
    
    return Math.min(5.0, Math.max(1.0, Math.round(rating * 10) / 10));
  }

  generateTags(article, section) {
    const tags = [];
    
    // 소스 태그
    tags.push(article.source);
    
    // 섹션별 기본 태그
    switch (section) {
      case 'world': tags.push('국제'); break;
      case 'kr': tags.push('한국'); break;
      case 'japan': tags.push('일본'); break;
      case 'tech': tags.push('기술'); break;
      case 'business': tags.push('경제'); break;
      case 'buzz': tags.push('버즈'); break;
    }
    
    // API 소스별 태그
    if (article.apiSource === 'X') tags.push('실시간');
    if (article.apiSource === 'NewsAPI') tags.push('해외');
    if (article.apiSource === 'Naver') tags.push('국내');
    
    // 내용 기반 태그
    const text = (article.title + ' ' + article.description).toLowerCase();
    if (text.includes('breaking') || text.includes('긴급')) tags.push('긴급');
    if (text.includes('important') || text.includes('중요')) tags.push('중요');
    if (text.includes('trending') || text.includes('viral')) tags.push('Hot');
    
    // 최신성 태그
    const hoursSincePublished = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60);
    if (hoursSincePublished < 2) tags.push('방금');
    
    return [...new Set(tags)].slice(0, 4);
  }

  getActiveSources(section) {
    const sources = [];
    
    switch (section) {
      case 'world':
        if (this.apis.newsapi.key) sources.push('NewsAPI');
        break;
      case 'kr':
        if (this.apis.naver.clientId) sources.push('Naver API');
        break;
      case 'japan':
        if (this.apis.newsapi.key) sources.push('NewsAPI');
        break;
      case 'tech':
      case 'business':
        if (this.apis.newsapi.key) sources.push('NewsAPI');
        break;
      case 'buzz':
        if (this.apis.x.bearerToken) sources.push('X API');
        if (this.apis.newsapi.key) sources.push('NewsAPI');
        break;
    }
    
    sources.push('RSS (보조)');
    return sources;
  }

  getMockArticles(section) {
    // 기존 목업 데이터 (이전과 동일)
    const baseTime = Date.now();
    
    const mockData = {
      world: [
        {
          id: 'mock_world_1',
          title: 'Global Climate Summit Reaches Historic Agreement',
          titleKo: '세계 기후 정상회담, 역사적 합의 도달',
          description: 'World leaders announce breakthrough climate policies to combat global warming.',
          descriptionKo: '세계 지도자들이 지구온난화에 대응하기 위한 획기적인 기후 정책을 발표했습니다.',
          url: 'https://example.com/climate-summit',
          source: 'NewsAPI',
          publishedAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2시간 전',
          rating: 4.5,
          tags: ['긴급', '환경', 'NewsAPI'],
          language: 'en',
          apiSource: 'Mock'
        }
      ]
    };

    return mockData[section] || mockData.world;
  }

  // 유틸리티 메서드들 (기존과 동일)
  removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = article.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  extractImageUrl(item) {
    try {
      if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        return item['media:content']['$'].url;
      }
      if (item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$'].url) {
        return item['media:thumbnail']['$'].url;
      }
      if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);
  }

  formatTimeAgo(dateString) {
    try {
      const now = new Date();
      const published = new Date(dateString);
      const diffMs = now - published;
      
      if (diffMs < 0) return '방금 전';
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(published);
      
    } catch (error) {
      return '날짜 미상';
    }
  }

  async getCachedNews(cacheKey) {
    try {
      const client = database.getClient();
      if (!client || !client.isOpen) return null;
      
      const cached = await client.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn(`Cache read failed for ${cacheKey}:`, error.message);
    }
    return null;
  }

  async cacheNews(cacheKey, articles) {
    try {
      const client = database.getClient();
      if (!client || !client.isOpen) return;
      
      await client.setEx(cacheKey, 600, JSON.stringify(articles));
      logger.info(`📦 Cached ${articles.length} articles for ${cacheKey}`);
    } catch (error) {
      logger.warn(`Cache write failed for ${cacheKey}:`, error.message);
    }
  }

  async preloadAllSections() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    try {
      logger.info('🔄 Preloading all news sections with API-first approach...');
      
      const sections = ['world', 'kr', 'japan', 'tech', 'business', 'buzz'];
      for (const section of sections) {
        try {
          await this.getNews(section, false);
          logger.info(`✅ Preloaded ${section} section`);
        } catch (error) {
          logger.warn(`Failed to preload ${section}:`, error.message);
        }
      }
      
      logger.info('✅ API-first news preload completed');
      
    } catch (error) {
      logger.error('News preload failed:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  startBackgroundUpdates() {
    const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
    
    // Initial preload after 30 seconds
    setTimeout(() => {
      this.preloadAllSections();
    }, 30000);
    
    // Regular updates
    setInterval(() => {
      this.preloadAllSections();
    }, UPDATE_INTERVAL);
    
    logger.info('🔄 API-first background news updates started (10-minute interval)');
  }
}

module.exports = new NewsService();