/* ============================================================
   MATH ENGINE  (math-problem-engine.js — 원본 유지, 수정 금지 영역)
   Stage 1~20, 61 problem types. θ 표시 보강은 별도 파일에서 패치.
   ============================================================ */
/* ============================================================
   MATH ENGINE  (math-problem-engine.js  — 원본 그대로 임베드)
   Stage 1~20, 61 problem types, SVG renderers, inverse-gen, mal-rule distractors
   ============================================================ */
(function(){
const R = {
  int(min, max){ return Math.floor(Math.random()*(max-min+1))+min; },
  pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; },
  nonZero(min, max){ let v; do{ v=this.int(min,max); }while(v===0); return v; },
  signed(min, max){ return (Math.random()<0.5?1:-1)*this.int(min,max); },
  multiple(min, max, multiple){ const lo=Math.ceil(min/multiple), hi=Math.floor(max/multiple); return this.int(lo,hi)*multiple; },
  shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; },
};
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a; }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function reduceFrac(n,d){ const g=gcd(Math.abs(n),Math.abs(d)); return [n/g,d/g]; }
function fmtFrac(n,d){ if(d===1) return `${n}`; const [rn,rd]=reduceFrac(n,d); return `${rn}/${rd}`; }
function fmt(n){ return n<0?`(${n})`:`${n}`; }
function nearbyDist(ans, count=3){
  const candidates=[ans+1,ans-1,ans+2,ans-2,ans*2,Math.round(ans/2),-ans,ans+10,ans-10];
  const result=[]; const seen=new Set([ans]);
  for(const c of candidates){ if(!seen.has(c)){ seen.add(c); result.push(c);} if(result.length>=count) break; }
  return result;
}
function fracDist(n,d){
  const [rn,rd]=reduceFrac(n,d);
  return [ `${rn+1}/${rd}`, rn-1>0?`${rn-1}/${rd}`:`${rn+2}/${rd}`, rd>2?`${rn}/${rd-1}`:`${rn}/${rd+1}` ];
}

const SVG = {
  rectangle(w,h){
    const SCALE=Math.min(28,200/Math.max(w,h)); const sw=w*SCALE, sh=h*SCALE; const vw=sw+90, vh=sh+70;
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <rect x="45" y="15" width="${sw}" height="${sh}" fill="#dbeafe" stroke="#2563eb" stroke-width="2" rx="2"/>
  <text x="${45+sw/2}" y="10" text-anchor="middle" font-size="13" fill="#1e40af" font-family="sans-serif">${w} cm</text>
  <text x="${45+sw+14}" y="${15+sh/2+4}" text-anchor="middle" font-size="13" fill="#1e40af" font-family="sans-serif">${h} cm</text>
  <text x="${45+sw/2}" y="${15+sh/2+6}" text-anchor="middle" font-size="20" fill="#dc2626" font-weight="bold" font-family="sans-serif">?</text>
</svg>`;
  },
  triangle(b,h){
    const SCALE=Math.min(26,180/Math.max(b,h)); const sb=b*SCALE, sh=h*SCALE; const vw=sb+90, vh=sh+70;
    const pts=`45,${sh+20} ${45+sb},${sh+20} 45,20`;
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${pts}" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>
  <rect x="45" y="${sh+12}" width="8" height="8" fill="none" stroke="#ca8a04" stroke-width="1.5"/>
  <text x="${45+sb/2}" y="${sh+46}" text-anchor="middle" font-size="13" fill="#92400e" font-family="sans-serif">${b} cm</text>
  <text x="18" y="${20+sh/2+4}" text-anchor="middle" font-size="13" fill="#92400e" font-family="sans-serif">${h} cm</text>
  <text x="${45+sb/4}" y="${sh-8}" text-anchor="middle" font-size="20" fill="#dc2626" font-weight="bold" font-family="sans-serif">?</text>
</svg>`;
  },
  circle(r){
    const SCALE=Math.min(28,110/r); const sr=r*SCALE; const vw=sr*2+80, vh=sr*2+60; const cx=vw/2, cy=vh/2;
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${sr}" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
  <line x1="${cx}" y1="${cy}" x2="${cx+sr}" y2="${cy}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="${cx+sr/2}" y="${cy-7}" text-anchor="middle" font-size="13" fill="#5b21b6" font-family="sans-serif">${r} cm</text>
  <text x="${cx}" y="${cy+8}" text-anchor="middle" font-size="20" fill="#dc2626" font-weight="bold" font-family="sans-serif">?</text>
</svg>`;
  },
  sector(r,deg){
    const SCALE=Math.min(20,120/r); const sr=r*SCALE; const vw=sr*2+80, vh=sr*2+60; const cx=vw/2, cy=vh/2;
    const rad=(deg*Math.PI)/180; const x1=cx+sr, y1=cy; const x2=cx+sr*Math.cos(rad), y2=cy-sr*Math.sin(rad); const large=deg>180?1:0;
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${cx} ${cy} L ${x1} ${y1} A ${sr} ${sr} 0 ${large} 0 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <text x="${cx+sr/2}" y="${cy+5}" font-size="12" fill="#166534" font-family="sans-serif">${r}cm</text>
  <text x="${cx+18}" y="${cy-12}" font-size="12" fill="#166534" font-family="sans-serif">${deg}°</text>
  <text x="${cx-10}" y="${cy-sr/3}" font-size="16" fill="#dc2626" font-weight="bold" font-family="sans-serif">?</text>
</svg>`;
  },
  pythagorean(a,b,missing){
    const SCALE=20; const sa=a*SCALE, sb=b*SCALE; const vw=sb+100, vh=sa+80; const pts=`50,${sa+20} ${50+sb},${sa+20} 50,20`;
    const vals={ a:`${a}`, b:`${b}`, c:`${Math.round(Math.sqrt(a*a+b*b))}` }; if(missing) vals[missing]='?';
    const col=(k)=>(k===missing?'#dc2626':'#374151');
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${pts}" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <rect x="50" y="${sa+12}" width="8" height="8" fill="none" stroke="#ea580c" stroke-width="1.5"/>
  <text x="${50+sb/2}" y="${sa+48}" text-anchor="middle" font-size="13" fill="${col('b')}" font-family="sans-serif">${vals.b} cm</text>
  <text x="22" y="${20+sa/2+4}" text-anchor="middle" font-size="13" fill="${col('a')}" font-family="sans-serif">${vals.a} cm</text>
  <text x="${50+sb/2+20}" y="${20+sa/2-4}" text-anchor="middle" font-size="13" fill="${col('c')}" font-family="sans-serif">${vals.c} cm</text>
</svg>`;
  },
  linearFunc(slope,intercept){
    const RANGE=5,S=36; const W=S*RANGE*2+60,H=S*RANGE*2+60; const ox=W/2,oy=H/2;
    let g=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    for(let i=-RANGE;i<=RANGE;i++){ const x=ox+i*S,y=oy+i*S;
      g+=`<line x1="${x}" y1="${oy-RANGE*S}" x2="${x}" y2="${oy+RANGE*S}" stroke="#e5e7eb" stroke-width="0.5"/>`;
      g+=`<line x1="${ox-RANGE*S}" y1="${y}" x2="${ox+RANGE*S}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`; }
    g+=`<line x1="${ox-RANGE*S}" y1="${oy}" x2="${ox+RANGE*S}" y2="${oy}" stroke="#6b7280" stroke-width="1.5"/>`;
    g+=`<line x1="${ox}" y1="${oy+RANGE*S}" x2="${ox}" y2="${oy-RANGE*S}" stroke="#6b7280" stroke-width="1.5"/>`;
    g+=`<text x="${ox+RANGE*S+8}" y="${oy+5}" font-size="13" fill="#6b7280" font-family="sans-serif">x</text>`;
    g+=`<text x="${ox+5}" y="${oy-RANGE*S-5}" font-size="13" fill="#6b7280" font-family="sans-serif">y</text>`;
    for(let i=-RANGE+1;i<=RANGE-1;i++){ if(i===0) continue;
      g+=`<text x="${ox+i*S}" y="${oy+16}" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="sans-serif">${i}</text>`;
      g+=`<text x="${ox-14}" y="${oy-i*S+4}" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="sans-serif">${i}</text>`; }
    const fx1=-RANGE,fy1=slope*fx1+intercept; const fx2=RANGE,fy2=slope*fx2+intercept;
    g+=`<line x1="${ox+fx1*S}" y1="${oy-fy1*S}" x2="${ox+fx2*S}" y2="${oy-fy2*S}" stroke="#dc2626" stroke-width="2.5"/>`;
    g+=`<circle cx="${ox}" cy="${oy-intercept*S}" r="4" fill="#2563eb"/>`;
    g+=`</svg>`; return g;
  },
  parabola(a,p=0,q=0){
    const RANGE=4,S=38; const W=S*RANGE*2+80,H=S*RANGE*2+60; const ox=W/2,oy=H/2;
    let g=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    for(let i=-RANGE;i<=RANGE;i++){ const x=ox+i*S,y=oy+i*S;
      g+=`<line x1="${x}" y1="${oy-RANGE*S}" x2="${x}" y2="${oy+RANGE*S}" stroke="#e5e7eb" stroke-width="0.5"/>`;
      g+=`<line x1="${ox-RANGE*S}" y1="${y}" x2="${ox+RANGE*S}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`; }
    g+=`<line x1="${ox-RANGE*S}" y1="${oy}" x2="${ox+RANGE*S}" y2="${oy}" stroke="#6b7280" stroke-width="1.5"/>`;
    g+=`<line x1="${ox}" y1="${oy+RANGE*S}" x2="${ox}" y2="${oy-RANGE*S}" stroke="#6b7280" stroke-width="1.5"/>`;
    let d='';
    for(let xv=-RANGE;xv<=RANGE;xv+=0.05){ const yv=a*(xv-p)*(xv-p)+q; const sx=ox+xv*S, sy=oy-yv*S; if(sy<-10||sy>H+10) continue; d+= d===''?`M ${sx.toFixed(1)} ${sy.toFixed(1)}`:` L ${sx.toFixed(1)} ${sy.toFixed(1)}`; }
    g+=`<path d="${d}" fill="none" stroke="#dc2626" stroke-width="2"/>`;
    const vx=ox+p*S, vy=oy-q*S;
    g+=`<circle cx="${vx}" cy="${vy}" r="4" fill="#2563eb"/>`;
    g+=`<text x="${vx+6}" y="${vy-5}" font-size="11" fill="#2563eb" font-family="sans-serif">(${p},${q})</text>`;
    g+=`</svg>`; return g;
  },
};
const PROBLEMS = {
  ADD_1D:{ stage:1, grade:'초등 1학년', topic:'한 자리 덧셈',
    generate(){ const a=R.int(1,9),b=R.int(1,9); return {a,b,ans:a+b}; },
    template:p=>`${p.a} + ${p.b} = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  SUB_1D:{ stage:1, grade:'초등 1학년', topic:'한 자리 뺄셈',
    generate(){ const ans=R.int(1,8); const b=R.int(1,9-ans); return {a:ans+b,b,ans}; },
    template:p=>`${p.a} - ${p.b} = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  CMP_NUM:{ stage:1, grade:'초등 1학년', topic:'수의 크기 비교',
    generate(){ const a=R.int(1,20),b=R.int(1,20); return {a,b,ans:a>b?'>':a<b?'<':'='}; },
    template:p=>`${p.a}  □  ${p.b}  (□에 >, =, < 중 하나)`, answer:p=>p.ans, distractors:()=>['>','=','<'], renderType:'text' },

  MUL_TABLE:{ stage:2, grade:'초등 2학년', topic:'구구단',
    generate(){ const a=R.int(2,9),b=R.int(2,9); return {a,b,ans:a*b}; },
    template:p=>`${p.a} × ${p.b} = ?`, answer:p=>p.ans,
    distractors:p=>[(p.a+1)*p.b,(p.a-1)*p.b,p.a*(p.b+1)].filter(d=>d!==p.ans), renderType:'text' },
  DIV_EXACT:{ stage:2, grade:'초등 2학년', topic:'나눗셈 (나머지 없음)',
    generate(){ const ans=R.int(2,9),b=R.int(2,9); return {a:ans*b,b,ans}; },
    template:p=>`${p.a} ÷ ${p.b} = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  ADD_2D:{ stage:2, grade:'초등 2학년', topic:'두 자리 덧셈',
    generate(){ const a=R.int(11,85),b=R.int(11,99-a); return {a,b,ans:a+b}; },
    template:p=>`${p.a} + ${p.b} = ?`, answer:p=>p.ans,
    distractors:p=>[p.ans-10,p.ans+10,p.ans-1].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },

  FRAC_SAME:{ stage:3, grade:'초등 3~4학년', topic:'동분모 분수 덧셈',
    generate(){ const d=R.int(5,10); const a=R.int(1,d-2),b=R.int(1,d-1-a); return {a,b,d,ans:fmtFrac(a+b,d)}; },
    template:p=>`${p.a}/${p.d} + ${p.b}/${p.d} = ?`, answer:p=>p.ans, distractors:p=>fracDist(p.a+p.b,p.d), renderType:'text' },
  RECT_AREA:{ stage:3, grade:'초등 3~4학년', topic:'직사각형 넓이',
    generate(){ const w=R.int(2,14),h=R.int(2,14); return {w,h,ans:w*h}; },
    template:p=>`가로 ${p.w}cm, 세로 ${p.h}cm인 직사각형의 넓이는? (단위: cm²)`, answer:p=>p.ans,
    distractors:p=>[p.w+p.h,p.ans+p.w,p.ans-p.h].filter(d=>d>0&&d!==p.ans).slice(0,3),
    renderType:'svg', svg:p=>SVG.rectangle(p.w,p.h) },
  MUL_2D:{ stage:3, grade:'초등 3~4학년', topic:'두 자리 곱셈',
    generate(){ const a=R.int(11,30),b=R.int(11,30); return {a,b,ans:a*b}; },
    template:p=>`${p.a} × ${p.b} = ?`, answer:p=>p.ans,
    distractors:p=>[p.ans+p.a,p.ans-p.b,p.ans+10].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },

  FRAC_DIFF:{ stage:4, grade:'초등 5학년', topic:'이분모 분수 덧셈 (통분)',
    generate(){ const denoms=[[2,3],[2,5],[3,4],[4,6],[3,5]]; const [pd,qd]=R.pick(denoms);
      const a=R.int(1,pd-1),b=R.int(1,qd-1); const l=lcm(pd,qd); const sumN=a*(l/pd)+b*(l/qd);
      return {a,b,pd,qd,ans:fmtFrac(sumN,l)}; },
    template:p=>`${p.a}/${p.pd} + ${p.b}/${p.qd} = ?`, answer:p=>p.ans,
    distractors:p=>{ const [n,d]=p.ans.includes('/')?p.ans.split('/').map(Number):[Number(p.ans),1]; return fracDist(n,d); }, renderType:'text' },
  TRI_AREA:{ stage:4, grade:'초등 5학년', topic:'삼각형 넓이',
    generate(){ const b=R.multiple(2,16,2),h=R.multiple(2,16,2); return {b,h,ans:(b*h)/2}; },
    template:p=>`밑변 ${p.b}cm, 높이 ${p.h}cm인 삼각형의 넓이는? (단위: cm²)`, answer:p=>p.ans,
    distractors:p=>[p.b*p.h,p.ans+p.b,p.ans-p.h/2].filter(d=>d>0&&d!==p.ans).slice(0,3),
    renderType:'svg', svg:p=>SVG.triangle(p.b,p.h) },
  DECIMAL_MUL:{ stage:4, grade:'초등 5학년', topic:'소수 곱셈',
    generate(){ const i=R.int(1,9),d=R.int(1,9),b=R.int(2,9); const ans=Math.round((i+d/10)*b*10)/10; return {a:`${i}.${d}`,b,ans}; },
    template:p=>`${p.a} × ${p.b} = ?`, answer:p=>p.ans,
    distractors:p=>[p.ans*10,p.ans+0.1,p.ans-0.1].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },

  FRAC_MUL:{ stage:5, grade:'초등 6학년', topic:'분수 곱셈',
    generate(){ const a=R.int(2,5),b=R.int(2,5),k=R.int(1,6); return {a,b,c:b*k,d:a,ans:k}; },
    template:p=>`${p.a}/${p.b} × ${p.c}/${p.d} = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  CIRCLE_AREA:{ stage:5, grade:'초등 6학년', topic:'원의 넓이 (π=3.14)',
    generate(){ const r=R.int(1,8); return {r,ans:Math.round(3.14*r*r*100)/100}; },
    template:p=>`반지름 ${p.r}cm인 원의 넓이는? (π = 3.14, 단위: cm²)`, answer:p=>p.ans,
    distractors:p=>[Math.round(3.14*(2*p.r)*(2*p.r)*100)/100,Math.round(2*3.14*p.r*100)/100,p.ans+3.14].filter(d=>d!==p.ans).slice(0,3),
    renderType:'svg', svg:p=>SVG.circle(p.r) },
  RATIO:{ stage:5, grade:'초등 6학년', topic:'비례식',
    generate(){ let a,b,c,ans; for(let t=0;t<50;t++){ a=R.int(2,8);b=R.int(2,8);c=R.int(2,8); if((b*c)%a===0){ ans=(b*c)/a; break; } } return {a,b,c,ans}; },
    template:p=>`${p.a} : ${p.b} = ${p.c} : x   →   x = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },

  INT_ADD:{ stage:6, grade:'중학교 1학년', topic:'정수의 덧셈 (음수 포함)',
    generate(){ const a=R.signed(1,15),b=R.signed(1,15); return {a,b,ans:a+b}; },
    template:p=>`${fmt(p.a)} + ${fmt(p.b)} = ?`, answer:p=>p.ans,
    distractors:p=>[p.ans+1,p.ans-1,-p.ans].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },
  INT_MUL:{ stage:6, grade:'중학교 1학년', topic:'정수의 곱셈 (부호 포함)',
    generate(){ const a=R.nonZero(-9,9),b=R.nonZero(-9,9); return {a,b,ans:a*b}; },
    template:p=>`${fmt(p.a)} × ${fmt(p.b)} = ?`, answer:p=>p.ans,
    distractors:p=>[Math.abs(p.ans),-p.ans,p.ans+Math.abs(p.a)].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },
  PRIME_FACTOR:{ stage:6, grade:'중학교 1학년', topic:'소인수분해',
    generate(){ const primes=[2,3,5,7,11,13]; let n,ans; const type=R.pick(['pp','p2p']);
      if(type==='pp'){ const p1=R.pick(primes),p2=R.pick(primes.filter(x=>x!==p1)); n=p1*p2; ans=`${Math.min(p1,p2)} × ${Math.max(p1,p2)}`; }
      else{ const p1=R.pick([2,3,5]),p2=R.pick(primes.filter(x=>x!==p1)); n=p1*p1*p2; ans=n<=200?`${p1}² × ${p2}`:`${p1} × ${p2}`; if(n>200) n=p1*p2; }
      return {n,ans}; },
    template:p=>`${p.n}을 소인수분해하면?`, answer:p=>p.ans,
    distractors:p=>{ const wrong=[`${p.n} × 1`,`1 × ${p.n}`,`2 × ${Math.round(p.n/2)}`].filter(d=>d!==p.ans); return wrong.slice(0,3); }, renderType:'text' },

  LINEAR_EQ_1:{ stage:7, grade:'중학교 1학년', topic:'일차방정식 (기본형)',
    generate(){ const ans=R.nonZero(-10,10),a=R.nonZero(-5,5),b=R.int(-15,15); const c=a*ans+b; return {a,b,c,ans}; },
    template:p=>`${p.a}x ${p.b>=0?'+':''}${p.b} = ${p.c}  →  x = ?`, answer:p=>p.ans,
    distractors:p=>[p.ans+1,p.ans-1,-p.ans].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },
  LINEAR_EQ_2:{ stage:7, grade:'중학교 1학년', topic:'일차방정식 (이항)',
    generate(){ let a,c; do{ a=R.nonZero(-4,4); c=R.nonZero(-4,4); }while(a===c); const ans=R.nonZero(-8,8),b=R.int(-10,10); const d=(a-c)*ans+b; return {a,b,c,d,ans}; },
    template:p=>`${p.a}x ${p.b>=0?'+':''}${p.b} = ${p.c}x ${p.d>=0?'+':''}${p.d}  →  x = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  LINEAR_EQ_APP:{ stage:7, grade:'중학교 1학년', topic:'일차방정식 활용 (나이 문제)',
    generate(){ let d,x; for(let t=0;t<50;t++){ d=R.int(1,8); x=R.int(5,20); if((2*x+d)%2===0) break; } return {d,s:2*x+d,ans:x}; },
    template:p=>`형은 동생보다 ${p.d}살 많습니다. 형과 동생의 나이 합이 ${p.s}살일 때, 동생의 나이는?`, answer:p=>p.ans,
    distractors:p=>[p.ans+1,p.ans-1,p.ans+p.d].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },

  POLYGON_ANGLE:{ stage:8, grade:'중학교 1학년', topic:'다각형 내각의 합',
    generate(){ const n=R.int(3,10); return {n,ans:(n-2)*180}; },
    template:p=>`${p.n}각형 내각의 합은?`, answer:p=>p.ans,
    distractors:p=>[(p.n-1)*180,p.n*180,(p.n-2)*180+90].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },
  SECTOR_ARC:{ stage:8, grade:'중학교 1학년', topic:'부채꼴 호의 길이',
    generate(){ const r=R.int(2,10); const deg=R.pick([30,45,60,90,120,150,180]); const ans=Math.round(2*3.14*r*(deg/360)*100)/100; return {r,deg,ans}; },
    template:p=>`반지름 ${p.r}cm, 중심각 ${p.deg}°인 부채꼴의 호의 길이는? (π=3.14)`, answer:p=>p.ans,
    distractors:p=>[Math.round(3.14*p.r*p.r*(p.deg/360)*100)/100,Math.round(2*3.14*p.r*100)/100,p.ans*2].filter(d=>d!==p.ans).slice(0,3),
    renderType:'svg', svg:p=>SVG.sector(p.r,p.deg) },
  PRISM_VOL:{ stage:8, grade:'중학교 1학년', topic:'직육면체 부피',
    generate(){ const l=R.int(2,9),w=R.int(2,9),h=R.int(2,9); return {l,w,h,ans:l*w*h}; },
    template:p=>`가로 ${p.l}cm, 세로 ${p.w}cm, 높이 ${p.h}cm인 직육면체의 부피는? (단위: cm³)`, answer:p=>p.ans,
    distractors:p=>[2*(p.l*p.w+p.w*p.h+p.l*p.h),p.l*p.w+p.h,p.ans+p.l*p.w].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },

  INEQUALITY_1:{ stage:9, grade:'중학교 2학년', topic:'일차부등식',
    generate(){ const a=R.nonZero(-4,4); const xBound=R.int(-5,5); const b=R.int(-10,10); const c=a>0?a*xBound+b-1:a*xBound+b+1; const sign=a>0?'>':'<'; return {a,b,c,ans:`x ${sign} ${xBound}`}; },
    template:p=>`${p.a}x ${p.b>=0?'+':''}${p.b} > ${p.c}  →  x의 범위는?`, answer:p=>p.ans,
    distractors:p=>{ const m=p.ans.match(/x\s*([<>])\s*(-?\d+)/); const s=m[1],n=Number(m[2]); return [`x ${s} ${n+1}`,`x ${s} ${n-1}`,`x ${s==='>'?'<':'>'} ${n}`]; }, renderType:'text' },
  SIMUL_EQ:{ stage:9, grade:'중학교 2학년', topic:'연립방정식',
    generate(){ let a1,b1,a2,b2; const x=R.nonZero(-5,5),y=R.nonZero(-5,5); do{ a1=R.nonZero(-3,3);b1=R.nonZero(-3,3);a2=R.nonZero(-3,3);b2=R.nonZero(-3,3); }while(a1*b2===a2*b1); const c1=a1*x+b1*y,c2=a2*x+b2*y; return {a1,b1,c1,a2,b2,c2,x,y}; },
    template:p=>`다음 연립방정식의 해를 구하시오.\n${p.a1}x ${p.b1>=0?'+':''}${p.b1}y = ${p.c1}\n${p.a2}x ${p.b2>=0?'+':''}${p.b2}y = ${p.c2}`,
    answer:p=>`x = ${p.x}, y = ${p.y}`, distractors:p=>[`x = ${p.x+1}, y = ${p.y}`,`x = ${p.x}, y = ${p.y+1}`,`x = ${p.y}, y = ${p.x}`], renderType:'text' },
  CYCLE_DEC:{ stage:9, grade:'중학교 2학년', topic:'순환소수 → 분수 변환',
    generate(){ const pool=[{dec:'0.3̄',ans:'1/3'},{dec:'0.6̄',ans:'2/3'},{dec:'0.1̄6̄',ans:'1/6'},{dec:'0.8̄3̄',ans:'5/6'},{dec:'0.1̄',ans:'1/9'},{dec:'0.4̄',ans:'4/9'},{dec:'0.7̄',ans:'7/9'},{dec:'0.ẇ',ans:'1/11'}]; return R.pick(pool); },
    template:p=>`순환소수 ${p.dec}을(를) 분수로 나타내면?`, answer:p=>p.ans,
    distractors:p=>{ const [n,d]=p.ans.split('/').map(Number); return [`${n+1}/${d}`,`${n}/${d+1}`,`${n}/${d-1||1}`].filter(s=>s!==p.ans); }, renderType:'text' },

  LINEAR_FUNC_VAL:{ stage:10, grade:'중학교 2학년', topic:'일차함수 값 계산',
    generate(){ const a=R.nonZero(-5,5),b=R.int(-10,10),xv=R.int(-5,5); return {a,b,xv,ans:a*xv+b}; },
    template:p=>`y = ${p.a}x ${p.b>=0?'+':''}${p.b}에서 x = ${p.xv}일 때, y = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  LINEAR_FUNC_GRAPH:{ stage:10, grade:'중학교 2학년', topic:'일차함수 그래프 (기울기/y절편)',
    generate(){ const a=R.pick([-3,-2,-1,1,2,3]),b=R.int(-4,4); return {a,b}; },
    template:p=>`y = ${p.a}x ${p.b>=0?'+':''}${p.b}의 기울기와 y절편은?`, answer:p=>`기울기 = ${p.a}, y절편 = ${p.b}`,
    distractors:p=>[`기울기 = ${p.b}, y절편 = ${p.a}`,`기울기 = ${-p.a}, y절편 = ${p.b}`,`기울기 = ${p.a}, y절편 = ${-p.b}`],
    renderType:'svg', svg:p=>SVG.linearFunc(p.a,p.b) },
  LINEAR_FUNC_XINT:{ stage:10, grade:'중학교 2학년', topic:'일차함수 x절편',
    generate(){ const a=R.nonZero(-3,3); const xint=R.nonZero(-5,5); const b=-a*xint; return {a,b,ans:xint}; },
    template:p=>`일차함수 y = ${p.a}x ${p.b>=0?'+':''}${p.b}의 x절편은?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },

  SIMILAR_RATIO:{ stage:11, grade:'중학교 2학년', topic:'닮음비 계산',
    generate(){ const ratio=R.int(2,4),side=R.int(3,10); return {ratio,side,ans:side*ratio}; },
    template:p=>`두 삼각형의 닮음비가 1 : ${p.ratio}이고, 작은 삼각형의 한 변이 ${p.side}cm일 때 대응변의 길이는?`, answer:p=>p.ans,
    distractors:p=>[p.side+p.ratio,p.ans+1,p.ans-p.ratio].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },
  PYTHAGORAS_1:{ stage:11, grade:'중학교 2학년', topic:'피타고라스 정리',
    generate(){ const triples=[[3,4,5],[5,12,13],[8,15,17],[6,8,10],[9,12,15]]; const [a,b,c]=R.pick(triples); const missing=R.pick(['a','b','c']); const vals={a,b,c}; return {a,b,c,missing,ans:vals[missing]}; },
    template(p){ const show=(k)=>(k===p.missing?'?':`${p[k]}cm`); return `직각삼각형에서 밑변 = ${show('a')}, 높이 = ${show('b')}, 빗변 = ${show('c')}  →  ? = ?`; },
    answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'svg', svg:p=>SVG.pythagorean(p.a,p.b,p.missing) },
  PYTHAGORAS_APP:{ stage:11, grade:'중학교 2학년', topic:'피타고라스 활용 (사다리)',
    generate(){ const triples=[[3,4,5],[5,12,13],[8,15,17]]; const [a,b,c]=R.pick(triples); const k=R.int(1,3); return {ground:a*k,height:b*k,ans:c*k}; },
    template:p=>`벽에서 ${p.ground}m 떨어진 곳에 발을 두고, ${p.height}m 높이 지점에 기댄 사다리의 길이는?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },

  PROB_BASIC:{ stage:12, grade:'중학교 2학년', topic:'기본 확률',
    generate(){ const total=R.int(4,15),fav=R.int(1,total-1); return {total,fav,ans:fmtFrac(fav,total)}; },
    template:p=>`주머니에 공 ${p.total}개 중 빨간 공이 ${p.fav}개입니다. 임의로 꺼낸 공이 빨간 공일 확률은?`, answer:p=>p.ans, distractors:p=>fracDist(p.fav,p.total), renderType:'text' },
  PROB_COMP:{ stage:12, grade:'중학교 2학년', topic:'여사건 확률',
    generate(){ let n,d; do{ n=R.int(1,5); d=R.int(4,9); }while(n>=d); return {n,d,ans:fmtFrac(d-n,d)}; },
    template:p=>`어떤 사건이 일어날 확률이 ${p.n}/${p.d}일 때, 이 사건이 일어나지 않을 확률은?`, answer:p=>p.ans, distractors:p=>fracDist(p.d-p.n,p.d), renderType:'text' },
  PROB_MULT:{ stage:12, grade:'중학교 2학년', topic:'확률의 곱 (독립사건)',
    generate(){ const p1n=R.int(1,3),p1d=R.int(p1n+1,5); const p2n=R.int(1,3),p2d=R.int(p2n+1,5); return {p1n,p1d,p2n,p2d,ans:fmtFrac(p1n*p2n,p1d*p2d)}; },
    template:p=>`P(A) = ${p.p1n}/${p.p1d}, P(B) = ${p.p2n}/${p.p2d}일 때, A와 B가 동시에 일어날 확률은?`, answer:p=>p.ans, distractors:p=>fracDist(p.p1n*p.p2n,p.p1d*p.p2d), renderType:'text' },

  SQRT_BASIC:{ stage:13, grade:'중학교 3학년', topic:'제곱근 계산 (완전제곱수)',
    generate(){ const ans=R.int(2,12); return {n:ans*ans,ans}; },
    template:p=>`√${p.n} = ?`, answer:p=>p.ans, distractors:p=>[p.ans+1,p.ans-1,p.n/2].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },
  SQRT_SIMPLIFY:{ stage:13, grade:'중학교 3학년', topic:'제곱근 간단히 하기',
    generate(){ const a=R.int(2,5); const k=R.pick([2,3,5,6,7,10]); return {n:a*a*k,a,k,ans:`${a}√${k}`}; },
    template:p=>`√${p.n}을 가장 간단한 형태로 나타내면?`, answer:p=>p.ans,
    distractors:p=>[`${p.a+1}√${p.k}`,`${p.a}√${p.k+1}`,`${p.a-1}√${p.k*p.a}`].filter(d=>d!==p.ans), renderType:'text' },
  SQRT_ARITH:{ stage:13, grade:'중학교 3학년', topic:'제곱근 사칙연산 (동류항)',
    generate(){ const k=R.pick([2,3,5,6]); const a=R.int(1,5),b=R.int(1,5); return {a,b,k,ans:`${a+b}√${k}`}; },
    template:p=>`${p.a}√${p.k} + ${p.b}√${p.k} = ?`, answer:p=>p.ans,
    distractors:p=>[`${p.a+p.b+1}√${p.k}`,`${p.a*p.b}√${p.k}`,`${p.a+p.b}√${p.k*2}`].filter(d=>d!==p.ans), renderType:'text' },

  QUAD_FACTOR:{ stage:14, grade:'중학교 3학년', topic:'이차방정식 (인수분해)',
    generate(){ let pv,qv; do{ pv=R.int(-6,6); qv=R.int(-6,6); }while(pv===qv); const b=pv+qv,c=pv*qv; return {b,c,pv,qv,ans:`x = ${-pv} 또는 x = ${-qv}`}; },
    template:p=>`x² ${p.b>=0?'+':''}${p.b}x ${p.c>=0?'+':''}${p.c} = 0  →  x = ?`, answer:p=>p.ans,
    distractors:p=>[`x = ${p.pv} 또는 x = ${p.qv}`,`x = ${-p.pv} 또는 x = ${-p.qv+1}`,`x = ${-p.pv+1} 또는 x = ${-p.qv}`].filter(d=>d!==p.ans), renderType:'text' },
  QUAD_FORMULA:{ stage:14, grade:'중학교 3학년', topic:'이차방정식 (근의 공식)',
    generate(){ let pv,qv; do{ pv=R.int(-4,4); qv=R.int(-4,4); }while(pv===qv); const b=-(pv+qv),c=pv*qv; return {b,c,pv,qv,ans:`x = ${pv} 또는 x = ${qv}`}; },
    template:p=>`근의 공식을 이용하여 x² ${p.b>=0?'+':''}${p.b}x ${p.c>=0?'+':''}${p.c} = 0을 풀면?`, answer:p=>p.ans,
    distractors:p=>[`x = ${p.pv+1} 또는 x = ${p.qv}`,`x = ${p.pv} 또는 x = ${p.qv+1}`,`x = ${-p.pv} 또는 x = ${-p.qv}`].filter(d=>d!==p.ans), renderType:'text' },
  QUAD_EQ_APP:{ stage:14, grade:'중학교 3학년', topic:'이차방정식 활용',
    generate(){ const x=R.int(3,12); return {n:x*(x+1),ans:x}; },
    template:p=>`연속하는 두 자연수의 곱이 ${p.n}일 때, 더 작은 수는?`, answer:p=>p.ans,
    distractors:p=>[p.ans+1,p.ans-1,p.ans+2].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },

  QUAD_FUNC_VAL:{ stage:15, grade:'중학교 3학년', topic:'y = ax² 값 계산',
    generate(){ const a=R.pick([-3,-2,-1,1,2,3]); const xv=R.nonZero(-4,4); return {a,xv,ans:a*xv*xv}; },
    template:p=>`y = ${p.a}x²에서 x = ${p.xv}일 때, y = ?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  QUAD_FUNC_VERTEX:{ stage:15, grade:'중학교 3학년', topic:'이차함수 꼭짓점 좌표',
    generate(){ const a=R.pick([-2,-1,1,2]); const pv=R.int(-4,4),q=R.int(-4,4); return {a,pv,q,ans:`(${pv}, ${q})`}; },
    template:p=>`y = ${p.a}(x ${p.pv>=0?'-':'+'}${Math.abs(p.pv)})² ${p.q>=0?'+':''}${p.q}의 꼭짓점 좌표는?`, answer:p=>p.ans,
    distractors:p=>[`(${-p.pv}, ${p.q})`,`(${p.pv}, ${-p.q})`,`(${p.pv+1}, ${p.q})`].filter(d=>d!==p.ans),
    renderType:'svg', svg:p=>SVG.parabola(p.a,p.pv,p.q) },
  QUAD_FUNC_MAXMIN:{ stage:15, grade:'중학교 3학년', topic:'이차함수 최댓값/최솟값',
    generate(){ const a=R.pick([-2,-1,1,2]); const pv=R.int(-3,3),q=R.int(-5,5); const isMax=a<0; return {a,pv,q,isMax,ans:q}; },
    template:p=>`y = ${p.a}(x ${p.pv>=0?'-':'+'}${Math.abs(p.pv)})² ${p.q>=0?'+':''}${p.q}의 ${p.isMax?'최댓값':'최솟값'}은?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },

  TRIG_SPECIAL:{ stage:16, grade:'중학교 3학년', topic:'특수각 삼각비',
    generate(){ const pool=[{deg:30,fn:'sin',ans:'1/2'},{deg:30,fn:'cos',ans:'√3/2'},{deg:30,fn:'tan',ans:'√3/3'},{deg:45,fn:'sin',ans:'√2/2'},{deg:45,fn:'cos',ans:'√2/2'},{deg:45,fn:'tan',ans:'1'},{deg:60,fn:'sin',ans:'√3/2'},{deg:60,fn:'cos',ans:'1/2'},{deg:60,fn:'tan',ans:'√3'}]; return R.pick(pool); },
    template:p=>`${p.fn}(${p.deg}°) = ?`, answer:p=>p.ans,
    distractors:()=>{ const all=['1/2','√3/2','√2/2','√3/3','√3','1']; return R.shuffle(all).slice(0,3); }, renderType:'text' },
  TRIG_FIND_SIDE:{ stage:16, grade:'중학교 3학년', topic:'삼각비로 변의 길이',
    generate(){ const triples=[[3,4,5],[5,12,13],[8,15,17],[6,8,10]]; const [a,b,c]=R.pick(triples); const k=R.int(1,3); return {a:a*k,b:b*k,c:c*k,ans:b*k}; },
    template:p=>`직각삼각형에서 빗변 = ${p.c}cm, 밑변 = ${p.a}cm일 때 높이는?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans),
    renderType:'svg', svg:p=>SVG.pythagorean(p.a,p.b,'b') },
  TRIG_AREA:{ stage:16, grade:'중학교 3학년', topic:'삼각비로 삼각형 넓이',
    generate(){ const a=R.int(2,10),b=R.int(2,10); const entry=R.pick([{deg:30,sin:0.5,sinStr:'1/2'},{deg:60,sin:Math.sqrt(3)/2,sinStr:'√3/2'},{deg:90,sin:1,sinStr:'1'},{deg:120,sin:Math.sqrt(3)/2,sinStr:'√3/2'},{deg:150,sin:0.5,sinStr:'1/2'}]); const ans=Math.round(0.5*a*b*entry.sin*100)/100; return {a,b,deg:entry.deg,sinStr:entry.sinStr,ans}; },
    template:p=>`두 변 ${p.a}cm, ${p.b}cm이고 끼인각이 ${p.deg}°인 삼각형의 넓이는?`, answer:p=>p.ans,
    distractors:p=>[Math.round(p.a*p.b/2*100)/100,p.ans*2,Math.round(p.ans+p.a)].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },

  QUAD_DISCRIMINANT:{ stage:17, grade:'중학교 3학년', topic:'이차방정식 판별식',
    generate(){ const cases=[{b:4,c:3,D:4,ans:'서로 다른 두 실수 근'},{b:6,c:9,D:0,ans:'중근 (실수 근 1개)'},{b:2,c:5,D:-16,ans:'실수 근 없음'}]; const base=R.pick(cases); const a=R.pick([1,2,3]); return {...base,a}; },
    template:p=>`${p.a}x² + ${p.b}x + ${p.c} = 0의 근의 종류는?`, answer:p=>p.ans,
    distractors:()=>['서로 다른 두 실수 근','중근 (실수 근 1개)','실수 근 없음'], renderType:'text' },
  STATS_AVG:{ stage:17, grade:'중학교 3학년', topic:'평균과 중앙값',
    generate(){ const n=R.pick([5,7]); const data=Array.from({length:n},()=>R.int(1,20)).sort((a,b)=>a-b); const avg=Math.round(data.reduce((s,x)=>s+x,0)/n*10)/10; const median=data[Math.floor(n/2)]; const q=R.pick(['avg','median']); return {data,avg,median,q,ans:q==='avg'?avg:median}; },
    template:p=>`자료 [${p.data.join(', ')}]의 ${p.q==='avg'?'평균':'중앙값'}은?`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },
  STATS_VARIANCE:{ stage:17, grade:'중학교 3학년', topic:'분산',
    generate(){ const avgVal=R.int(3,8); const devs=[R.int(-3,3),R.int(-3,3),R.int(-3,3),R.int(-3,3),R.int(-3,3)]; const data=devs.map(d=>avgVal+d); const variance=Math.round(devs.map(d=>d*d).reduce((s,x)=>s+x,0)/5*10)/10; return {data,avgVal,variance,ans:variance}; },
    template:p=>`자료 [${p.data.join(', ')}]의 분산은? (평균 = ${p.avgVal})`, answer:p=>p.ans, distractors:p=>nearbyDist(p.ans), renderType:'text' },

  CIRCLE_INSCRIBED_ANGLE:{ stage:18, grade:'중학교 3학년', topic:'원주각과 중심각',
    generate(){ const center=R.multiple(20,160,20); return {center,ans:center/2}; },
    template:p=>`중심각이 ${p.center}°일 때, 같은 호에 대한 원주각의 크기는?`, answer:p=>p.ans,
    distractors:p=>[p.center,p.ans+10,p.ans-10].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },
  CIRCLE_TANGENT:{ stage:18, grade:'중학교 3학년', topic:'접선의 성질',
    generate(){ const tl=R.int(3,12); return {tl,ans:tl}; },
    template:p=>`원 밖의 점 P에서 원에 두 접선을 그었을 때, 한 접선의 길이가 ${p.tl}cm이면 다른 접선의 길이는?`, answer:p=>p.ans,
    distractors:p=>[p.ans+1,p.ans-1,p.ans*2].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },
  CIRCLE_CHORD:{ stage:18, grade:'중학교 3학년', topic:'현과 중심',
    generate(){ const pool=[[3,4,5],[5,12,13],[8,15,17]]; const [d,half,r]=R.pick(pool); return {r,d,half,ans:half*2}; },
    template:p=>`반지름 ${p.r}인 원에서 원의 중심으로부터 거리가 ${p.d}인 현의 길이는?`, answer:p=>p.ans,
    distractors:p=>[p.half,p.ans+2,p.ans-2].filter(d=>d>0&&d!==p.ans).slice(0,3), renderType:'text' },

  STATS_STD_COMPARE:{ stage:19, grade:'중학교 3학년', topic:'표준편차 비교',
    generate(){ const cases=[{stdA:2.1,stdB:4.5,q:'성적이 더 고른 반',ans:'A반'},{stdA:3.0,stdB:1.2,q:'성적 분포가 더 넓은 반',ans:'A반'},{stdA:5.0,stdB:2.0,q:'표준편차가 더 작은 반',ans:'B반'}]; return R.pick(cases); },
    template:p=>`A반 표준편차 = ${p.stdA}, B반 표준편차 = ${p.stdB}. "${p.q}"은?`, answer:p=>p.ans,
    distractors:()=>['A반','B반','두 반 같음','알 수 없음'], renderType:'text' },
  STATS_RELATIVE_FREQ:{ stage:19, grade:'중학교 3학년', topic:'상대도수',
    generate(){ const total=R.pick([20,25,40,50]); const freq=R.int(2,total-2); return {total,freq,ans:Math.round(freq/total*100)/100}; },
    template:p=>`전체 ${p.total}명 중 ${p.freq}명이 해당 계급에 속할 때, 상대도수는?`, answer:p=>p.ans,
    distractors:p=>[Math.round((p.freq-1)/p.total*100)/100,Math.round(p.freq/(p.total+5)*100)/100,Math.round(p.ans*2*100)/100].filter(d=>d!==p.ans).slice(0,3), renderType:'text' },
  STATS_SCATTER:{ stage:19, grade:'중학교 3학년', topic:'산점도와 상관관계',
    generate(){ return R.pick([{desc:'키가 클수록 몸무게가 많이 나가는 경향',ans:'양의 상관관계'},{desc:'기온이 높을수록 코코아 판매량이 줄어드는 경향',ans:'음의 상관관계'},{desc:'신발 사이즈와 수학 성적의 관계',ans:'상관관계 없음'},{desc:'공부 시간이 길수록 시험 점수가 높아지는 경향',ans:'양의 상관관계'}]); },
    template:p=>`"${p.desc}"가 나타날 때 산점도의 특징은?`, answer:p=>p.ans,
    distractors:()=>['양의 상관관계','음의 상관관계','상관관계 없음'], renderType:'text' },

  COMP_QUAD_FUNC:{ stage:20, grade:'중학교 3학년', topic:'이차함수 종합',
    generate(){ const a=R.pick([-2,-1,1,2]); const pv=R.int(-3,3),q=R.int(-4,4); const xv=pv+R.pick([-2,-1,1,2]); return {a,pv,q,xv,ans:a*Math.pow(xv-pv,2)+q}; },
    template:p=>`y = ${p.a}(x ${p.pv>=0?'-':'+'}${Math.abs(p.pv)})² ${p.q>=0?'+':''}${p.q}에서 x = ${p.xv}일 때, y = ?`, answer:p=>p.ans,
    distractors:p=>nearbyDist(p.ans), renderType:'svg', svg:p=>SVG.parabola(p.a,p.pv,p.q) },
  COMP_TRIG_PYTHAG:{ stage:20, grade:'중학교 3학년', topic:'삼각비 + 피타고라스 종합',
    generate(){ const triples=[[3,4,5],[5,12,13],[8,15,17]]; const [a,b,c]=R.pick(triples); const fn=R.pick(['sin','cos','tan']); const ans=fn==='sin'?`${b}/${c}`:fn==='cos'?`${a}/${c}`:`${b}/${a}`; return {a,b,c,fn,ans}; },
    template:p=>`직각삼각형에서 밑변=${p.a}, 높이=${p.b}, 빗변=${p.c}일 때 ${p.fn}(θ) = ?`, answer:p=>p.ans,
    distractors:p=>[`${p.b}/${p.c}`,`${p.a}/${p.c}`,`${p.b}/${p.a}`,`${p.a}/${p.b}`].filter(o=>o!==p.ans).slice(0,3),
    renderType:'svg', svg:p=>SVG.pythagorean(p.a,p.b,null) },
  COMP_STAT_PROB:{ stage:20, grade:'중학교 3학년', topic:'통계 + 확률 종합',
    generate(){ const n=6; const data=Array.from({length:n},()=>R.int(1,10)).sort((a,b)=>a-b); const avg=data.reduce((s,x)=>s+x,0)/n; const aboveCnt=data.filter(x=>x>avg).length; return {data,avg:Math.round(avg*10)/10,aboveCnt,ans:fmtFrac(aboveCnt,n)}; },
    template:p=>`자료 [${p.data.join(', ')}]의 평균은 ${p.avg}입니다. 이 자료에서 임의로 하나를 뽑을 때 평균보다 큰 값일 확률은?`, answer:p=>p.ans,
    distractors:p=>fracDist(p.aboveCnt,6), renderType:'text' },
};

const STAGE_MAP = {
  1:['ADD_1D','SUB_1D','CMP_NUM'], 2:['MUL_TABLE','DIV_EXACT','ADD_2D'], 3:['FRAC_SAME','RECT_AREA','MUL_2D'],
  4:['FRAC_DIFF','TRI_AREA','DECIMAL_MUL'], 5:['FRAC_MUL','CIRCLE_AREA','RATIO'], 6:['INT_ADD','INT_MUL','PRIME_FACTOR'],
  7:['LINEAR_EQ_1','LINEAR_EQ_2','LINEAR_EQ_APP'], 8:['POLYGON_ANGLE','SECTOR_ARC','PRISM_VOL'], 9:['INEQUALITY_1','SIMUL_EQ','CYCLE_DEC'],
  10:['LINEAR_FUNC_VAL','LINEAR_FUNC_GRAPH','LINEAR_FUNC_XINT'], 11:['SIMILAR_RATIO','PYTHAGORAS_1','PYTHAGORAS_APP'],
  12:['PROB_BASIC','PROB_COMP','PROB_MULT'], 13:['SQRT_BASIC','SQRT_SIMPLIFY','SQRT_ARITH'], 14:['QUAD_FACTOR','QUAD_FORMULA','QUAD_EQ_APP'],
  15:['QUAD_FUNC_VAL','QUAD_FUNC_VERTEX','QUAD_FUNC_MAXMIN'], 16:['TRIG_SPECIAL','TRIG_FIND_SIDE','TRIG_AREA'],
  17:['QUAD_DISCRIMINANT','STATS_AVG','STATS_VARIANCE'], 18:['CIRCLE_INSCRIBED_ANGLE','CIRCLE_TANGENT','CIRCLE_CHORD'],
  19:['STATS_STD_COMPARE','STATS_RELATIVE_FREQ','STATS_SCATTER'], 20:['COMP_QUAD_FUNC','COMP_TRIG_PYTHAG','COMP_STAT_PROB'],
};

function generateProblem(stage, typeId=null){
  const types=STAGE_MAP[stage]; if(!types) throw new Error(`Invalid stage: ${stage}`);
  const id=typeId||R.pick(types); const def=PROBLEMS[id]; if(!def) throw new Error(`Unknown problem type: ${id}`);
  const params=def.generate();
  const correctAns=String(def.answer(params));
  let wrongs=def.distractors(params).map(String).filter(d=>d!==correctAns).slice(0,3);
  while(wrongs.length<3){
    const fallback=String(nearbyDist(Number(correctAns),1)[0]);
    if(!wrongs.includes(fallback)&&fallback!==correctAns) wrongs.push(fallback);
    else wrongs.push(String(Number(correctAns)+wrongs.length+5));
  }
  return {
    typeId:id, stage:def.stage, grade:def.grade, topic:def.topic,
    questionText:def.template(params), answer:correctAns,
    choices:R.shuffle([correctAns,...wrongs.slice(0,3)]),
    renderType:def.renderType, svgContent:def.renderType==='svg'?def.svg(params):null,
  };
}
function generateStageSet(stage){ return STAGE_MAP[stage].map(id=>generateProblem(stage,id)); }

window.MathEngine = { generateProblem, generateStageSet, PROBLEMS, STAGE_MAP };
})();
