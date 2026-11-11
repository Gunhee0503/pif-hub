# PIF Learning Hub (pif-hub)

PIF영어 어휘·구문 학습 앱을 하나의 주소와 하나의 계정으로 묶은 정적 사이트입니다. 빌드 과정 없이 Vercel에 그대로 올립니다.

| 경로 | 내용 |
|---|---|
| `/` | 랜딩페이지 (소개 영상 포함) |
| `/learn/` | 학생 로그인 + 내 학습 홈 |
| `/fundamental/` `/essential/` `/spectrum/` | 보카트리 STEP 01~03 (기존 앱 이전) |
| `/matching/` | 부록 · 어휘 매칭 훈련 (Word Matching Practice, 20회차 100단어) |
| `/admin/` | 선생님·원장님 관리자 (승인, 학생별 진도, 단어 분석) |
| 구문의 지도 | COMPASS·BEACON은 https://syntax-beacon.vercel.app/ 로 연결 |

## 구조
- 로그인·학생·반·선생님: 구문의 지도(BEACON)와 같은 Supabase 프로젝트(`beacon-syntax`)의 `students`, `classes`, `staff`, `devices`를 함께 씁니다. BEACON에서 승인된 학생은 같은 정보로 자동 승인됩니다.
- 진도: `vt_progress` 테이블 (`vt_save_progress` RPC로만 저장)
- AI 피드백: Edge Function `vt-ai` → Claude API. 기록은 `vt_ai_feedback`.
  - 필요한 비밀값: `ANTHROPIC_API_KEY` (없으면 앱이 자기채점 모드로 동작)
  - 선택: `VT_AI_MODEL` (기본 `claude-sonnet-5-5`), `VT_WORDS_URL` (단어 데이터 위치)
- 공통 모듈: `shared/vt.js` (로그인 상태, 진도 저장, 기존 앱의 localStorage 동기화)

## Word Matching 데이터 수정
`matching/data.js` 한 파일에 문제·정답·해설이 모두 있습니다. AI 피드백 함수도 이 파일을 읽습니다.
