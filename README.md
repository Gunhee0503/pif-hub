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
- 난이도 두 가지: **기본**(CEFR A2, unit `b01`~) · **실력**(CEFR B2, unit `s01`~). 레벨·회차는 파일명(`문법STEP학습지_12회_실력_….pdf`)에서 읽음
- 진도: vt_progress (course `grammar`, unit `b01` = 기본 01회, `s01` = 실력 01회), AI 채점: Edge Function `vt-ai` kind `grammar`
- 학습법 안내 영상: YouTube BxMEUzZn5tw (`shared/yt.js`의 GRAMMAR)
- 학습지 PDF (로그인한 사람만): 사이트가 아니라 **Supabase Storage 비공개 버킷 `hub-files/grammar/<b01|s01>-student.bin`**(정답 제외)·`-full.bin`(정답 포함)에 AES-GCM 암호화본으로 저장.
  Edge Function `hub-file`이 승인 학생(문법 수강)·선생님만 확인하고 풀어서 내려주고, 내려받기마다 `hub_downloads`에 기록. 키는 함수 안에만 있음(저장소에 넣지 말 것).
  새 회차: `GRAM_PDF_KEY=<함수의 키> GRAM_OUT=/tmp/gramout python3 tools/grammar_pdf.py 학습지.pdf` → data.js 갱신 + `/tmp/gramout/*.bin`을 Storage `hub-files/grammar/`에 업로드 (대시보드 Storage에서 끌어다 놓아도 됨)

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

## 자기주도 학습 (랜딩 `#selfstudy`·`#method`, 학생 홈 '독해 과제 가이드')
- `shared/selfstudy.js` (window.PIFSS): 교재 로드맵 STEP 1~8 · 독해 과제 검사 기준(A+~F, N/A) · 어휘 정리 노트 작성법 + defy 실전 연습
- 랜딩: 로드맵 섹션 + 학습 방법 아래 검사 기준 요약·노트 작성법(펼치기). 학생 홈: 상단 카드 → 모달(검사 기준 전체/노트/로드맵)
- 교재 표지: `assets/books/*.webp` (교재선정 가이드 PDF에서 잘라냄)

## 어휘요약문 로드맵 STEP 2 · 온더웨이 ON THE WAY (`/ydvoca/#/otw/s1/1`)
- 어휘요약문 반(ydvoca) 전용. 시즌 없는 단편(한 권) Day 01~07, 잠금 없음 (내부 진도 id만 `s1`). 영상 강의 없이 연습·리뷰 테스트·오답 중심 (관리자 '어휘요약문 로드맵' 탭 영상 표에서 Day별 해설 영상을 선택으로 붙일 수 있음, unit `otw-s1dN`)
- 데이터: `ydvoca/otw.js` (window.OTW) — 교재 리마스터 데이터(final.json)와 Part 1 해설(expl.py)에서 `export_otw.py`로 생성. 앱 코드: `ydvoca/otw-app.js`, 관리자: `admin/otw-admin.js`
- 진도: vt_progress course `ydvoca`, unit `s1d1-p`(연습: 문항별 맞음 1 / 틀림 0 — 연습·오답·앱 시험 결과 모두 반영, 오답 목록 = 0), `s1d1-test`(리뷰 테스트 attempts·best·passed·paper)
- 채점: 직접 쓰기, 대소문자·띄어쓰기 무시, (ed)·(s) 어미는 붙여 써도 정답, Part 1은 앞글자 빼고 써도 정답
- 통과: **Part 1 동의어·반의어 70% 이상(20문항 중 14개)**. 점수는 전체 맞은 개수 ÷ 문항 수 × 100. 재시험은 문항·묶음 순서를 섞음
- 종이 시험: 관리자 → `vt_staff_otw_paper` RPC (Part별 맞은 개수·문항 수 → 100점 환산·통과 자동 계산)
- 파일(`ydvoca/files/otw-*.bin`, AES-GCM, hub-file 함수가 풀어 줌): `otw-book` 교재, `otw-t1`~`t7` 리뷰 테스트지(학생도), `otw-a1`~`a7` 정답지(선생님만)

## 어휘요약문 로드맵 STEP 3 · 피날레 FINALE (`/ydvoca/#/fin/s1/1`)
- **시즌제** — 1학기·2학기 구분 없이 Season 1 → 2 → … 로 계속 추가. 시즌마다 실전연습 1~7회(회차당 20문항). Season 2는 19번 <보기>에서 들어갈 수 없는 단어 고르기(`bogi`), 20번 지문 속 빈칸(`inpas`) 포함
- 새 시즌 추가: `export_fin.py`에 시즌 데이터 추가 → `finale.js`, 파일은 `fin-s<N>-book` · `fin-s<N>-t1~7`(문항만) · `fin-s<N>-a1~7`(정답·해설 포함). hub-file 함수는 `fin-s2`~`fin-s9`를 받음, 종이 시험 RPC는 `s1~s9`
- **누적 오답 테스트** (`#/fin/cum/s2`): Season N 화면에서 Season 1~N-1의 자주 틀린 문항(지금도 틀린 채 남은 빈칸이 있거나 어떤 빈칸을 2번 이상 틀린 문항 — 리뷰 테스트 오답 + 연습 `wc` 틀린 횟수)을 많이 틀린 순서로 20문항씩. 채점 후 학생이 '완성!'을 체크해 직접 빼고(`fin-cum.rm`), '뺀 단어'에서 다시 넣기. 결과는 그 회차 연습 기록(st·wc)에도 반영
- 누적 오답 시험지 출력 (`ydvoca/fin-print.js`, 학생 앱·관리자가 함께 씀): 학생은 누적 오답 카드·테스트 화면의 '🖨 시험지 출력'(지금 문항 20개 + 정답 쪽), 선생님은 학생 상세의 '누적 오답 시험지 출력'(모든 시즌의 자주 틀린 문항 + 정답·해설 쪽). 학생이 뺀 문항은 제외
- 시즌 안내 팝업(localStorage `pif_fin_notice_v1`, 홈의 'ⓘ 시즌 안내'로 다시 보기)
- 어휘요약문 반(ydvoca) 전용. 잠금 없음. 영상 없이 연습·리뷰 테스트·오답 중심 (관리자 영상 표에서 회차별 해설 영상을 선택으로 붙일 수 있음, unit `fin-s1rN`)
- 데이터: `ydvoca/finale.js` (window.FIN) — 교재 리마스터 데이터와 문항별 상세 해설(풀이 흐름·빈칸별 뜻·지문 근거·포인트)을 `export_fin.py`로 생성. 앱 코드: `ydvoca/fin-app.js`(otw-app.js의 채점 함수 사용), 관리자: `admin/fin-admin.js`
- 진도: unit `s1r1-p`(연습: 빈칸별 맞음 1 / 틀림 0 — `q01A` 형식, `wc` 틀린 횟수), `s1r1-test`(리뷰 테스트 attempts·best·passed·paper)
- 배점: 100점 만점 · 문항당 100/문항 수(5점) · 빈칸 2개 문항은 빈칸마다 절반. **통과 70점 이상**. 재시험은 문항 순서를 섞음
- 채점: 첫 글자 빼고 써도 정답, (s) 붙여도 정답, 복수 정답(transmission / contagion 등)·judgement/judgment 모두 인정
- 종이 시험: 관리자 → `vt_staff_fin_paper` RPC (점수 0~100, 0.5점 단위 → 통과 자동)
- 파일(`ydvoca/files/fin-*.bin`): Season 1 `fin-book` 교재(이미지 압축본), `fin-t1`~`t7` 리뷰 테스트지(학생도), `fin-a1`~`a7` 정답·해설지(선생님만) · Season 2 `fin-s2-book`, `fin-s2-t1`~`t7` 리뷰 테스트지, `fin-s2-a1`~`a7` 정답·해설지(선생님만), 누적 오답 진도 unit `fin-cum`

## 내신 진단 · 처방 (어휘요약문 로드맵)

- `admin/diag.js` — 학생이 쓴 답으로 오답 유형(철자 · 형태(품사) · 의미 · 빈칸)을 나누고, 영역별 정답률 · 자주 틀린 단어(기출 빈출 먼저) · 한 줄 진단 · 처방 추천을 만든다.
- 학생 상세(서랍) → **내신 진단 · 처방** 카드: 처방 보내기 / 직접 쓰기 + 기한, 보낸 처방 목록(완료 여부), **오답 맞춤 시험지 출력**(정답 페이지 포함, 브라우저 인쇄).
- 어휘요약문 로드맵 탭 → **반 히트맵**(BC1–4 · D1–7 · F1–7, 통과/재시험/불통과/안 함 + 최고점), **주의 학생**(7일 이상 미활동 · 재시험 2번 이상 불통과 · 남은 오답 15개 이상 · 연습 없이 시험만), **이번 주 요약**(응시·통과, 반 오답 유형, 반 전체가 많이 틀린 단어).
- 처방은 `hub_assignments` 테이블(RLS: 학생 본인 읽기, 담당 관리자 쓰기). 학생은 `/ydvoca/` 맨 위 **선생님 처방** 카드에서 보고 `hub_assignment_done` RPC로 "다 했어요".
- AI 리포트: `buildFacts`에 `F.내신진단`(한 줄 진단 · 주의 · 오답 유형 · 약한 영역 · 자주 틀린 단어 · 추천 처방)이 들어간다. AI 초안 → 강사 수정 → 강사가 공유 여부 선택.
