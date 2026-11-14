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

## 문법 STEP · 출제자의 시선 (`/grammar/`)
- 데이터: `grammar/data.js` (window.GRAM). 학습지 PDF에서 자동 생성:
  `python3 tools/grammar_pdf.py 학습지.pdf [더.pdf ...]` → 같은 회차는 덮어쓰고 새 회차는 추가 (PyMuPDF 필요)
- 점수: SET당 STEP1 5 + 밑줄 5개 × (O/X 2 + 고치기·오답 2) = 25, 4 SET = 100
- 진도: vt_progress (course `grammar`, unit `b01` = 기본 01회), AI 채점: Edge Function `vt-ai` kind `grammar`
- 학습법 안내 영상: YouTube BxMEUzZn5tw (`shared/yt.js`의 GRAMMAR)
- 학습지 PDF (로그인한 사람만): `grammar/files/<b01>-student.bin`(정답 제외), `-full.bin`(정답 포함)은 AES-GCM 암호화본.
  Edge Function `hub-file`이 승인 학생(문법 수강)·선생님만 확인하고 풀어서 내려줌. 키는 함수 안에만 있음(저장소에 넣지 말 것).
  새 회차: `GRAM_PDF_KEY=<함수의 키> python3 tools/grammar_pdf.py 학습지.pdf`

## 그래머 첫단추 (`/firstbutton/`, 코스 `gfirst`)
- 데이터·PDF: `GRAM_PDF_KEY=<hub-file 함수의 키> python3 tools/firstbutton_pdf.py 그래머첫단추.pdf`
  → `firstbutton/data.js`(단원·파트 쪽수, 목표, 마무리 실전 문항, 종합 진단 30문항, Review·워크북 B 페이지의 쓰기 칸 좌표 `ov`·정답 `key`·지시문 `inst`)
  + `firstbutton/files/*.bin`(암호화: 챕터 PDF `ch01`~`ch10`·`chx1`~`chx3`(04는 4-2 포함), 교재 전체 `book`, 앱에서 보는 페이지 이미지 묶음 `v-<단원>`·`v-intro`·`v-onepage`)
- 학습은 앱 안에서: Review·워크북 B는 풀 칸을 차례로 짚어 주는 입력창(빈칸·밑줄 쓰기, 선택지 고르기, 체크), 메모 글상자 → `vt_progress`에 동기화
- 채점은 스스로: `data.js`의 `key`(Review→Summary Note, 워크북 B→워크북 A에서 칸마다 자동 추출한 정답)와 같은 칸·선택지·체크는 바로 ○,
  나머지는 '내 답 / 정답'을 나란히 보여 주고 학생이 ○ 맞음 / ✕ 틀림을 고름 → `rv`/`wb` 점수 (채점한 칸 기준)
- Summary Note·워크북 A 읽기 화면에는 태블릿용 펜·지우개(구석 옵션, 그 기기에만 저장)
- 파일은 Edge Function `hub-file`이 승인 학생(gfirst 수강)·선생님만 확인하고 내려줌. PDF를 내려받을 때만 `hub_downloads`에 기록 → 관리자 '영상·자료' 탭, 학생 상세
- 수업 영상: 관리자 '영상·자료' 탭에서 단원별 유튜브 링크와 장면별 시작 시간을 입력 (`hub_videos`). 비어 있으면 '영상 준비 중'
- 진도: `vt_progress` course `gfirst`, unit `u01`…`ux3`, 종합 진단 `diag`

## ECHO · 수업 구문 다시듣기 (`/echo/`)
- 선생님이 구문 드릴 사이트(syntax_drill)에서 수업을 **반 지정 + 날짜**로 저장하면 그 반 학생에게 공개됩니다.
- 학생: `/learn/` 홈 위쪽 얇은 ECHO 띠(공개 수업이 있을 때만) → `/echo/` 에서 전체듣기·끊어듣기·직독직해, 속도, 별표 문장.
- 관리자: 학생 상세 맨 아래 접힌 "부가 기능 · ECHO" (수업별 기록, 반 전체 보기). 본 과정 진도와 따로 표시합니다.
- 데이터는 syntax-drill Supabase 프로젝트에 저장되고, `shared/echo.js`가 허브 로그인 토큰(`x-hub-token`)으로 `echo` 함수를 호출합니다.
