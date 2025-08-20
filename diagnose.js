#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// 이모지
const emoji = {
    check: '✅',
    cross: '❌',
    warning: '⚠️',
    rocket: '🚀',
    gear: '⚙️',
    news: '📰',
    currency: '💱',
    youtube: '📺',
    api: '🔗',
    server: '🖥️',
    database: '🗄️'
};

class EmarkNewsDiagnostic {
    constructor() {
        this.baseUrl = 'https://emarknews.com';
        this.results = [];
        this.startTime = Date.now();
    }

    log(message, color = 'white', symbol = '') {
        const colorCode = colors[color] || colors.white;
        console.log(`${colorCode}${symbol} ${message}${colors.reset}`);
    }

    logSuccess(message) {
        this.log(message, 'green', emoji.check);
    }

    logError(message) {
        this.log(message, 'red', emoji.cross);
    }

    logWarning(message) {
        this.log(message, 'yellow', emoji.warning);
    }

    logInfo(message) {
        this.log(message, 'cyan', emoji.gear);
    }

    addResult(test, status, details = '', responseTime = null) {
        this.results.push({
            test,
            status,
            details,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }

    async measureResponseTime(asyncFunction) {
        const start = Date.now();
        try {
            const result = await asyncFunction();
            const responseTime = Date.now() - start;
            return { result, responseTime, success: true };
        } catch (error) {
            const responseTime = Date.now() - start;
            return { error, responseTime, success: false };
        }
    }

    async testBasicConnectivity() {
        this.log('\n=== 기본 연결성 테스트 ===', 'magenta');
        
        const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/`, { timeout: 10000 });
        });

        if (success) {
            this.logSuccess(`웹사이트 접근 가능 (${responseTime}ms)`);
            this.addResult('Basic Connectivity', 'PASS', `Status: ${result.status}`, responseTime);
        } else {
            this.logError(`웹사이트 접근 실패: ${error.message}`);
            this.addResult('Basic Connectivity', 'FAIL', error.message, responseTime);
        }
        
        return success;
    }

    async testHealthEndpoint() {
        this.log('\n=== 헬스체크 엔드포인트 테스트 ===', 'magenta');
        
        const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/health`, { timeout: 10000 });
        });

        if (success) {
            this.logSuccess(`헬스체크 성공 (${responseTime}ms)`);
            this.logInfo(`서버 상태: ${JSON.stringify(result.data, null, 2)}`);
            this.addResult('Health Check', 'PASS', JSON.stringify(result.data), responseTime);
            return result.data;
        } else {
            this.logError(`헬스체크 실패: ${error.message}`);
            this.addResult('Health Check', 'FAIL', error.message, responseTime);
            return null;
        }
    }

    async testNewsAPI() {
        this.log('\n=== 뉴스 API 테스트 ===', 'magenta');
        
        const sections = ['world', 'kr', 'japan', 'tech', 'business', 'buzz'];
        let successCount = 0;
        
        for (const section of sections) {
            const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
                return await axios.get(`${this.baseUrl}/api/news/${section}`, { timeout: 15000 });
            });

            if (success) {
                const articleCount = result.data?.data?.articles?.length || 0;
                if (articleCount > 0) {
                    this.logSuccess(`${section.toUpperCase()}: ${articleCount}개 기사 (${responseTime}ms)`);
                    successCount++;
                } else {
                    this.logWarning(`${section.toUpperCase()}: 기사 없음 (${responseTime}ms)`);
                    this.logInfo(`응답 데이터: ${JSON.stringify(result.data, null, 2)}`);
                }
                this.addResult(`News API - ${section}`, articleCount > 0 ? 'PASS' : 'EMPTY', 
                    `Articles: ${articleCount}`, responseTime);
            } else {
                this.logError(`${section.toUpperCase()}: API 오류 - ${error.message}`);
                this.addResult(`News API - ${section}`, 'FAIL', error.message, responseTime);
            }
        }
        
        this.logInfo(`뉴스 API 성공률: ${successCount}/${sections.length}`);
        return successCount;
    }

    async testCurrencyAPI() {
        this.log('\n=== 환율 API 테스트 ===', 'magenta');
        
        const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/api/currency`, { timeout: 10000 });
        });

        if (success) {
            const hasRates = result.data?.data?.rates ? Object.keys(result.data.data.rates).length : 0;
            if (hasRates > 0) {
                this.logSuccess(`환율 정보 ${hasRates}개 통화 (${responseTime}ms)`);
                this.addResult('Currency API', 'PASS', `Currencies: ${hasRates}`, responseTime);
            } else {
                this.logWarning(`환율 데이터 없음 (${responseTime}ms)`);
                this.addResult('Currency API', 'EMPTY', 'No currency data', responseTime);
            }
        } else {
            this.logError(`환율 API 실패: ${error.message}`);
            this.addResult('Currency API', 'FAIL', error.message, responseTime);
        }
        
        return success;
    }

    async testYouTubeAPI() {
        this.log('\n=== 유튜브 API 테스트 ===', 'magenta');
        
        const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/api/youtube/world`, { timeout: 10000 });
        });

        if (success) {
            const videoCount = result.data?.data?.videos?.length || 0;
            if (videoCount > 0) {
                this.logSuccess(`유튜브 비디오 ${videoCount}개 (${responseTime}ms)`);
                this.addResult('YouTube API', 'PASS', `Videos: ${videoCount}`, responseTime);
            } else {
                this.logWarning(`유튜브 데이터 없음 (${responseTime}ms)`);
                this.addResult('YouTube API', 'EMPTY', 'No video data', responseTime);
            }
        } else {
            this.logError(`유튜브 API 실패: ${error.message}`);
            this.addResult('YouTube API', 'FAIL', error.message, responseTime);
        }
        
        return success;
    }

    async testRSSFeeds() {
        this.log('\n=== RSS 피드 직접 테스트 ===', 'magenta');
        
        const rssFeeds = [
            { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
            { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best' },
            { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/news.xml' },
            { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' }
        ];

        let successCount = 0;

        for (const feed of rssFeeds) {
            const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
                return await axios.get(feed.url, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'EmarkNews/7.0 (Diagnostic Tool)'
                    }
                });
            });

            if (success) {
                this.logSuccess(`${feed.name}: 접근 가능 (${responseTime}ms)`);
                successCount++;
                this.addResult(`RSS Feed - ${feed.name}`, 'PASS', `Size: ${result.data.length} bytes`, responseTime);
            } else {
                this.logError(`${feed.name}: 접근 실패 - ${error.message}`);
                this.addResult(`RSS Feed - ${feed.name}`, 'FAIL', error.message, responseTime);
            }
        }

        this.logInfo(`RSS 피드 성공률: ${successCount}/${rssFeeds.length}`);
        return successCount;
    }

    async testExternalAPIs() {
        this.log('\n=== 외부 API 테스트 ===', 'magenta');
        
        const externalAPIs = [
            { 
                name: 'OpenAI API', 
                test: async () => {
                    if (!process.env.OPENAI_API_KEY) {
                        throw new Error('OPENAI_API_KEY not configured');
                    }
                    return { configured: true };
                }
            },
            {
                name: 'Exchange Rate API',
                test: async () => {
                    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
                    return response.data;
                }
            }
        ];

        for (const api of externalAPIs) {
            const { result, error, responseTime, success } = await this.measureResponseTime(api.test);
            
            if (success) {
                this.logSuccess(`${api.name}: 정상 (${responseTime}ms)`);
                this.addResult(`External API - ${api.name}`, 'PASS', '', responseTime);
            } else {
                this.logWarning(`${api.name}: ${error.message}`);
                this.addResult(`External API - ${api.name}`, 'FAIL', error.message, responseTime);
            }
        }
    }

    async testDatabaseConnection() {
        this.log('\n=== 데이터베이스 연결 테스트 ===', 'magenta');
        
        // Health 엔드포인트에서 Redis 상태 확인
        const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
        });

        if (success && result.data.redis) {
            const redisStatus = result.data.redis.status;
            if (redisStatus === 'connected') {
                this.logSuccess(`Redis: 연결됨 (${responseTime}ms)`);
                this.addResult('Database - Redis', 'PASS', 'Connected', responseTime);
            } else {
                this.logWarning(`Redis: ${redisStatus}`);
                this.addResult('Database - Redis', 'WARNING', redisStatus, responseTime);
            }
        } else {
            this.logError('Redis: 상태 확인 불가');
            this.addResult('Database - Redis', 'FAIL', 'Status check failed', responseTime);
        }
    }

    async testFrontendResources() {
        this.log('\n=== 프론트엔드 리소스 테스트 ===', 'magenta');
        
        const resources = [
            '/',
            '/favicon.ico'
        ];

        for (const resource of resources) {
            const { result, error, responseTime, success } = await this.measureResponseTime(async () => {
                return await axios.get(`${this.baseUrl}${resource}`, { timeout: 5000 });
            });

            if (success) {
                this.logSuccess(`${resource}: 로드 성공 (${responseTime}ms, ${result.data.length} bytes)`);
                this.addResult(`Frontend - ${resource}`, 'PASS', `Size: ${result.data.length}`, responseTime);
            } else {
                this.logError(`${resource}: 로드 실패 - ${error.message}`);
                this.addResult(`Frontend - ${resource}`, 'FAIL', error.message, responseTime);
            }
        }
    }

    async performAdvancedDiagnostics() {
        this.log('\n=== 고급 진단 ===', 'magenta');
        
        // 1. 메모리 사용량 체크 (헬스 엔드포인트에서)
        const { result } = await this.measureResponseTime(async () => {
            return await axios.get(`${this.baseUrl}/health`);
        });

        if (result?.data?.memory) {
            const memory = result.data.memory;
            const memoryUsageMB = Math.round(memory.heapUsed / 1024 / 1024);
            const memoryLimitMB = Math.round(memory.heapTotal / 1024 / 1024);
            
            this.logInfo(`메모리 사용량: ${memoryUsageMB}MB / ${memoryLimitMB}MB`);
            
            if (memoryUsageMB / memoryLimitMB > 0.9) {
                this.logWarning('메모리 사용량이 높습니다');
            }
        }

        // 2. 응답 시간 분석
        const avgResponseTime = this.results
            .filter(r => r.responseTime !== null)
            .reduce((sum, r) => sum + r.responseTime, 0) / 
            this.results.filter(r => r.responseTime !== null).length;
            
        this.logInfo(`평균 응답 시간: ${Math.round(avgResponseTime)}ms`);
        
        if (avgResponseTime > 5000) {
            this.logWarning('응답 시간이 느립니다 (5초 이상)');
        }
    }

    generateReport() {
        this.log('\n=== 진단 결과 리포트 ===', 'magenta');
        
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const warningTests = this.results.filter(r => r.status === 'WARNING' || r.status === 'EMPTY').length;

        this.log(`\n총 테스트: ${totalTests}`, 'white');
        this.logSuccess(`통과: ${passedTests}`);
        this.logError(`실패: ${failedTests}`);
        this.logWarning(`경고: ${warningTests}`);

        const totalTime = Date.now() - this.startTime;
        this.log(`\n총 소요 시간: ${totalTime}ms`, 'cyan');

        // 실패한 테스트들 요약
        const failedDetails = this.results.filter(r => r.status === 'FAIL');
        if (failedDetails.length > 0) {
            this.log('\n🚨 실패한 테스트들:', 'red');
            failedDetails.forEach(test => {
                this.log(`  • ${test.test}: ${test.details}`, 'red');
            });
        }

        // 경고 테스트들 요약
        const warningDetails = this.results.filter(r => r.status === 'WARNING' || r.status === 'EMPTY');
        if (warningDetails.length > 0) {
            this.log('\n⚠️ 주의가 필요한 항목들:', 'yellow');
            warningDetails.forEach(test => {
                this.log(`  • ${test.test}: ${test.details}`, 'yellow');
            });
        }

        // 권장 해결책
        this.generateRecommendations();

        // 상세 리포트 파일 저장
        this.saveDetailedReport();
    }

    generateRecommendations() {
        this.log('\n=== 권장 해결책 ===', 'magenta');
        
        const newsAPIFailed = this.results.some(r => r.test.includes('News API') && r.status === 'FAIL');
        const newsAPIEmpty = this.results.some(r => r.test.includes('News API') && r.status === 'EMPTY');
        const rssFailures = this.results.filter(r => r.test.includes('RSS Feed') && r.status === 'FAIL').length;
        
        if (newsAPIFailed) {
            this.log('📰 뉴스 API 문제 해결책:', 'yellow');
            this.log('  1. Railway 로그 확인: railway logs', 'white');
            this.log('  2. 서버 재시작: railway restart', 'white');
            this.log('  3. 환경 변수 확인', 'white');
        }

        if (newsAPIEmpty) {
            this.log('📰 뉴스 데이터 없음 해결책:', 'yellow');
            this.log('  1. RSS 피드 URL 확인', 'white');
            this.log('  2. 외부 API 키 설정 확인', 'white');
            this.log('  3. 네트워크 방화벽 확인', 'white');
        }

        if (rssFailures > 2) {
            this.log('🌐 RSS 피드 문제 해결책:', 'yellow');
            this.log('  1. 서버의 외부 네트워크 접근 확인', 'white');
            this.log('  2. User-Agent 헤더 설정 확인', 'white');
            this.log('  3. 대체 RSS 피드 URL 사용', 'white');
        }

        const redisIssue = this.results.some(r => r.test.includes('Redis') && r.status !== 'PASS');
        if (redisIssue) {
            this.log('🗄️ Redis 문제 해결책:', 'yellow');
            this.log('  1. Railway에서 Redis 서비스 추가', 'white');
            this.log('  2. REDIS_URL 환경 변수 설정', 'white');
            this.log('  3. Redis 없이도 작동하도록 코드 확인', 'white');
        }
    }

    saveDetailedReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            url: this.baseUrl,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'PASS').length,
                failed: this.results.filter(r => r.status === 'FAIL').length,
                warnings: this.results.filter(r => r.status === 'WARNING' || r.status === 'EMPTY').length
            },
            tests: this.results,
            duration: Date.now() - this.startTime
        };

        const reportPath = path.join(process.cwd(), `emarknews-diagnostic-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
            this.logInfo(`상세 리포트 저장됨: ${reportPath}`);
        } catch (error) {
            this.logWarning(`리포트 저장 실패: ${error.message}`);
        }
    }

    async runFullDiagnostic() {
        this.log('🚀 EmarkNews 시스템 진단 시작', 'cyan');
        this.log(`대상 URL: ${this.baseUrl}`, 'cyan');
        this.log(`시작 시간: ${new Date().toLocaleString()}`, 'cyan');

        try {
            // 기본 연결성 테스트
            const basicOK = await this.testBasicConnectivity();
            if (!basicOK) {
                this.logError('기본 연결 실패. 서버가 다운되었을 수 있습니다.');
                return;
            }

            // 헬스체크
            await this.testHealthEndpoint();

            // API 테스트들
            await this.testNewsAPI();
            await this.testCurrencyAPI();
            await this.testYouTubeAPI();

            // 외부 연결 테스트
            await this.testRSSFeeds();
            await this.testExternalAPIs();

            // 인프라 테스트
            await this.testDatabaseConnection();
            await this.testFrontendResources();

            // 고급 진단
            await this.performAdvancedDiagnostics();

            // 리포트 생성
            this.generateReport();

        } catch (error) {
            this.logError(`진단 중 치명적 오류: ${error.message}`);
        }
    }
}

// 메인 실행
async function main() {
    const diagnostic = new EmarkNewsDiagnostic();
    await diagnostic.runFullDiagnostic();
}

// CLI에서 실행된 경우
if (require.main === module) {
    main().catch(console.error);
}

module.exports = EmarkNewsDiagnostic;