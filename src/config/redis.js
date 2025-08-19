const Redis = require('ioredis');
require('dotenv').config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      };

      // Redis URL이 있으면 우선 사용
      if (process.env.REDIS_URL) {
        this.client = new Redis(process.env.REDIS_URL);
      } else {
        this.client = new Redis(redisOptions);
      }

      this.client.on('connect', () => {
        console.log('✅ Redis에 연결되었습니다.');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis 연결 오류:', err);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Redis 연결이 종료되었습니다.');
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      console.error('Redis 초기화 오류:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) return null;
      const result = await this.client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Redis GET 오류:', error);
      return null;
    }
  }

  async set(key, value, ttl = process.env.CACHE_TTL || 3600) {
    try {
      if (!this.isConnected) return false;
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis SET 오류:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL 오류:', error);
      return false;
    }
  }

  async flushAll() {
    try {
      if (!this.isConnected) return false;
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL 오류:', error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    };
  }
}

module.exports = new RedisClient();
