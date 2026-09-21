(() => {
  "use strict";
  const trips = window.TRIPS;
  if (!trips?.length) return;
  const photos = trips.flatMap((trip) => trip.media.filter(m => m.type === "img").map(m => ({...m, trip})));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const section = document.createElement("section");
  section.id = "playground"; section.className = "section playground";
  section.innerHTML = '<div class="wrap"><p class="play-kicker">TAKE A LITTLE DETOUR</p><h2>잠깐, 놀다 가요.</h2><p class="sub">같은 여행, 다섯 가지 다른 놀이. 사진 속으로 한 걸음 더.</p><div class="play-cards"></div></div>';
  document.getElementById("moves").after(section);
  const modes = [
    ["quiz","🎯","여긴 어디일까요?","사진 한 장, 지도 위 한 번의 선택.","5문제 도전"],
    ["slot","🎰","오늘의 목적지","계획 없이 떠나는 랜덤 여행.","여행지 뽑기"],
    ["puzzle","🧩","조각난 순간","흩어진 사진 아홉 조각을 맞춰요.","퍼즐 맞추기"],
    ["goat","🐐","사진 도둑을 잡아라","사진을 물고 달아난 염소를 세 번 톡!","염소 잡기"],
    ["space","🪐","사진 사이를 떠다니기","끌어서 둘러보는 작은 여행 우주.","사진 공간 열기"]
  ];
  const dialog = document.createElement("dialog");
  dialog.className = "play-dialog"; dialog.setAttribute("aria-labelledby", "play-title");
  dialog.innerHTML = '<header><div><small>TRAVEL PLAYGROUND</small><h2 id="play-title"></h2></div><button class="play-close" aria-label="놀이터 닫기">✕</button></header><div class="play-body"></div>';
  document.body.append(dialog);
  const body = dialog.querySelector(".play-body");
  let cleanup = () => {}, opener, previousOverflow, active=false;
  function reset() { cleanup(); cleanup = () => {}; body.replaceChildren(); }
  function teardown(){if(!active)return;active=false;reset();document.documentElement.style.overflow=previousOverflow;opener?.focus();} function close() { if(dialog.open) {teardown();dialog.close();} }
  dialog.querySelector(".play-close").onclick = close;
  dialog.addEventListener("close", () => { if(!dialog.open)teardown(); });
  dialog.addEventListener("click", e => { if(e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) close(); }});
  function open(mode, source) {
    opener = source || document.activeElement;
    reset(); dialog.querySelector("h2").textContent = modes.find(m => m[0]===mode)[2];
    previousOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow="hidden";
    active=true; dialog.showModal(); ({quiz,slot,puzzle,goat,space})[mode]();
    dialog.querySelector(".play-close").focus();
  }
  for(const [id,icon,title,desc,cta] of modes) {
    const button = document.createElement("button"); button.className="play-card"; button.dataset.play=id;
    button.innerHTML='<span class="play-icon">'+icon+'</span><strong>'+title+'</strong><span>'+desc+'</span><b>'+cta+' ↗</b>';
    button.onclick=()=>open(id,button); section.querySelector(".play-cards").append(button);
  }
  const shortcut=document.createElement("a"); shortcut.href="#playground"; shortcut.className="btn glass"; shortcut.textContent="여행 놀이터 ↗";
  document.querySelector(".hero .cta").append(shortcut);
  function el(tag, text, cls) { const n=document.createElement(tag); if(text) n.textContent=text; if(cls)n.className=cls; return n; }
  function button(text, action, parent=body) { const b=el("button",text,"play-action"); b.type="button"; b.onclick=action; parent.append(b); return b; }
  function photo(p, parent=body, label=p.alt) { const i=el("img",null,"play-photo"); i.src=p.src; i.alt=label; parent.append(i); return i; }
  function pick(list) { return list[Math.floor(Math.random()*list.length)]; }
  function shuffle(list) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
  function visit(t) { close(); document.getElementById("map").scrollIntoView({behavior:reduce?"instant":"smooth"}); window.TripMap?.select(trips.indexOf(t)); }
  function reveal(p, parent=body) {
    photo(p,parent); parent.append(el("h3",p.trip.place+" · "+p.trip.year));
    const actions=el("div",null,"play-actions"); parent.append(actions);
    button("지도에서 보기",()=>visit(p.trip),actions);
    button("사진·영상 더 보기",()=>{close(); window.openLightbox(p.trip.media);},actions);
  }
  function distance(a,b) {
    const r=Math.PI/180, v=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;
    return Math.round(12742*Math.asin(Math.sqrt(Math.min(1,v))));
  }
  function quiz() {
    const rounds=shuffle(trips).slice(0,5).map(t=>pick(photos.filter(p=>p.trip===t)));
    let index=0, total=0; const results=[];
    function round() {
      body.replaceChildren();
      if(index===rounds.length) {
        body.append(el("p","YOUR TRAVEL INSTINCT","play-kicker"),el("h3",total.toLocaleString()+" / 5,000점","play-score"));
        const list=el("ol"); for(const r of results) list.append(el("li",r)); body.append(list,el("p","여행 지역의 대표 좌표 기준이에요. 실제 촬영 지점을 맞히는 게임은 아니에요."));
        button("다시 도전",quiz); button("지도 둘러보기",()=>visit(rounds[0].trip)); return;
      }
      const p=rounds[index]; let guess=null, locked=false;
      body.append(el("p",(index+1)+" / 5 · 누적 "+total+"점","play-kicker"));
      photo(p,body,"여행지 맞히기 문제 사진");
      body.append(el("p","지도에서 위치를 찍거나, 아래에서 여행 지역을 선택하세요."));
      const canvas=el("canvas",null,"quiz-map"); canvas.width=900; canvas.height=440; canvas.setAttribute("aria-label","아시아 지도. 아래 선택 목록으로도 답할 수 있습니다."); body.append(canvas);
      const ctx=canvas.getContext("2d"), bounds={west:85,east:150,north:55,south:-15};
      const xy=t=>[(t.lon-bounds.west)/65*900,(bounds.north-t.lat)/70*440];
      const draw=answer=>{
        ctx.fillStyle="#0b1730";ctx.fillRect(0,0,900,440);
        const L=window.LAND; if(L) {ctx.fillStyle="#476a82";L.runs.forEach((runs,row)=>{let c=0;for(let k=0;k<runs.length;k+=2){c+=runs[k];for(let j=0;j<runs[k+1];j++){const [x,y]=xy({lon:L.lon0+(c+j+.5)*L.cell,lat:L.lat0-(row+.5)*L.cell});ctx.fillRect(x,y,3,3);}c+=runs[k+1];}});}
        for(const [t,color,label] of [[guess,"#ffd07b","선택"],[answer,"#67efd0","정답"]]) if(t){const[x,y]=xy(t);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.font="bold 20px sans-serif";ctx.fillText(label,x+12,y);}
      }; draw();
      const label=el("label","여행 지역 선택"); const select=el("select"); select.setAttribute("aria-label","정답으로 선택할 여행 지역");
      select.append(new Option("지도에서 찍거나 지역을 골라 주세요","")); trips.forEach((t,i)=>select.append(new Option(t.place,String(i)))); label.append(select);body.append(label);
      const status=el("p","아직 선택하지 않았어요.","play-status");status.setAttribute("aria-live","polite");body.append(status);
      const submit=button("정답 확인",()=> {
        if(!guess||locked)return;locked=true;submit.disabled=true;select.disabled=true;draw(p.trip);
        const km=distance(guess,p.trip),points=Math.round(1000*Math.exp(-km/1200));total+=points;
        results.push(p.trip.place+" — "+km.toLocaleString()+"km 차이 · "+points+"점");
        status.textContent="정답: "+p.trip.place+"! "+km.toLocaleString()+"km 차이 · +"+points+"점";
        button(index===4?"결과 보기":"다음 사진",()=>{index++;round();});
      });submit.disabled=true;
      function choose(g){if(locked)return;guess=g;draw();submit.disabled=false;status.textContent="위치를 골랐어요. 정답을 확인해 보세요.";}
      select.onchange=()=>{if(select.value!=="")choose(trips[Number(select.value)]);};
      canvas.onclick=e=>{if(locked)return; const r=canvas.getBoundingClientRect();select.value="";choose({lon:85+(e.clientX-r.left)/r.width*65,lat:55-(e.clientY-r.top)/r.height*70});};
    } round();
  }
  function slot() {
    let timer, controller; cleanup=()=>{clearInterval(timer);controller?.abort();};
    body.append(el("p","어디로 갈지 고민은 잠깐 내려놓으세요.","play-kicker"));
    const stage=el("div",null,"slot-stage"), result=el("div");body.append(stage,result);
    const spin=button("🎰 목적지 뽑기",()=>{
      controller?.abort();spin.disabled=true;result.replaceChildren();let count=0;const winner=pick(photos);
      const show=p=>{stage.replaceChildren();photo(p,stage);stage.append(el("h3",p.trip.place));};
      function finish(){
        clearInterval(timer);show(winner);spin.disabled=false;spin.textContent="한 번 더 뽑기";
        const state=el("p","현지 날씨를 확인하는 중…","play-status");result.append(state);
        button("이곳의 사진·영상 보기",()=>{close();window.openLightbox(winner.trip.media);},result);button("지도에서 보기",()=>visit(winner.trip),result);
        controller?.abort();controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),12000), c=controller;
        cleanup=()=>{clearInterval(timer);clearTimeout(timeout);c.abort();};
        fetch(window.API_BASE+"/api/weather?lat="+winner.trip.lat+"&lon="+winner.trip.lon,{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(w=>{state.textContent=w.icon+" "+w.temp_c+"°C · "+w.label+" · "+w.source;}).catch(()=>{state.textContent="날씨는 잠시 쉬는 중이에요. 사진과 영상은 바로 볼 수 있어요.";}).finally(()=>clearTimeout(timeout));
      }
      if(reduce){finish();return;}
      timer=setInterval(()=>{show(pick(photos));if(++count>=16)finish();},95);
    });
    stage.append(el("div","✈","slot-empty"),el("h3","다음 목적지는?"));
  }
  function puzzle() {
    let p=pick(photos), order,selected=-1,moves=0;
    body.append(el("p","두 조각을 차례로 누르면 자리가 바뀌어요. 키보드 Tab · Enter도 가능해요."));
    const select=el("select");select.setAttribute("aria-label","퍼즐 사진 선택");
    photos.forEach((x,i)=>select.append(new Option(x.trip.place+" · "+x.alt,String(i))));select.value=String(photos.indexOf(p));body.append(select);
    const grid=el("div",null,"puzzle-grid"),status=el("p",null,"play-status");status.setAttribute("aria-live","polite");body.append(grid,status);
    const actions=el("div",null,"play-actions");body.append(actions);
    button("다시 섞기",start,actions);
    const peek=button("원본 보기",()=>{preview.hidden=!preview.hidden;peek.textContent=preview.hidden?"원본 보기":"원본 닫기";},actions);
    const preview=photo(p);preview.hidden=true;
    select.onchange=()=>{p=photos[Number(select.value)];preview.src=p.src;preview.alt=p.alt;start();};
    function start(){order=shuffle([0,1,2,3,4,5,6,7,8]);if(order.every((v,i)=>v===i))[order[0],order[1]]=[order[1],order[0]];selected=-1;moves=0;draw();}
    function draw(focus=-1){
      const solved=order.every((v,i)=>v===i);grid.replaceChildren();
      order.forEach((v,i)=>{const b=el("button");b.type="button";b.setAttribute("aria-label",(i+1)+"번 위치, 사진 조각 "+(v+1));b.setAttribute("aria-pressed",String(selected===i));b.style.backgroundImage='url("'+p.src+'")';b.style.backgroundPosition=(v%3*50)+"% "+(Math.floor(v/3)*50)+"%";b.disabled=solved;
        b.onclick=()=>{if(selected<0){selected=i;draw(i);}else if(selected===i){selected=-1;draw(i);}else{[order[selected],order[i]]=[order[i],order[selected]];selected=-1;moves++;draw(i);}};grid.append(b);});
      status.textContent=solved?"완성! "+moves+"번 만에 "+p.trip.place+"의 순간을 되찾았어요.":"자리 바꾸기 "+moves+"회"+(selected>=0?" · 바꿀 조각을 하나 더 고르세요.":"");
      if(focus>=0&&!solved)grid.children[focus].focus();
    }start();
  }
  function goat() {
    const p=pick(photos);let catches=0,timer,finished=false;
    body.append(el("p","사진 도둑 염소를 세 번 잡아 주세요. 시간 제한은 없어요!"));
    const arena=el("div",null,"goat-arena"),status=el("p","0 / 3번 잡음","play-status");status.setAttribute("aria-live","polite");body.append(arena,status);
    const thief=el("button","🐐","goat-thief");thief.setAttribute("aria-label","사진을 훔친 염소 잡기");const stolen=photo(p,thief);stolen.alt="염소가 가져간 사진";arena.append(thief);
    function move(){thief.style.left=(8+Math.random()*62)+"%";thief.style.top=(8+Math.random()*58)+"%";}
    thief.onclick=()=>{if(finished)return;catches++;status.textContent=catches+" / 3번 잡음";if(catches===3){finished=true;skip.disabled=true;clearInterval(timer);arena.remove();status.textContent="잡았다! "+p.trip.place+"의 사진을 되찾았어요.";reveal(p);button("다른 사진으로 한 판 더",()=>{reset();goat();});}else move();};
    const skip=button("그냥 사진 보기",()=>{if(finished)return;finished=true;skip.disabled=true;clearInterval(timer);arena.remove();status.textContent="염소와 평화롭게 사진을 나눠 봐요.";reveal(p);});
    if(!reduce)timer=setInterval(()=>{if(document.activeElement!==thief)move();},1700);
    cleanup=()=>clearInterval(timer);
  }
  function space() {
    body.append(el("p","빈 공간을 끌어서 이동하고, 사진을 눌러 크게 보세요. 방향키와 아래 이동 버튼도 사용할 수 있어요."));
    const viewport=el("div",null,"photo-space");viewport.tabIndex=0;viewport.setAttribute("aria-label","여행 사진 공간. 방향키로 이동");const world=el("div",null,"photo-world");viewport.append(world);body.append(viewport);
    let x=0,y=0,drag=null,moved=false;
    const width=1600,height=1100;
    const apply=()=>{x=Math.max(Math.min(0,viewport.clientWidth-width),Math.min(0,x));y=Math.max(Math.min(0,viewport.clientHeight-height),Math.min(0,y));world.style.transform="translate("+x+"px,"+y+"px)";};
    photos.forEach((p,i)=>{const b=el("button",null,"space-photo");b.style.left=(30+i%6*255)+"px";b.style.top=(25+Math.floor(i/6)*215)+"px";b.style.rotate=((i%5-2)*3)+"deg";photo(p,b);b.append(el("span",p.trip.place));b.onclick=()=>{if(moved)return;close();window.openLightbox(p.trip.media,p.trip.media.findIndex(m=>m.src===p.src));};
      b.onfocus=()=>{if(!b.matches(":focus-visible"))return;x=viewport.clientWidth/2-(30+i%6*255+105);y=viewport.clientHeight/2-(25+Math.floor(i/6)*215+80);apply();};world.append(b);});
    viewport.onpointerdown=e=>{if(e.target.closest("button"))return;drag={px:e.clientX,py:e.clientY,x,y};moved=false;viewport.setPointerCapture(e.pointerId);};
    viewport.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.px,dy=e.clientY-drag.py;moved=Math.abs(dx)+Math.abs(dy)>6;x=drag.x+dx;y=drag.y+dy;apply();};
    viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;setTimeout(()=>moved=false,0);};
    const pan=(dx,dy)=>{x+=dx;y+=dy;apply();};
    viewport.onkeydown=e=>{const d={ArrowLeft:[180,0],ArrowRight:[-180,0],ArrowUp:[0,150],ArrowDown:[0,-150]}[e.key];if(d){e.preventDefault();pan(...d);}};
    const controls=el("div",null,"play-actions");body.append(controls);
    [["←",180,0],["↑",0,150],["↓",0,-150],["→",-180,0]].forEach(([s,dx,dy])=>button(s,()=>pan(dx,dy),controls));
    button("처음 위치",()=>{x=0;y=0;apply();},controls);
    const ro=new ResizeObserver(apply);ro.observe(viewport);cleanup=()=>ro.disconnect();apply();
  }
})();