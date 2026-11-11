/* 다의어 한방에! (보카트리 유튜브 재생목록) — 공통 데이터와 플레이어
   - 처음엔 썸네일만 보여 주고, 누를 때 youtube-nocookie 플레이어를 띄움 (페이지 로딩 가볍게)
   - rel=0: 끝난 뒤 다른 채널 추천 영상이 뜨지 않게 */
(function () {
  var PLAYLIST = 'PLAp8vDbFmu2g';
  var EPS = [
    { id: '-nwkCQ9WGJU', no: '001', word: 'Charge' },
    { id: 'E848zLKzh-M', no: '002', word: 'Tribute' },
    { id: 'DdzGbd5pnzQ', no: '003', word: 'Subject' },
    { id: 'SK3z98TaDbQ', no: '004', word: 'Account' },
    { id: 'nLFUQmmprpI', no: '005', word: 'Attend' }
  ];
  function thumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
  function src(id, auto, list) { return 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1&playsinline=1' + (auto ? '&autoplay=1' : '') + (list ? '&list=' + list : ''); }
  /* 문법 · 출제자의 시선 학습법 안내 (재생목록 밖 단독 영상) */
  var GRAMMAR = { id: 'BxMEUzZn5tw', word: '출제자의 시선 학습법 안내', title: '[문법] 출제자의 시선 · 학습법 안내', list: '' };
  /* box 안을 썸네일 → 클릭 시 플레이어로 */
  function mount(box, ep) {
    box.innerHTML = '<button type="button" class="yt-face" aria-label="' + ep.word + ' 영상 재생" style="position:absolute;inset:0;border:0;padding:0;cursor:pointer;background:#000 url(' + thumb(ep.id) + ') center/cover no-repeat">' +
      '<span style="position:absolute;left:50%;top:50%;width:68px;height:48px;margin:-24px 0 0 -34px;border-radius:14px;background:rgba(255,0,0,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.35)">' +
      '<span style="width:0;height:0;border-left:18px solid #fff;border-top:11px solid transparent;border-bottom:11px solid transparent;margin-left:4px"></span></span></button>';
    box.firstChild.onclick = function () {
      box.innerHTML = '<iframe src="' + src(ep.id, true, ep.list != null ? ep.list : PLAYLIST) + '" title="' + (ep.title || '다의어 한방에! ' + ep.word) + '" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    };
  }
  window.PIFYT = { PLAYLIST: PLAYLIST, EPS: EPS, GRAMMAR: GRAMMAR, thumb: thumb, mount: mount, url: 'https://www.youtube.com/playlist?list=' + PLAYLIST };
})();
