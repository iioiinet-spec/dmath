/* ============================================================
   MASCOT "오일러(Euler)" + STORY DATA
   ── 마스코트는 캐릭터 일러스트가 아니라 '수식으로 그려지는 도형'.
      오일러 공식  e^(iθ) = cos θ + i·sin θ  를 복소평면에 그린 엠블럼.
      (단위원 = e^(iθ)의 자취,  위상자가 θ=π에서 -1로 → e^(iπ)+1=0)
   ── 광택/얼굴 없음. 발광 라인아트 + currentColor(테마색)만.
   가이드 이름 "오일러" ↔ 수식 "오일러 공식" 으로 통일.
   ============================================================ */
(function () {
  let _uid = 0;

  /* expr → 위상자 각도 θ (라디안, 수학 좌표) */
  const ANG = {
    neutral: Math.PI,        // e^(iπ) = -1  (대표 상태)
    happy:   Math.PI / 3,    // 60°
    sparkle: Math.PI / 2,    // i
    wink:    -Math.PI / 4,
    worried: 5 * Math.PI / 4,
    sleep:   Math.PI * 0.96,
  };

  /* 마스코트 엠블럼 — foxSVG 이름은 호환 위해 유지 (내용은 오일러 공식) */
  function foxSVG(expr = 'neutral', accent = 'var(--accent)') {
    const id = 'eu' + (_uid++);
    const cx = 50, cy = 50, R = 30, ar = 13;
    const th = ANG[expr] != null ? ANG[expr] : Math.PI;
    const dim = expr === 'sleep' ? 0.45 : 1;
    const tx = (cx + R * Math.cos(th)).toFixed(2), ty = (cy - R * Math.sin(th)).toFixed(2);
    // 각 호 (양의 실축 → θ, 반시계)
    const ax = cx + ar, ay = cy;
    const ex = (cx + ar * Math.cos(th)).toFixed(2), ey = (cy - ar * Math.sin(th)).toFixed(2);
    const large = th > Math.PI ? 1 : 0;
    const arc = `M ${ax} ${ay} A ${ar} ${ar} 0 ${large} 0 ${ex} ${ey}`;

    // expr 부가 요소
    let extra = '';
    if (expr === 'sparkle') {
      const gl = (x, y, s) => `<g transform="translate(${x} ${y})" opacity="0.95"><path d="M0 ${-s} L${s * 0.3} ${-s * 0.3} L${s} 0 L${s * 0.3} ${s * 0.3} L0 ${s} L${-s * 0.3} ${s * 0.3} L${-s} 0 L${-s * 0.3} ${-s * 0.3} Z" fill="currentColor"/></g>`;
      extra = gl(+tx + 6, +ty - 6, 3) + gl(+tx + 11, +ty + 3, 2);
    }

    return `
  <svg class="fox" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
       style="color:${accent}; overflow:visible">
    <defs>
      <filter id="${id}g" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="currentColor" flood-opacity="0.7"/>
      </filter>
    </defs>
    <g opacity="${dim}">
      <!-- 복소평면 축 -->
      <g stroke="currentColor" stroke-width="1" opacity="0.20" stroke-linecap="round">
        <line x1="8" y1="${cy}" x2="92" y2="${cy}"/>
        <line x1="${cx}" y1="8" x2="${cx}" y2="92"/>
      </g>
      <!-- 1, i, -1, -i 눈금 -->
      <g fill="currentColor" opacity="0.45">
        <circle cx="${cx + R}" cy="${cy}" r="1.5"/><circle cx="${cx - R}" cy="${cy}" r="1.5"/>
        <circle cx="${cx}" cy="${cy - R}" r="1.5"/><circle cx="${cx}" cy="${cy + R}" r="1.5"/>
      </g>
      <!-- 단위원 = e^(iθ) 의 자취 -->
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="currentColor" fill-opacity="0.05"
              stroke="currentColor" stroke-width="2" filter="url(#${id}g)"
              stroke-dasharray="${(2 * Math.PI * R).toFixed(1)}" class="eu-draw"/>
      <!-- θ 각 호 -->
      <path d="${arc}" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.8"/>
      <!-- 위상자(phasor) origin → e^(iθ) -->
      <line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" filter="url(#${id}g)"/>
      <circle cx="${cx}" cy="${cy}" r="2" fill="currentColor"/>
      <!-- e^(iθ) 점 -->
      <circle cx="${tx}" cy="${ty}" r="3.4" fill="currentColor" filter="url(#${id}g)"/>
      ${extra}
      <!-- 살아있는 점: 단위원을 도는 e^(iθ) (SMIL) -->
      <g>
        <circle cx="${cx + R}" cy="${cy}" r="2.3" fill="#fff" opacity="0.92"/>
        <animateTransform attributeName="transform" type="rotate"
          from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="7s" repeatCount="indefinite"/>
      </g>
    </g>
  </svg>`;
  }

  /* 작은 인라인 칩 (상단바 등) */
  function foxChip(accent = 'var(--accent)') {
    return `<svg viewBox="0 0 100 100" width="22" height="22" xmlns="http://www.w3.org/2000/svg"
      style="color:${accent}; vertical-align:-5px; overflow:visible">
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="3" opacity="0.9"/>
      <line x1="50" y1="50" x2="20" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="20" cy="50" r="5" fill="currentColor"/>
      <circle cx="50" cy="50" r="3" fill="currentColor"/>
    </svg>`;
  }

  /* ============================================================
     STORY
     주인공: 단우 — 수포자, 도박을 사랑함. 수능 전날 밤.
     가이드: 탑에 깃든 수식의 정령 "오일러" (빛나는 곡선의 형상)
     ============================================================ */
  const STORY_INTRO = [
    { who: 'narr', text: '수능 D-1. 단우의 책상엔 문제집 대신 카드 한 벌이 펼쳐져 있었다.' },
    { who: 'danwoo', text: '“수학? 5지선다인데 찍으면 20%지. 그게 다 확률이야.”' },
    { who: 'narr', text: '베팅하듯 답을 찍는 상상을 하다가, 단우는 그대로 잠이 들었다.' },
    { who: 'narr', text: '…눈을 떴을 때, 발밑은 침대가 아니라 끝없이 솟은 탑의 1층이었다.' },
    { who: 'fox', expr: 'sparkle', text: '허공에 빛나는 곡선 하나가 빙글 돌더니 말을 걸었다. “오, 또 떨어졌네. 인간.”' },
    { who: 'fox', expr: 'neutral', text: '“난 오일러. 이 산술의 탑에 깃든 수식이야. e^(iπ)+1=0 — 들어는 봤나?”' },
    { who: 'danwoo', text: '“…말하는 수식? 빛으로 된 동그라미가 나한테 말을 걸어?”' },
    { who: 'fox', expr: 'wink', text: '“돌아가고 싶으면 30층 꼭대기까지 올라와. 각 층의 수호자를 ‘풀어서’ 쓰러뜨리면 길이 열려.”' },
    { who: 'fox', expr: 'happy', text: '“찍기는 안 통해. 여기선 답을 ‘아는’ 만큼만 위로 갈 수 있거든.”' },
  ];

  const STORY_ENDING = [
    { who: 'narr', text: '30층의 군주가 빛이 되어 흩어지자, 탑 전체가 환하게 무너져 내렸다.' },
    { who: 'fox', expr: 'happy', text: '“잘 올라왔어, 단우. 이제 네가 ‘아는’ 것들은 진짜 네 거야.”' },
    { who: 'fox', expr: 'wink', text: '“가. 운이 아니라 실력으로 돌아가는 거야.”' },
    { who: 'narr', text: '눈을 떴다. 익숙한 천장, 익숙한 침대. 집이었다.' },
    { who: 'danwoo', text: '“…꿈? 근데 머릿속에 공식이 다 남아있어.”' },
    { who: 'narr', text: '그리고 시계를 봤다. 오전 11시 47분. 수능은 이미 한참 전에 시작됐다.' },
    { who: 'danwoo', text: '“……늦잠 자서 수능을 통째로 날렸다고?!”' },
    { who: 'narr', text: '그 해 수능은 백지였다. 하지만 단우는 이상하게 웃고 있었다.' },
    { who: 'danwoo', text: '“상관없어. 난 이제 수학을 ‘안다’. 한 번 더 가면 돼.”' },
    { who: 'narr', text: '1년 뒤 — 단우는 서울대학교 컴퓨터공학과 합격증을 손에 쥐었다.' },
    { who: 'fox', expr: 'sparkle', text: '그날 밤 꿈에, 빛나는 곡선이 깜빡이며 윙크했다. “거봐. 확률이 아니라 실력이랬지.”' },
  ];

  /* 층별 클리어 나레이션 (1~30) — 오일러 시점 */
  const FLOOR_LINES = {
    1:  '“수의 새싹부터. 모든 탑은 1에서 시작하지.”',
    2:  '“구구단을 외던 손이 기억하는구나. 좋아.”',
    3:  '“넓이는 ‘얼마나 차지하나’의 언어야.”',
    4:  '“분수는 쪼개서 나누는 용기지. 잘했어.”',
    5:  '“원을 다뤘으니, 곡선이 더는 안 무섭겠네.”',
    6:  '“음수의 그림자를 지났어. 0 아래에도 세계가 있단 걸 알았지.”',
    7:  '“미지수 x를 길들였구나. 모르는 걸 두려워 않게 됐어.”',
    8:  '“각과 부피 — 공간을 읽는 눈이 생겼어.”',
    9:  '“경계를 넘었어. 부등호는 한쪽으로 흐르는 강 같은 거야.”',
    10: '“직선의 항해사. 기울기 하나로 방향을 정하는 법을 배웠지.”',
    11: '“닮음과 피타고라스 — 옛 사람들도 이걸로 별까지 쟀어.”',
    12: '“확률. …도박 좋아한다며? 이젠 ‘느낌’ 말고 숫자로 말해봐.”',
    13: '“제곱근의 뿌리까지 내려갔다 왔어. 깊은 층이었지.”',
    14: '“이차방정식 — 두 갈래 길을 동시에 보는 눈.”',
    15: '“포물선의 용을 넘었어. 던진 공이 그리는 곡선, 이제 보이지?”',
    16: '“삼각비의 현자. θ 하나로 변의 길이를 부르는 주문을 익혔어.”',
    17: '“통계는 흩어진 점들 속에서 ‘중심’을 찾는 일이야.”',
    18: '“원환의 대공도 무릎 꿇었군. 원 안의 모든 각이 네 편이야.”',
    19: '“상관의 예언자 — 관계를 읽는 자는 미래를 조금 엿보지.”',
    20: '“중등의 끝. 여기까지가 ‘기초’였어. …놀랐어?”',
    21: '“고등의 문이 열렸어. 이제부터 진짜 등반이야.”',
    22: '“속도가 붙었네. 기출의 결을 읽기 시작했어.”',
    23: '“2학년의 벽. 함수가 살아 움직이기 시작해.”',
    24: '“계산이 길어질수록 침착함이 무기야. 잘 버텼어.”',
    25: '“한 문제에 여러 개념이 엉켜 있었지. 풀어냈구나.”',
    26: '“3학년의 공기. 시간이 곧 점수인 세계로 들어왔어.”',
    27: '“확률과 통계의 정점. 도박꾼 단우에게 딱 맞는 층이었지.”',
    28: '“킬러문항의 입구. 여기서부턴 한 칸 오르는 게 무거워.”',
    29: '“수능의 진짜 얼굴. 22·28·29·30 — 모두를 울린 번호들이야.”',
    30: '“1997. 가장 오래된 수호자. 탑의 군주가 너를 기다린다.”',
  };

  window.FoxStory = { foxSVG, foxChip, STORY_INTRO, STORY_ENDING, FLOOR_LINES };
})();
