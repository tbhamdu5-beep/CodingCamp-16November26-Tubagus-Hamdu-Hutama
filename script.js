/* ==============================================
   PERSONAL PRODUCTIVITY DASHBOARD — script.js
   ============================================== */

/* ------------------------------------------------
   HELPERS
   ------------------------------------------------ */
function pad(n) {
  return String(n).padStart(2, '0');
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

/* ================================================
   1. DIGITAL CLOCK & GREETING
   ================================================ */
const clockEl    = document.getElementById('clock');
const dateEl     = document.getElementById('date');
const greetingEl = document.getElementById('greeting');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function updateClock() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  const s    = now.getSeconds();

  clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

  const dayName   = DAYS[now.getDay()];
  const monthName = MONTHS[now.getMonth()];
  const day       = now.getDate();
  const year      = now.getFullYear();
  dateEl.textContent = `${dayName}, ${monthName} ${day}, ${year}`;

  let greeting;
  if (h >= 5 && h < 12) {
    greeting = '☀️ Good Morning';
  } else if (h >= 12 && h < 17) {
    greeting = '🌤 Good Afternoon';
  } else if (h >= 17 && h < 21) {
    greeting = '🌆 Good Evening';
  } else {
    greeting = '🌙 Good Night';
  }
  greetingEl.textContent = greeting;
}

updateClock();
setInterval(updateClock, 1000);


/* ================================================
   2. FOCUS TIMER
   ================================================ */
const timerDisplayEl = document.getElementById('timerDisplay');
const timerLabelEl   = document.getElementById('timerLabel');
const startStopBtn   = document.getElementById('startStopBtn');
const resetBtn       = document.getElementById('resetBtn');
const sessionCountEl = document.getElementById('sessionCount');
const timerCard      = document.querySelector('.timer-card');
const modeBtns       = document.querySelectorAll('.mode-btn');

let timerTotalSeconds  = 25 * 60;
let timerRemaining     = timerTotalSeconds;
let timerInterval      = null;
let timerRunning       = false;
let currentModeLabel   = 'Focus Session';
let sessionCount       = loadFromStorage('sessionCount', 0);

sessionCountEl.textContent = sessionCount;

function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

function renderTimer() {
  timerDisplayEl.textContent = formatTimer(timerRemaining);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  startStopBtn.textContent = 'Pause';
  timerCard.classList.add('timer-running');

  timerInterval = setInterval(() => {
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      startStopBtn.textContent = 'Start';
      timerCard.classList.remove('timer-running');
      timerRemaining = 0;
      renderTimer();

      // Count session only for Focus mode
      if (currentModeLabel === 'Focus Session') {
        sessionCount++;
        sessionCountEl.textContent = sessionCount;
        saveToStorage('sessionCount', sessionCount);
      }

      // Notify
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏱ Timer Done!', { body: `${currentModeLabel} complete!` });
      }
      return;
    }
    timerRemaining--;
    renderTimer();
  }, 1000);
}

function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  startStopBtn.textContent = 'Resume';
  timerCard.classList.remove('timer-running');
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerRemaining = timerTotalSeconds;
  startStopBtn.textContent = 'Start';
  timerCard.classList.remove('timer-running');
  renderTimer();
}

startStopBtn.addEventListener('click', () => {
  if (timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const minutes = parseInt(btn.dataset.minutes, 10);
    currentModeLabel      = btn.dataset.label;
    timerTotalSeconds     = minutes * 60;
    timerLabelEl.textContent = currentModeLabel;
    resetTimer();
  });
});

renderTimer();

// Ask notification permission once
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}


/* ================================================
   3. TASKS
   ================================================ */
const taskInput    = document.getElementById('taskInput');
const addTaskBtn   = document.getElementById('addTaskBtn');
const taskListEl   = document.getElementById('taskList');
const taskSummaryEl= document.getElementById('taskSummary');
const clearCompBtn = document.getElementById('clearCompleted');

let tasks = loadFromStorage('tasks', []);

function saveTasks() {
  saveToStorage('tasks', tasks);
}

function renderTasks() {
  taskListEl.innerHTML = '';
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" data-index="${index}" ${task.done ? 'checked' : ''} />
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" data-index="${index}">Delete</button>
    `;
    taskListEl.appendChild(li);
  });

  const remaining = tasks.filter(t => !t.done).length;
  taskSummaryEl.textContent = `${remaining} task${remaining !== 1 ? 's' : ''} remaining`;
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.push({ text, done: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

taskListEl.addEventListener('change', e => {
  if (e.target.classList.contains('task-checkbox')) {
    const idx = parseInt(e.target.dataset.index, 10);
    tasks[idx].done = e.target.checked;
    saveTasks();
    renderTasks();
  }
});

taskListEl.addEventListener('click', e => {
  if (e.target.classList.contains('task-delete')) {
    const idx = parseInt(e.target.dataset.index, 10);
    tasks.splice(idx, 1);
    saveTasks();
    renderTasks();
  }
});

clearCompBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderTasks();
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

renderTasks();


/* ================================================
   4. QUICK LINKS
   ================================================ */
const linkNameInput = document.getElementById('linkName');
const linkUrlInput  = document.getElementById('linkUrl');
const addLinkBtn    = document.getElementById('addLinkBtn');
const linksGridEl   = document.getElementById('linksGrid');

// Default links pre-loaded on first visit
const DEFAULT_LINKS = [
  { label: 'Google',    url: 'https://google.com' },
  { label: 'GitHub',    url: 'https://github.com' },
  { label: 'YouTube',   url: 'https://youtube.com' },
  { label: 'Wikipedia', url: 'https://wikipedia.org' },
];

let links = loadFromStorage('quickLinks', null);
if (links === null) {
  links = DEFAULT_LINKS;
  saveToStorage('quickLinks', links);
}

function saveLinks() {
  saveToStorage('quickLinks', links);
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (_) {
    return '';
  }
}

function renderLinks() {
  linksGridEl.innerHTML = '';

  if (links.length === 0) {
    linksGridEl.innerHTML = '<span class="links-empty">No quick links yet. Add one above!</span>';
    return;
  }

  links.forEach((link, index) => {
    const a = document.createElement('a');
    a.className     = 'link-chip';
    a.href          = link.url;
    a.target        = '_blank';
    a.rel           = 'noopener noreferrer';

    const faviconSrc = getFavicon(link.url);
    a.innerHTML = `
      <img class="chip-icon" src="${faviconSrc}" alt="" width="16" height="16"
           onerror="this.style.display='none'" />
      ${escapeHtml(link.label)}
      <button class="chip-delete" data-index="${index}" title="Remove link">✕</button>
    `;
    linksGridEl.appendChild(a);
  });
}

function addLink() {
  const label = linkNameInput.value.trim();
  let   url   = linkUrlInput.value.trim();

  if (!label || !url) {
    if (!label) linkNameInput.focus();
    else linkUrlInput.focus();
    return;
  }

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  links.push({ label, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

addLinkBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addLink();
});
linkNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') linkUrlInput.focus();
});

linksGridEl.addEventListener('click', e => {
  const deleteBtn = e.target.closest('.chip-delete');
  if (deleteBtn) {
    e.preventDefault();
    e.stopPropagation();
    const idx = parseInt(deleteBtn.dataset.index, 10);
    links.splice(idx, 1);
    saveLinks();
    renderLinks();
  }
});

renderLinks();


/* ================================================
   5. DARK / LIGHT MODE TOGGLE
   ================================================ */
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

let isDark = loadFromStorage('darkMode', false);

function applyTheme() {
  if (isDark) {
    document.body.classList.add('dark');
    themeIcon.textContent = '☀️';
    themeToggle.title = 'Switch to Light Mode';
  } else {
    document.body.classList.remove('dark');
    themeIcon.textContent = '🌙';
    themeToggle.title = 'Switch to Dark Mode';
  }
}

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  saveToStorage('darkMode', isDark);
  applyTheme();
});

applyTheme();
