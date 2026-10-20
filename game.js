(() => {
  const app = document.querySelector('#app');
  const announcer = document.querySelector('#announcer');
  const SAVE_KEY = 'english-birds-progress-v1';
  const LEVELS = [
    { title: 'Garden friends', detail: 'Meet familiar birds you may see every day' },
    { title: 'Colorful neighbors', detail: 'Discover colorful birds from gardens and woodlands' },
    { title: 'Water & shore birds', detail: 'Explore the birds that live by water and shore' },
    { title: 'Birds of the sky', detail: 'Meet remarkable birds that soar through the sky' },
    { title: 'Faraway fliers', detail: 'Find extraordinary birds from faraway places' },
  ];
  let groups = [];
  let state = readSave();
  let current = null;
  let pointerStart = null;
  let ignoreClickUntil = 0;
  let audio = null;

  function readSave() {
    try {
      const currentSave = localStorage.getItem(SAVE_KEY);
      const saved = JSON.parse(currentSave || '{}');
      const rounds = currentSave && Array.isArray(saved.levelRounds) ? saved.levelRounds : [];
      const levelRounds = Array.from({ length: 5 }, (_, index) => Math.max(0, Math.min(2, Number(rounds[index]) || 0)));
      let unlockedLevel = 1;
      while (unlockedLevel < 5 && levelRounds[unlockedLevel - 1] === 2) unlockedLevel += 1;
      return {
        unlockedLevel,
        levelRounds,
        levelOrders: currentSave && saved.levelOrders && typeof saved.levelOrders === 'object' ? saved.levelOrders : {},
        stickers: Math.max(0, Number(saved.stickers) || 0),
      };
    } catch {
      return { unlockedLevel: 1, levelRounds: [0, 0, 0, 0, 0], levelOrders: {}, stickers: 0 };
    }
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Storage may be unavailable in private browsing. */ }
  }

  function announce(message) {
    announcer.textContent = '';
    window.setTimeout(() => { announcer.textContent = message; }, 20);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function icon(name, className = '') {
    const drawings = {
      paw: '<rect x="4" y="3" width="5" height="6" rx="2"/><rect x="15" y="3" width="5" height="6" rx="2"/><rect x="1" y="10" width="5" height="6" rx="2"/><rect x="18" y="10" width="5" height="6" rx="2"/><path d="M6 17h2v-2h2v-2h4v2h2v2h2v4h-2v1H8v-1H6z"/>',
      bird: '<path d="M2 13h5V9h4V5h6v3h4v3h2v4h-5v3h-3v3H8v-3H5v-3H2z"/><path d="M15 5h5v3h4v3h-4v2h-4z"/><path d="M11 8h2v2h-2z"/>',
      play: '<path d="M4 2h4v4h4v4h4v4h4v4h-4v4h-4v-4H8v-4H4z"/>',
      bird: '<path d="M2 13h5V9h4V5h6v3h4v3h2v4h-5v3h-3v3H8v-3H5v-3H2z"/><path d="M15 5h5v3h4v3h-4v2h-4z"/><path d="M11 8h2v2h-2z"/>',
      star: '<path d="M10 1h4v4h3v3h4v4h-3v3h-2v4h-3v-2h-4v2H6v-4H4v-3H1V8h4V5h3V2h2z"/>',
      home: '<path d="M2 11h3V8h3V5h3V2h3v3h3v3h3v3h2v3h-4v8h-6v-5h-4v5H6v-8H2z"/>',
      sound: '<path d="M2 9h4l5-5h3v16h-3l-5-5H2z"/><path d="M17 8h2v2h2v4h-2v2h-2v-3h2v-2h-2z"/><path d="M18 3h2v2h2v2h-2V5h-2z"/>',
      left: '<path d="M3 10h11V6l7 6-7 6v-4H3z"/>',
      right: '<path d="M21 10H10V6l-7 6 7 6v-4h11z"/>',
      check: '<path d="M2 12h4v4h3v-3h3v-3h3V7h3V4h4v5h-3v3h-3v3h-3v3h-3v3H8v-3H5v-3H2z"/>',
      lock: '<path d="M6 10V7h2V4h2V2h4v2h2v3h2v3h2v12H4V10zm3 0h6V7h-2V5h-2v2H9z"/>',
      sparkle: '<path d="M10 1h4v5h3v3h5v4h-5v3h-3v6h-4v-6H7v-3H2V9h5V6h3z"/>',
      trophy: '<path d="M5 2h14v3h3v7h-3v3h-3v3h-2v2h4v3H6v-3h4v-2H8v-3H5v-3H2V5h3zm0 3H4v4h2v3h3v3h6v-3h3V9h2V5h-1v3h-2v3h-3v2h-4v-2H7V8H5z"/>',
    };
    return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><g shape-rendering="crispEdges">${drawings[name] || ''}</g></svg>`;
  }

  function shuffled(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function shell(content) {
    app.classList.remove('home-mode');
    app.setAttribute('aria-busy', 'false');
    app.innerHTML = `<header class="topbar"><div class="brand"><span class="pixel-mark">${icon('bird')}</span><span class="brand-copy"><strong>Little Creatures</strong><small>Big discoveries start here</small></span></div><div class="counter" aria-label="Stars collected">${icon('star')}<span>${state.stickers}</span></div></header>${content}<footer class="footer"><span>${icon('sparkle')} A playful bird adventure</span><span class="online-status">Progress is saved on this device</span></footer>`;
  }

  function home() {
    current = null;
    shell(`<section class="screen"><div class="hero"><div class="hero-copy"><h1>Let's play!</h1><button class="primary" data-action="levels">${icon('play')} PLAY!</button></div><div class="hero-art"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-tag">${icon('star')}</span><img class="hero-animal" src="./assets/images/bir_sparrow.webp" alt="A house sparrow"></div></div></section>`);
    app.classList.add('home-mode');
    app.querySelector('[data-action="levels"]').addEventListener('click', showLevels);
  }

  function showLevels() {
    current = null;
    const cards = groups.map((group, index) => {
      const number = index + 1;
      const unlocked = number <= state.unlockedLevel;
      const completedRounds = state.levelRounds[index];
      const complete = completedRounds === 2;
      const progress = complete ? 'Complete · play again' : `Round ${completedRounds + 1} of 2`;
      return `<button class="level-card ${complete ? 'is-complete' : ''}" data-level="${number}" ${unlocked ? '' : 'disabled'}><span class="level-number">${complete ? icon('check') : unlocked ? String(number).padStart(2, '0') : icon('lock')}</span><span class="level-copy"><strong>${escapeHtml(LEVELS[index].title)}</strong><small>${escapeHtml(LEVELS[index].detail)}</small><span class="level-progress">${unlocked ? progress : 'Complete the previous level first'}</span></span><span class="level-enter" aria-hidden="true">→</span></button>`;
    }).join('');
    shell(`<section class="screen levels-screen"><div class="screen-heading"><span class="eyebrow">Your journey starts here</span><h1 class="section-title">Choose an adventure</h1><p class="subhead">Choose a path and see who you meet!</p></div><div class="levels">${cards}</div><button class="secondary" data-action="home">${icon('left')} Back to home</button></section>`);
    app.querySelectorAll('[data-level]').forEach((button) => button.addEventListener('click', () => startRound(Number(button.dataset.level))));
    app.querySelector('[data-action="home"]').addEventListener('click', home);
  }

  function startRound(levelNumber) {
    const group = groups[levelNumber - 1];
    if (!group || levelNumber > state.unlockedLevel) return;
    const reviewMode = state.levelRounds[levelNumber - 1] === 2;
    let ids = state.levelOrders[levelNumber];
    if (reviewMode) {
      ids = shuffled(group).map((animal) => animal.id);
    } else if (!Array.isArray(ids) || ids.length !== group.length) {
      ids = shuffled(group).map((animal) => animal.id);
      state.levelOrders[levelNumber] = ids;
      save();
    }
    const roundIndex = reviewMode ? 0 : state.levelRounds[levelNumber - 1];
    const groupById = new Map(group.map((animal) => [animal.id, animal]));
    const roundSizes = [Math.ceil(group.length / 2), Math.floor(group.length / 2)];
    const startIndex = reviewMode ? 0 : roundSizes.slice(0, roundIndex).reduce((sum, size) => sum + size, 0);
    const roundSize = reviewMode ? group.length : roundSizes[roundIndex];
    const targets = ids.slice(startIndex, startIndex + roundSize).map((id) => groupById.get(id));
    current = { level: levelNumber, roundIndex, roundSize, startIndex, targets, index: 0, reviewMode, locked: false, options: [], feedback: '' };
    showQuestion();
  }

  function renderOptions() {
    return current.options.map((animal, index) => `<button class="choice" data-choice="${index}" aria-label="Choose the ${index === 0 ? 'left' : 'right'} picture"><span class="choice-index">${index + 1}</span><img class="choice-art" src="${escapeHtml(animal.image)}" alt="" draggable="false"><span class="choice-arrow">${icon(index === 0 ? 'left' : 'right')}<span>Swipe ${index === 0 ? 'left' : 'right'}</span></span></button>`).join('');
  }

  function showQuestion() {
    if (!current) return;
    const target = current.targets[current.index];
    const pool = groups[current.level - 1].filter((item) => item.id !== target.id);
    current.options = shuffled([target, shuffled(pool)[0]]);
    current.locked = false;
    current.feedback = '';
    const progressValue = current.index + 1;
    const percent = Math.round((progressValue / current.roundSize) * 100);
    const progressLabel = current.reviewMode ? 'Practice time!' : 'Keep exploring!';
    shell(`<section class="screen play-screen"><div class="game-header"><button class="tiny-button" data-action="levels" aria-label="Back to levels">${icon('home')}</button><div class="progress-wrap"><div class="progress-line"><div class="progress-copy">${progressLabel}</div><span class="level-pill">Level ${String(current.level).padStart(2, '0')}</span></div><div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${current.roundSize}" aria-valuenow="${progressValue}"><div class="progress-fill" style="width:${percent}%"></div></div></div></div><div class="prompt-panel"><span class="prompt-kicker">Listen and choose</span><p class="prompt-title">Which picture matches the name?</p><button class="listen-button" data-action="listen">${icon('sound')} <span>Hear the name</span></button></div><div class="choices" aria-label="Two bird pictures">${renderOptions()}</div><div class="feedback" id="feedback" hidden></div></section>`);
    app.querySelector('[data-action="levels"]').addEventListener('click', showLevels);
    app.querySelector('[data-action="listen"]').addEventListener('click', () => playName(target));
    app.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
      if (Date.now() >= ignoreClickUntil) answer(Number(button.dataset.choice));
    }));
    attachSwipe();
    announce('Press Hear the name.');
  }

  function playName(animal) {
    if (audio) { audio.pause(); audio = null; }
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new window.SpeechSynthesisUtterance(animal.speechText || animal.name);
        utterance.lang = 'en-US';
        utterance.rate = 0.82;
        utterance.pitch = 1.02;
        utterance.onerror = () => announce('Could not play the voice. Please try again.');
        window.speechSynthesis.speak(utterance);
      } catch { announce('Could not play the voice. Please try again.'); }
      return;
    }
    announce('This browser does not have an English reading voice available.');
  }

  function attachSwipe() {
    const choices = app.querySelector('.choices');
    choices.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    choices.addEventListener('pointerup', (event) => {
      if (!pointerStart) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
      const selected = deltaX < 0 ? 0 : 1;
      const card = choices.querySelector(`[data-choice="${selected}"]`);
      card.classList.add(deltaX < 0 ? 'swipe-left' : 'swipe-right');
      ignoreClickUntil = Date.now() + 450;
      answer(selected);
    });
    choices.addEventListener('pointercancel', () => { pointerStart = null; });
  }

  function onArrowKey(event) {
    if (!current) return;
    if (event.key === 'ArrowLeft') answer(0);
    if (event.key === 'ArrowRight') answer(1);
  }

  function answer(optionIndex) {
    if (!current || current.locked) return;
    const target = current.targets[current.index];
    const selected = current.options[optionIndex];
    const feedback = app.querySelector('#feedback');
    feedback.hidden = false;
    if (selected.id === target.id) {
      current.locked = true;
      feedback.className = 'feedback good';
      feedback.innerHTML = `<span>Well done! ${icon('star')}</span><span class="feedback-word">${escapeHtml(target.name)}</span><div class="feedback-actions"><button class="listen-button" data-action="again">${icon('sound')} Hear it again</button><button class="primary" data-action="next">Next →</button></div>`;
      feedback.querySelector('[data-action="again"]').addEventListener('click', () => playName(target));
      feedback.querySelector('[data-action="next"]').addEventListener('click', nextQuestion);
      const chosen = app.querySelector(`[data-choice="${optionIndex}"]`);
      if (chosen) chosen.classList.add('correct');
      announce(`Well done! ${target.name}`);
    } else {
      feedback.className = 'feedback try';
      feedback.textContent = 'Close one! Listen again and try once more.';
      const chosen = app.querySelector(`[data-choice="${optionIndex}"]`);
      if (chosen) chosen.classList.add('wrong');
      window.setTimeout(() => chosen && chosen.classList.remove('wrong'), 300);
      announce('Close one. Try again.');
    }
  }

  function nextQuestion() {
    if (!current) return;
    current.index += 1;
    if (current.index < current.targets.length) { showQuestion(); return; }
    finishRound();
  }

  function finishRound() {
    const finishedLevel = current.level;
    const completedRoundIndex = current.roundIndex;
    const reviewMode = current.reviewMode;
    current = null;
    if (!reviewMode) {
      state.stickers += 1;
      state.levelRounds[finishedLevel - 1] = Math.max(state.levelRounds[finishedLevel - 1], completedRoundIndex + 1);
    }
    const levelComplete = state.levelRounds[finishedLevel - 1] === 2;
    if (levelComplete && finishedLevel < 5) state.unlockedLevel = Math.max(state.unlockedLevel, finishedLevel + 1);
    save();
    if (reviewMode) {
      showLevels();
      announce('Lovely practice! Pick another adventure.');
      return;
    }
    const allDone = state.levelRounds.every((rounds) => rounds === 2);
    if (!allDone) {
      startRound(levelComplete ? finishedLevel + 1 : finishedLevel);
      return;
    }
    const message = 'You have met all your bird friends! Come back and play again anytime.';
    shell(`<section class="screen"><div class="complete-card"><div class="big-star" aria-hidden="true">${icon('trophy')}</div><h1 class="section-title">Adventure complete!</h1><p class="subhead">${message}</p><div class="stars" aria-label="Stars collected">${icon('star')} ${state.stickers}</div><div class="feedback-actions"><button class="secondary" data-action="levels">Choose a level</button></div></div></section>`);
    app.querySelector('[data-action="levels"]').addEventListener('click', showLevels);
    announce('Wonderful! You have met all your bird friends.');
  }

  async function init() {
    try {
      const content = window.ENGLISH_BIRDS_CONTENT;
      if (!content) throw new Error('Game content could not be loaded');
      if (content.edition !== 'en-birds' || content.language !== 'en' || !Array.isArray(content.difficultyLevels) || !Array.isArray(content.items)) throw new Error('This is not the English Birds collection');
      const byId = new Map(content.items.map((item) => [item.id, item]));
      groups = content.difficultyLevels.map((level) => level.items.map((id) => byId.get(id)).filter(Boolean));
      const birds = groups.flat();
      if (birds.length !== 50 || groups.length !== 5 || groups.some((group) => group.length !== 10) || new Set(birds.map((bird) => bird.id)).size !== 50) throw new Error('The bird collection is incomplete');
      home();
      app.addEventListener('keydown', onArrowKey);
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch (error) {
      console.error(error);
      app.setAttribute('aria-busy', 'false');
      app.innerHTML = '<div class="loading-error" role="alert">The bird game could not be prepared. Check that the game files are together, then reopen this page.</div>';
    }
  }

  init();
})();
