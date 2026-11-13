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
  → `firstbutton/data.js`(단원·파트 쪽수, 목표, 마무리 실전 문항, 종합 진단 30문항) + `firstbutton/files/*.bin`(단원 전체·파트별·교재 전체 암호화 PDF)
- PDF는 Edge Function `hub-file`이 승인 학생(gfirst 수강)·선생님만 확인하고 내려줌. 내려받을 때마다 `hub_downloads`에 기록 → 관리자 '영상·자료' 탭, 학생 상세
- 수업 영상: 관리자 '영상·자료' 탭에서 단원별 유튜브 링크와 장면별 시작 시간을 입력 (`hub_videos`). 비어 있으면 '영상 준비 중'
- 진도: `vt_progress` course `gfirst`, unit `u01`…`ux3`, 종합 진단 `diag`
