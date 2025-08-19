# Railway Redis 설정 가이드

## 1. Railway Redis 플러그인 추가

1. Railway 대시보드에 접속
2. 프로젝트 선택
3. "Plugins" 탭 클릭
4. "Redis" 플러그인 추가

## 2. 환경 변수 자동 설정 확인

Redis 플러그인 추가 후 다음 환경 변수들이 자동으로 생성됩니다:

- `REDIS_URL` (완전한 연결 URL)
- `REDIS_HOST` (호스트 주소)  
- `REDIS_PORT` (포트 번호)
- `REDIS_PASSWORD` (인증 비밀번호)

## 3. 추가 환경 변수 설정

Railway 대시보드에서 다음 환경 변수를 수동으로 추가하세요:

```
CACHE_TTL=3600
REDIS_DB=0
```

## 4. 배포

설정 완료 후 애플리케이션을 재배포하면 Redis가 자동으로 연결됩니다.

## 5. 연결 확인

배포 후 `/health` 엔드포인트에 접속하여 Redis 연결 상태를 확인하세요:

```json
{
  "status": "OK",
  "timestamp": "2024-XX-XX...",
  "redis": {
    "isConnected": true,
    "url": "redis://redis-xxx.railway.app:6379"
  }
}
```
