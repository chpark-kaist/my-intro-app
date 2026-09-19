// 🐐 염소 이스터에그: 화면 왼쪽 아래의 염소나 몽골 사진 속 염소를 누르면 염소 떼가 달려갑니다.
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fab = document.getElementById("goatFab");
  if (!fab) return;
  const bubble = fab.querySelector(".goat-bubble");
  let count = 0;
  let audio;

  const LINES = [
    "🐐 메에~ 몽골 초원에서 만난 친구예요!",
    "🐐 염소 떼가 출동했어요!",
    "🐐 이 친구, 사진보다 실물이 더 컸어요",
    "🐐 한 번 더 눌러 보세요!",
    "🐐 몽골의 염소는 무리 지어 다녀요",
  ];

  // ---------- 소리: 웹 오디오로 만든 짧은 "메에~" (눌렀을 때만 재생, 작은 볼륨) ----------
  function bleat() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const lfo = audio.createOscillator();
      const lfoGain = audio.createGain();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.12);
      osc.frequency.linearRampToValueAtTime(300, t + 0.62);
      lfo.frequency.value = 26;              // 떨리는 목소리
      lfoGain.gain.value = 34;
      lfo.connect(lfoGain).connect(osc.frequency);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.linearRampToValueAtTime(1500, t + 0.3);
      filter.Q.value = 3;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
      osc.connect(filter).connect(gain).connect(audio.destination);
      osc.start(t); lfo.start(t);
      osc.stop(t + 0.7); lfo.stop(t + 0.7);
    } catch (_) { /* 소리가 안 나도 괜찮아요 */ }
  }

  // ---------- 염소 떼 ----------
  function herd(n) {
    if (reduce) return;
    const layer = document.createElement("div");
    layer.className = "goat-herd";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    let alive = n;
    for (let k = 0; k < n; k++) {
      const outer = document.createElement("span");
      const inner = document.createElement("span");
      inner.textContent = "🐐";
      outer.className = "goat-run";
      outer.style.fontSize = `${28 + Math.random() * 44}px`;
      outer.style.bottom = `${2 + Math.random() * 30}vh`;
      outer.append(inner);
      layer.append(outer);
      const dur = 2800 + Math.random() * 2200;
      const fromLeft = Math.random() < 0.5;
      const a = outer.animate(
        fromLeft ? [{ transform: "translateX(-18vw)" }, { transform: "translateX(118vw)" }]
                 : [{ transform: "translateX(118vw)" }, { transform: "translateX(-18vw)" }],
        { duration: dur, delay: k * 110, easing: "linear", fill: "both" });
      inner.animate(
        [{ transform: "translateY(0) rotate(-6deg)" }, { transform: "translateY(-26px) rotate(8deg)" }, { transform: "translateY(0) rotate(-6deg)" }],
        { duration: 380 + Math.random() * 200, iterations: Infinity, easing: "ease-in-out" });
      a.onfinish = () => { if (--alive === 0) layer.remove(); };
    }
  }

  // ---------- 안내 말풍선 ----------
  let toastTimer;
  function toast(text) {
    let el = document.querySelector(".goat-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "goat-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function call() {
    count++;
    bleat();
    const big = count % 5 === 0;
    herd(big ? 26 : 8 + Math.floor(Math.random() * 5));
    toast(big ? `🎉 염소를 ${count}번 불렀어요! 염소 떼 대이동!` : LINES[(count - 1) % LINES.length]);
    fab.classList.add("clicked");
    fab.querySelector(".goat-count").textContent = count;
    if (bubble) bubble.textContent = "한 번 더!";
    fab.classList.add("pop");
    setTimeout(() => fab.classList.remove("pop"), 400);
  }

  window.callGoat = call;
  fab.addEventListener("click", call);
  document.querySelectorAll("[data-goat]").forEach((el) => el.addEventListener("click", call));
})();
