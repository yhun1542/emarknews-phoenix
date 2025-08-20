#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class FrontendDebugger {
  constructor() {
    this.baseUrl = 'https://emarknews.com';
    this.errors = [];
  }

  log(message) {
    console.log(`🔍 ${message}`);
  }

  error(message) {
    console.log(`❌ ${message}`);
    this.errors.push(message);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  async testFrontendHtml() {
    this.log('프론트엔드 HTML 구조 확인...');
    
    try {
      const response = await axios.get(this.baseUrl);
      const html = response.data;
      
      // JavaScript 파일 참조 확인
      const jsIncludes = html.match(/<script[^>]*src=["']([^"']*\.js)["'][^>]*>/gi);
      if (jsIncludes) {
        this.success(`JavaScript 파일 참조 발견: ${jsIncludes.length}개`);
        jsIncludes.forEach(include => {
          this.log(`  - ${include}`);
        });
      } else {
        this.error('외부 JavaScript 파일 참조가 없음!');
      }
      
      // 인라인 JavaScript 확인
      const inlineJs = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      if (inlineJs) {
        this.success(`인라인 JavaScript 발견: ${inlineJs.length}개`);
        
        // fetch API 사용 확인
        const hasFetch = html.includes('fetch(');
        if (hasFetch) {
          this.success('fetch API 사용 확인됨');
        } else {
          this.error('fetch API 사용이 확인되지 않음');
        }
        
        // loadNews 함수 확인
        const hasLoadNews = html.includes('loadNews') || html.includes('loadSection');
        if (hasLoadNews) {
          this.success('뉴스 로딩 함수 확인됨');
        } else {
          this.error('뉴스 로딩 함수가 없음');
        }
        
        // API 엔드포인트 확인
        const apiCalls = html.match(/fetch\(['"`]([^'"`]*api[^'"`]*)['"`]\)/gi);
        if (apiCalls) {
          this.success(`API 호출 코드 발견: ${apiCalls.length}개`);
          apiCalls.forEach(call => {
            this.log(`  - ${call}`);
          });
        } else {
          this.error('API 호출 코드가 없음!');
        }
        
      } else {
        this.error('JavaScript 코드가 전혀 없음!');
      }
      
      // DOM 요소 확인
      const hasNewsGrid = html.includes('news-grid');
      if (hasNewsGrid) {
        this.success('news-grid 요소 확인됨');
      } else {
        this.error('news-grid 요소가 없음');
      }
      
      const hasSystemStatus = html.includes('system-status');
      if (hasSystemStatus) {
        this.success('system-status 요소 확인됨');
      } else {
        this.error('system-status 요소가 없음');
      }
      
    } catch (error) {
      this.error(`HTML 페이지 로드 실패: ${error.message}`);
    }
  }

  async testApiDirectly() {
    this.log('API 엔드포인트 직접 테스트...');
    
    const endpoints = [
      '/health',
      '/api/news/world',
      '/api/news/kr',
      '/api/currency'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000
        });
        
        if (endpoint === '/health') {
          this.success(`${endpoint}: 정상 (${response.status})`);
          this.log(`  Health data: ${JSON.stringify(response.data)}`);
        } else if (endpoint.startsWith('/api/news/')) {
          if (response.data.success && response.data.data.articles) {
            const count = response.data.data.articles.length;
            this.success(`${endpoint}: 정상 (${count}개 기사)`);
            
            // 첫 번째 기사 구조 확인
            if (count > 0) {
              const firstArticle = response.data.data.articles[0];
              const hasRequiredFields = firstArticle.title && firstArticle.description && firstArticle.source;
              if (hasRequiredFields) {
                this.success(`  기사 구조: 정상 (title, description, source 포함)`);
              } else {
                this.error(`  기사 구조: 불완전 (필수 필드 누락)`);
              }
            }
          } else {
            this.error(`${endpoint}: 데이터 없음 또는 잘못된 응답 구조`);
            this.log(`  Response: ${JSON.stringify(response.data)}`);
          }
        } else {
          this.success(`${endpoint}: 정상 (${response.status})`);
        }
        
      } catch (error) {
        this.error(`${endpoint}: 실패 - ${error.message}`);
      }
    }
  }

  async testCORS() {
    this.log('CORS 설정 확인...');
    
    try {
      const response = await axios.options(`${this.baseUrl}/api/news/world`);
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
      };
      
      this.success('CORS 헤더 확인됨:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        this.log(`  ${key}: ${value || 'not set'}`);
      });
      
    } catch (error) {
      this.error(`CORS 테스트 실패: ${error.message}`);
    }
  }

  async generateFixedHtml() {
    this.log('수정된 HTML 생성 중...');
    
    const fixedHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 EmarkNews Phoenix</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .status {
            background: rgba(255,255,255,0.9);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .debug-info {
            background: rgba(255,255,255,0.9);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .news-sections {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .section-tab {
            background: rgba(255,255,255,0.9);
            padding: 15px 25px;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            font-weight: bold;
            border: none;
            font-size: 16px;
        }

        .section-tab:hover {
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .section-tab.active {
            background: #4CAF50;
            color: white;
        }

        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .news-item {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
            border-left: 4px solid #4CAF50;
        }

        .news-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.15);
        }

        .news-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
            line-height: 1.4;
        }

        .news-description {
            color: #7f8c8d;
            margin-bottom: 15px;
            line-height: 1.6;
        }

        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #95a5a6;
        }

        .news-source {
            font-weight: bold;
            color: #3498db;
        }

        .news-tags {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        }

        .tag {
            background: #e74c3c;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }

        .loading {
            text-align: center;
            padding: 50px;
            font-size: 18px;
            color: white;
        }

        .error {
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }

        .debug-log {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 EmarkNews Phoenix</h1>
            <p>AI-powered Real-time News Aggregator v7.0</p>
        </div>

        <div class="status">
            <h3>System Status</h3>
            <p id="system-status">Checking...</p>
        </div>

        <div class="debug-info">
            <h3>🔍 Debug Information</h3>
            <div id="debug-log" class="debug-log">Initializing debug mode...</div>
        </div>

        <div class="news-sections">
            <button class="section-tab active" onclick="loadSection('world')">🌍 World</button>
            <button class="section-tab" onclick="loadSection('kr')">🇰🇷 Korea</button>
            <button class="section-tab" onclick="loadSection('japan')">🇯🇵 Japan</button>
            <button class="section-tab" onclick="loadSection('tech')">💻 Tech</button>
            <button class="section-tab" onclick="loadSection('business')">💼 Business</button>
            <button class="section-tab" onclick="loadSection('buzz')">🔥 Buzz</button>
        </div>

        <div class="news-grid" id="news-grid">
            <div class="loading">Loading news...</div>
        </div>
    </div>

    <script>
        let currentSection = 'world';
        let debugLog = [];

        function addDebugLog(message) {
            console.log(message);
            debugLog.push(\`[\${new Date().toLocaleTimeString()}] \${message}\`);
            const debugElement = document.getElementById('debug-log');
            if (debugElement) {
                debugElement.innerHTML = debugLog.slice(-20).join('\\n');
                debugElement.scrollTop = debugElement.scrollHeight;
            }
        }

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            addDebugLog('🚀 EmarkNews 초기화 시작');
            checkSystemStatus();
            loadSection('world');
        });

        // Check system status
        async function checkSystemStatus() {
            addDebugLog('🔍 시스템 상태 확인 중...');
            try {
                const response = await fetch('/health');
                addDebugLog(\`✅ Health 엔드포인트 응답: \${response.status}\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}\`);
                }
                
                const data = await response.json();
                addDebugLog(\`📊 Health 데이터: \${JSON.stringify(data)}\`);
                
                let statusHTML = \`
                    <p>✅ Status: \${data.status}</p>
                    <p>📌 Version: \${data.version || '7.0.0'}</p>
                    <p>🔌 Redis: \${data.redis?.status || 'unknown'}</p>
                    <p>🌍 Environment: \${data.environment || 'production'}</p>
                \`;
                
                document.getElementById('system-status').innerHTML = statusHTML;
                addDebugLog('✅ 시스템 상태 업데이트 완료');
                
            } catch (error) {
                addDebugLog(\`❌ 시스템 상태 확인 실패: \${error.message}\`);
                document.getElementById('system-status').innerHTML = '<p>❌ System check failed</p>';
            }
        }

        // Load news section
        async function loadSection(section) {
            addDebugLog(\`📰 섹션 로딩 시작: \${section}\`);
            currentSection = section;
            
            // Update active tab
            document.querySelectorAll('.section-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Show loading
            document.getElementById('news-grid').innerHTML = '<div class="loading">Loading news...</div>';
            
            try {
                addDebugLog(\`🔗 API 호출: /api/news/\${section}\`);
                const response = await fetch(\`/api/news/\${section}\`);
                
                addDebugLog(\`📡 API 응답 상태: \${response.status}\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                addDebugLog(\`📊 API 데이터 수신: \${JSON.stringify(data).substring(0, 200)}...\`);
                
                if (data.success && data.data && data.data.articles) {
                    addDebugLog(\`✅ \${data.data.articles.length}개 기사 수신\`);
                    displayNews(data.data.articles);
                } else {
                    addDebugLog(\`⚠️ 예상치 못한 데이터 구조: \${JSON.stringify(data)}\`);
                    document.getElementById('news-grid').innerHTML = '<div class="error">뉴스 데이터 구조가 예상과 다릅니다</div>';
                }
            } catch (error) {
                addDebugLog(\`❌ 뉴스 로딩 실패: \${error.message}\`);
                document.getElementById('news-grid').innerHTML = \`<div class="error">네트워크 오류: \${error.message}</div>\`;
            }
        }

        // Display news articles
        function displayNews(articles) {
            addDebugLog(\`🎨 \${articles.length}개 기사 렌더링 시작\`);
            
            if (!articles || articles.length === 0) {
                document.getElementById('news-grid').innerHTML = '<div class="error">표시할 뉴스가 없습니다</div>';
                return;
            }
            
            let newsHTML = '';
            
            articles.forEach((article, index) => {
                addDebugLog(\`📄 기사 \${index + 1} 처리: \${article.title?.substring(0, 30)}...\`);
                
                const timeAgo = article.timeAgo || formatTimeAgo(article.publishedAt) || '시간 미상';
                const tags = article.tags || ['일반'];
                const rating = article.rating || 3;
                const title = article.titleKo || article.title || '제목 없음';
                const description = article.descriptionKo || article.description || '내용 없음';
                const source = article.source || 'Unknown';
                
                let tagsHTML = '';
                tags.forEach(tag => {
                    tagsHTML += \`<span class="tag">\${tag}</span>\`;
                });
                
                newsHTML += \`
                    <div class="news-item">
                        <div class="news-tags">\${tagsHTML}</div>
                        <div class="news-title">\${title}</div>
                        <div class="news-description">\${description}</div>
                        <div class="news-meta">
                            <span class="news-source">\${source}</span>
                            <span>⭐ \${rating}/5 • \${timeAgo}</span>
                        </div>
                    </div>
                \`;
            });
            
            document.getElementById('news-grid').innerHTML = newsHTML;
            addDebugLog(\`✅ \${articles.length}개 기사 렌더링 완료\`);
        }

        // Format time ago
        function formatTimeAgo(dateString) {
            try {
                if (!dateString) return '시간 미상';
                
                const now = new Date();
                const published = new Date(dateString);
                const diffMs = now - published;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                if (diffHours < 1) return '방금 전';
                if (diffHours < 24) return \`\${diffHours}시간 전\`;
                if (diffDays < 7) return \`\${diffDays}일 전\`;
                return new Date(published).toLocaleDateString('ko-KR');
            } catch (error) {
                addDebugLog(\`⚠️ 시간 포맷 오류: \${error.message}\`);
                return '날짜 미상';
            }
        }

        // Global error handler
        window.addEventListener('error', function(event) {
            addDebugLog(\`💥 전역 오류: \${event.error?.message || event.message}\`);
        });

        window.addEventListener('unhandledrejection', function(event) {
            addDebugLog(\`💥 Promise 거부: \${event.reason}\`);
        });
    </script>
</body>
</html>`;

    fs.writeFileSync('fixed-index.html', fixedHtml);
    this.success('fixed-index.html 파일 생성됨');
    this.log('이 파일을 public/index.html로 교체하세요');
  }

  async run() {
    console.log('🔍 EmarkNews 프론트엔드 디버깅 시작\n');
    
    await this.testApiDirectly();
    console.log('\n');
    
    await this.testFrontendHtml();
    console.log('\n');
    
    await this.testCORS();
    console.log('\n');
    
    await this.generateFixedHtml();
    console.log('\n');
    
    console.log('📋 오류 요약:');
    if (this.errors.length === 0) {
      console.log('✅ 오류 없음');
    } else {
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎯 해결 방법:');
    console.log('1. 생성된 fixed-index.html을 public/index.html로 교체');
    console.log('2. git add public/index.html && git commit -m "Fix frontend" && git push');
    console.log('3. 배포 완료 후 다시 테스트');
  }
}

// 실행
const frontendDebugger = new FrontendDebugger();
frontendDebugger.run().catch(console.error);