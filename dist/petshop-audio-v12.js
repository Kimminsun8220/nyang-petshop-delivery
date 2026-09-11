/* Original, softly synthesized music and effects; no downloads or autoplay. */
window.gameSound = (() => {
  let context, master, timer, nextNote = 0, step = 0, muted = false;
  const voices = new Set();
  const melody = [72,76,79,76,74,0,71,67,69,72,76,72,67,0,64,67,
    65,69,72,69,67,0,64,60,62,67,71,74,72,0,67,0];
  const roots = [48,45,41,43];
  const hz = midi => 440 * Math.pow(2,(midi-69)/12);
  function label() {
    const button = document.getElementById('soundToggle');
    if (!button) return;
    button.textContent = muted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐';
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? '음악과 효과음 켜기' : '음악과 효과음 끄기');
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
      if (note) tone(hz(note), hz(note), .9, .075, 'sine', nextNote);
      if (step % 8 === 0) {
        const root = roots[Math.floor(step/8) % roots.length];
        [root,root+7,root+12].forEach(n => tone(hz(n),hz(n),3.1,.022,'sine',nextNote));
      }
      step++; nextNote += .42;
    }
  }
  function silence() {
    clearInterval(timer); timer = null;
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
        master.gain.value = .5; master.connect(context.destination);
      }
      context.resume().then(() => {
        if (muted || document.hidden) return;
        master.gain.setTargetAtTime(.5,context.currentTime,.04);
        if (!timer) { nextNote = context.currentTime + .08; schedule(); timer = setInterval(schedule,100); }
      }).catch(() => {});
    } catch (_) { /* Sound must never interrupt game actions. */ }
  }
  function sfx(kind) {
    if (!context || muted || document.hidden) return;
    try {
      if (kind === 'meow') {
        const now = context.currentTime;
        tone(420,780,.16,.12,'triangle',now);
        tone(780,330,.48,.13,'triangle',now+.14);
        tone(1200,660,.42,.025,'sine',now+.16);
      }
      else if (kind === 'hit') { tone(150,45,.28,.22,'triangle'); tone(75,38,.32,.16,'sine'); }
      else if (kind === 'move') tone(240,520,.11,.11,'sine');
      else if (kind === 'throw') { tone(850,160,.24,.13,'triangle'); tone(420,1000,.13,.05,'sine'); }
      else { tone(520,190,.19,.15,'sine'); tone(260,390,.10,.035,'triangle'); }
    } catch (_) {}
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button,[role="button"]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (button.id === 'soundToggle') {
      muted = !muted; label();
      if (muted) silence(); else { unlock(); sfx('click'); }
      return;
    }
    unlock();
    if (!button.matches('.drive-btn,#throwButton,.mascot-cat,.customer-card')) sfx('click');
  }, true);
  document.addEventListener('keydown', event => {
    if (!event.repeat && ['ArrowLeft','ArrowRight','a','A','d','D','Enter',' '].includes(event.key)) unlock();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence(); else if (context) unlock();
  });
  window.addEventListener('pagehide',silence);
  label();
  return { sfx };
})();
