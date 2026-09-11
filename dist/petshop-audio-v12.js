/* Synthesized music/effects and a user-provided meow recording. */
window.gameSound = (() => {
  let context, master, timer, nextNote = 0, step = 0, muted = false;
  let volume = .8;
  const voices = new Set();
  const musicVoices = new Set();
  // Bring the quiet interlude closer to the recorded day/night tracks.
  const interludeBoost = 3;
  let dayScene = true;
  let nightScene = false;
  const nightMusic = new Audio('assets/night-music-v34.mp3');
  nightMusic.loop = true;
  nightMusic.preload = 'auto';
  nightMusic.volume = .45 * volume;
  const dayMusic = new Audio('assets/day-music-v32.mp3');
  dayMusic.loop = true;
  dayMusic.preload = 'auto';
  dayMusic.volume = .45 * volume;
  function audioHint(message = '') {
    const hint = document.getElementById('audioStartHint');
    if (!hint) return;
    hint.textContent = message;
    hint.hidden = !message;
  }
  dayMusic.addEventListener('playing', () => audioHint());
  function setScene(screen) {
    const nextDay = screen === 'startScreen' || screen === 'dayScreen' || screen === 'resultScreen';
    const nextNight = screen === 'transitionScreen' || screen === 'nightScreen';
    if (nextDay === dayScene && nextNight === nightScene) return;
    dayScene = nextDay;
    nightScene = nextNight;
    nightMusic.pause();
    if (nightScene) nightMusic.currentTime = 0;
    dayMusic.pause();
    clearInterval(timer); timer = null;
    for (const voice of musicVoices) { try { voice.stop(); } catch (_) {} }
    musicVoices.clear();
    unlock();
  }
  const meow = new Audio('assets/meow-v28.mp3');
  meow.preload = 'auto';
  meow.volume = .65 * volume;
  const moveSounds = Array.from({ length: 4 }, () => {
    const sound = new Audio('assets/move-whoosh-v40.mp3');
    sound.preload = 'auto';
    sound.volume = .65 * volume;
    return sound;
  });
  let moveVoice = 0;
  const moveBoosts = new Map();
  const interactionBoost = 3;
  function applyVolume() {
    moveSounds.forEach(sound => { sound.volume = muted ? 0 : .65 * volume; });
    meow.volume = muted ? 0 : .65 * volume;
    dayMusic.volume = muted ? 0 : .45 * volume;
    nightMusic.volume = muted ? 0 : .45 * volume;
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
  function tone(from, to, duration, volume, type = 'sine', when = context.currentTime, music = false) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume * (music ? interludeBoost : 1), when + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain); gain.connect(master);
    voices.add(oscillator);
    if (music) musicVoices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); musicVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when); oscillator.stop(when + duration + .03);
  }
  function schedule() {
    if (dayScene || nightScene || !context || muted || document.hidden || context.state !== 'running') return;
    if (nextNote < context.currentTime) nextNote = context.currentTime + .04;
    while (nextNote < context.currentTime + .25) {
      const note = melody[step % melody.length];
      if (note) tone(hz(note), hz(note), .9, .13, 'sine', nextNote, true);
      if (step % 8 === 0) {
        const root = roots[Math.floor(step/8) % roots.length];
        [root,root+7,root+12].forEach(n => tone(hz(n),hz(n),3.1,.038,'sine',nextNote,true));
      }
      step++; nextNote += .42;
    }
  }
  function silence() {
    moveSounds.forEach(sound => { sound.pause(); sound.currentTime = 0; });
    nightMusic.pause();
    audioHint();
    dayMusic.pause();
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
    if (nightScene && nightMusic.paused) nightMusic.play().catch(() => {});
    if (dayScene && dayMusic.paused) dayMusic.play().then(() => audioHint()).catch(error => {
      if (muted || document.hidden || !dayScene) return;
      if (error.name === 'NotAllowedError') audioHint('🔊 화면을 한 번 누르면 음악이 시작돼요');
      else if (error.name !== 'AbortError') audioHint('음악을 불러오지 못했어요. 다시 눌러 주세요.');
    });
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
        if (!dayScene && !nightScene && !timer) { nextNote = context.currentTime + .08; schedule(); timer = setInterval(schedule,100); }
      }).catch(() => {});
    } catch (_) { /* Sound must never interrupt game actions. */ }
  }
  function sfx(kind) {
    if (muted || document.hidden) return;
    if (kind === 'move') {
      try {
        unlock();
        const moveSound = moveSounds[moveVoice++ % moveSounds.length];
        if (context && !moveBoosts.has(moveSound)) {
          const source = context.createMediaElementSource(moveSound);
          const boost = context.createGain();
          boost.gain.value = interactionBoost;
          source.connect(boost); boost.connect(context.destination);
          moveBoosts.set(moveSound, { source, boost });
        }
        moveSound.pause();
        moveSound.currentTime = .22;
        moveSound.play().catch(() => {
          if (!muted && !document.hidden && context) tone(240,520,.11,.11 * interactionBoost,'sine');
        });
      } catch (_) {}
      return;
    }
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
      else if (kind === 'throw') { tone(850,160,.24,.13,'triangle'); tone(420,1000,.13,.05,'sine'); }
      else { tone(520,190,.19,.26 * interactionBoost,'sine'); tone(260,390,.10,.06 * interactionBoost,'triangle'); }
    } catch (_) {}
  }
  document.addEventListener('click', event => {
    const panel = document.getElementById('volumePanel');
    if (!event.target.closest('#soundControl')) {
      panel.hidden = true;
      document.getElementById('soundToggle').setAttribute('aria-expanded', 'false');
    }
    const button = event.target.closest('button,[role="button"]');
    if (!button) { unlock(); return; }
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (button.id === 'soundToggle') {
      unlock();
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
    if (document.hidden) silence(); else unlock();
  });
  window.addEventListener('pagehide',silence);
  label();
  // Browsers with autoplay permission can start now; otherwise user input resumes it.
  unlock();
  return { sfx, setScene };
})();
