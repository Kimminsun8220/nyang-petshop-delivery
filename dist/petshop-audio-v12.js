/* Synthesized music/effects and a user-provided meow recording. */
window.gameSound = (() => {
  let context, master, timer, nextNote = 0, step = 0, muted = false;
  let volume = .8;
  const voices = new Set();
  const meow = new Audio('assets/meow-v28.mp3');
  meow.preload = 'auto';
  meow.volume = .65 * volume;
  function applyVolume() {
    meow.volume = muted ? 0 : .65 * volume;
    if (context) master.gain.setTargetAtTime(muted || document.hidden ? 0 : .5 * volume, context.currentTime, .02);
    document.getElementById('volumeValue').textContent = `${Math.round(volume * 100)}%`;
  }
  document.getElementById('soundVolume').addEventListener('input', event => {
    volume = Math.max(0, Math.min(1, Number(event.target.value) / 100));
    applyVolume();
    label();
    unlock();
  });
  const melody = [72,76,79,76,74,0,71,67,69,72,76,72,67,0,64,67,
    65,69,72,69,67,0,64,60,62,67,71,74,72,0,67,0];
  const roots = [48,45,41,43];
  const hz = midi => 440 * Math.pow(2,(midi-69)/12);
  function label() {
    const button = document.getElementById('soundToggle');
    if (!button) return;
    const silent = muted || volume === 0;
    button.classList.toggle('is-muted', silent);
    button.setAttribute('aria-label', `${silent ? '음소거' : '소리 켜짐'} · 볼륨 조절`);
    const muteButton = document.getElementById('soundMute');
    muteButton.classList.toggle('is-muted', silent);
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? '음소거 해제' : '음소거');
  }
  function tone(from, to, duration, volume, type = 'sine', when = context.currentTime) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain); gain.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when); oscillator.stop(when + duration + .03);
  }
  function schedule() {
    if (!context || muted || document.hidden || context.state !== 'running') return;
    if (nextNote < context.currentTime) nextNote = context.currentTime + .04;
    while (nextNote < context.currentTime + .25) {
      const note = melody[step % melody.length];
      if (note) tone(hz(note), hz(note), .9, .13, 'sine', nextNote);
      if (step % 8 === 0) {
        const root = roots[Math.floor(step/8) % roots.length];
        [root,root+7,root+12].forEach(n => tone(hz(n),hz(n),3.1,.038,'sine',nextNote));
      }
      step++; nextNote += .42;
    }
  }
  function silence() {
    clearInterval(timer); timer = null;
    meow.pause();
    meow.currentTime = 0;
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0,context.currentTime,.012);
    for (const voice of voices) { try { voice.stop(context.currentTime + .06); } catch (_) {} }
  }
  function unlock() {
    if (muted || document.hidden) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio(); master = context.createGain();
        master.gain.value = .5 * volume; master.connect(context.destination);
      }
      context.resume().then(() => {
        if (muted || document.hidden) return;
        master.gain.setTargetAtTime(.5 * volume,context.currentTime,.04);
        if (!timer) { nextNote = context.currentTime + .08; schedule(); timer = setInterval(schedule,100); }
      }).catch(() => {});
    } catch (_) { /* Sound must never interrupt game actions. */ }
  }
  function sfx(kind) {
    if (muted || document.hidden) return;
    if (kind === 'meow') {
      try {
        meow.pause();
        meow.currentTime = 0;
        meow.play().catch(() => {});
      } catch (_) {}
      return;
    }
    if (!context) return;
    try {
      if (kind === 'hit') { tone(150,45,.28,.22,'triangle'); tone(75,38,.32,.16,'sine'); }
      else if (kind === 'move') tone(240,520,.11,.11,'sine');
      else if (kind === 'throw') { tone(850,160,.24,.13,'triangle'); tone(420,1000,.13,.05,'sine'); }
      else { tone(520,190,.19,.26,'sine'); tone(260,390,.10,.06,'triangle'); }
    } catch (_) {}
  }
  document.addEventListener('click', event => {
    const panel = document.getElementById('volumePanel');
    if (!event.target.closest('#soundControl')) {
      panel.hidden = true;
      document.getElementById('soundToggle').setAttribute('aria-expanded', 'false');
    }
    const button = event.target.closest('button,[role="button"]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (button.id === 'soundToggle') {
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
      return;
    }
    if (button.id === 'soundMute') {
      muted = !muted; label(); applyVolume();
      if (muted) silence(); else { unlock(); sfx('click'); }
      return;
    }
    unlock();
    if (!button.matches('.drive-btn,#throwButton,.mascot-cat,.customer-card')) sfx('click');
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('volumePanel').hidden) {
      document.getElementById('volumePanel').hidden = true;
      document.getElementById('soundToggle').setAttribute('aria-expanded', 'false');
      document.getElementById('soundToggle').focus();
    }
    if (!event.repeat && ['ArrowLeft','ArrowRight','a','A','d','D','Enter',' '].includes(event.key)) unlock();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence(); else if (context) unlock();
  });
  window.addEventListener('pagehide',silence);
  label();
  // Browsers with autoplay permission can start now; otherwise user input resumes it.
  unlock();
  return { sfx };
})();
