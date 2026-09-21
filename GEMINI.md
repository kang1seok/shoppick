# ShopPick Project Rules

## 프로젝트 개요
ShopPick은 쿠팡파트너스 API를 활용한 AI 자동화 쇼핑 가이드 사이트입니다.
매일 새벽에 키워드를 수집하고, 쿠팡 상품을 매칭하고, AI가 비교 추천 글을 자동 생성합니다.

## 기술 스택
- Framework: Next.js 15 (App Router) + TypeScript
- Styling: TailwindCSS + shadcn/ui
- Database: Supabase (PostgreSQL)
- AI: OpenAI GPT-4o API
- Affiliate: 쿠팡파트너스 API (HMAC 서명)
- Keyword: 네이버 DataLab API
- Deploy: Vercel
- Cron: Vercel Cron Jobs

## 코딩 규칙
- 모든 함수에 TypeScript 타입 명시 (any 금지)
- API 키는 절대 프론트엔드에 노출 금지 (서버 환경변수만 사용)
- 모든 외부 API 호출에 try-catch 에러 처리 필수
- 쿠팡 API 응답은 24시간 캐싱 (Supabase에 저장)
- AI 생성 글에 "사용해봤다", "경험상" 등 허위 표현 금지
- 모든 페이지 하단에 파트너스 고지문 자동 삽입
- 환경변수는 .env.local에만 저장 (.gitignore에 포함)
- 컴포넌트는 기능별로 분리 (재사용성)
- 한국어 UI (사용자 대상) + 영어 코드 주석

## 디렉토리 구조
app/ → Next.js App Router 페이지
components/ → React 컴포넌트
lib/ → 비즈니스 로직 (API 클라이언트, DB 쿼리, 파이프라인)
├── coupang/ → 쿠팡 API 클라이언트
├── naver/ → 네이버 API 클라이언트
├── ai/ → AI 콘텐츠 생성
├── supabase/ → DB 쿼리
└── pipeline/ → 자동화 파이프라인 엔진

## 테스트 명령어
- `npm run build` → 빌드 검증
- `npm run lint` → 린트 검사
- `npx tsc --noEmit` → 타입 체크

## 주의사항
- 쿠팡파트너스 API는 HMAC 서명 필요 (Access Key + Secret Key)
- 네이버 DataLab API는 키워드 추세 조회용 (새 키워드 발굴용 아님)
- AI 프롬프트는 상품 데이터에 없는 정보 생성 금지 (hallucination 방지)
- 초기 발행은 수동 검수 후 발행 (자동 발행 금지)
