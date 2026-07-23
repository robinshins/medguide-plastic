# CLAUDE.md

이 저장소는 `medguide-core`에서 생성된 5개 형제 사이트 중 하나입니다.

## 절대 규칙: 공유 파일은 여기서 고치지 않는다

이 프로젝트의 파일 대부분은 `/Users/singyuseob/Dev/medguide-core/template/`의 사본입니다.
버그를 발견하면 **medguide-core/template에서 고치고 `./sync.sh`로 재배포**하세요. 여기서
직접 고치면 다음 sync 때 덮어써지거나, 다른 4개 사이트에 같은 버그가 남습니다.

이 프로젝트에서 직접 수정해도 되는 파일 (sync 대상 제외):
- `src/lib/site.config.ts` — 사이트 정체성·진료항목·스크래핑 힌트 (원본: `medguide-core/sites/<key>/config.ts`)
- `src/design/tokens.ts` — 디자인 토큰 (원본: `medguide-core/sites/<key>/tokens.ts`)
- `src/app/globals.css` — `.article-content` 조판 (사이트별 구조가 다름)
- `src/app/page.tsx` + `src/app/components/{brand,icons,decor,home}/` — 사이트별 홈·아트
- `src/lib/blog.ts`, `src/lib/pricing-data.ts` — 사이트별 콘텐츠
- `design/source/og.svg`, `src/app/icon.svg`, `public/og/` — 사이트별 에셋
- `.env.local`, 서비스 계정 JSON

단, 위 파일도 원본이 `medguide-core/sites/<key>/`에 있으면 **그쪽을 고치고 sync**하는 것이 정본입니다.

## 아키텍처 요약

- **한국어 전용, 언어 세그먼트 없음.** URL은 `/{slug}` (글), `/s/{specialty}` (목록).
- **Firestore**: 공유 프로젝트 `medicalkorea-2205a`, 컬렉션은 전부 `_{SITE.key}` 접미사
  (`keywords_X` / `articles_X` / `artindex_X` / `comments_X`). `src/lib/collections.ts`에서
  파생되며 리터럴 컬렉션명은 금지. 기존 사이트의 `keywords`, `keywords_beauty`, `articles`,
  `articles_derma`, `articles-index`, `articles_index`, `comments`에는 절대 쓰지 않는다.
- **글 문서 id = slug.** 인덱스는 진료항목별 샤드(`artindex_X/{specialtySlug}`) + `_latest`.
- **발행 파이프라인은 `scripts/publish.ts` 하나.** (tsx 실행, `src/lib`와 타입 공유)
  글 생성 모델은 `gpt-5.4`(Responses API, structured outputs). 번역 없음.
  실측 글당 ~14K 토큰(입력 5.3K / 출력 8.6K). OpenAI 무료 한도 1M/일 = 약 71건이라
  5사이트 × 12회 = 60건/일이 한도 안에 들어온다. 초과분은 표준 요금이며 luna보다
  비싸므로, 발행 횟수를 늘리려면 먼저 토큰 실측을 다시 해야 한다.
- 큐 재시도: 실패 시 `pending` 복귀, `MAX_ATTEMPTS`(3) 초과 시 `failed`.
  1시간 이상 `in_progress`면 자동 회수.

## 명령어

```bash
npm run dev               # localhost:3000
npm run seed              # 키워드 큐 시딩 (멱등)
npm run publish:articles -- --count=3 --distinct-region --no-delay --no-indexnow
npm run verify            # 발행 결과 검증 (dev 서버 필요)
npm run assets            # SVG → PNG 에셋 재생성
npm run lint:brand        # 타 팔레트 클래스 검출
```

로컬 실행에는 프로젝트 루트에 `medicalkorea-2205a-firebase-adminsdk-*.json`(git 미포함)과
`.env.local`(`OPENAI_API_KEY` 등)이 필요합니다.

## Cron 활성화

`.github/workflows/publish.yml`은 저장소 변수 `PUBLISH_ENABLED=true`를 설정하기 전까지
스케줄 실행이 무동작입니다. 필요한 Secrets: `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
`CRON_SECRET`. Variables: `PUBLISH_ENABLED`, `SITE_URL`.
