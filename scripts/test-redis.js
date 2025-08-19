#!/usr/bin/env node

const path = require('path');
const redisClient = require('../src/config/redis');

async function testRedisConnection() {
  try {
    console.log('🔍 Redis 연결 테스트를 시작합니다...');
    
    // Redis 연결
    await redisClient.connect();
    
    // 테스트 데이터 저장 및 조회
    const testKey = 'test:connection';
    const testData = { 
      message: 'Redis 연결 테스트 성공!', 
      timestamp: new Date().toISOString(),
      project: 'emarknews-phoenix'
    };
    
    console.log('📝 테스트 데이터를 저장합니다...');
    await redisClient.set(testKey, testData, 60);
    
    console.log('📖 테스트 데이터를 조회합니다...');
    const retrievedData = await redisClient.get(testKey);
    
    if (retrievedData && retrievedData.message === testData.message) {
      console.log('✅ Redis 연결 및 데이터 저장/조회 테스트 성공!');
      console.log('📊 조회된 데이터:', retrievedData);
      
      // 테스트 데이터 삭제
      await redisClient.del(testKey);
      console.log('🗑️  테스트 데이터를 삭제했습니다.');
      
      // 연결 상태 출력
      const status = redisClient.getConnectionStatus();
      console.log('🔗 Redis 연결 정보:', status);
      
    } else {
      throw new Error('데이터 저장/조회 검증 실패');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Redis 연결 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
testRedisConnection();
