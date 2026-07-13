// --- Action Tracker Dashboard Application Logic ---

// --- 1. Global State & Configuration ---
const TRACKER_KEYS = {
  timers: [
    'social_media',
    'trading_static_training',
    'trading_live_training',
    'real_live_trading',
    'trading_study',
    'review',
    'spiritual_growth',
    'exercise',
    'other_study'
  ],
  counters: [
    'parent_study',
    'parent_play',
    'trading_static_cnt',
    'trading_live_cnt'
  ]
};

const TRACKER_META = {
  timers: {
    social_media: { label: '社群娛樂', defaultGoal: 1.0 },
    trading_static_training: { label: '歷史圖表訓練', defaultGoal: 1.0 },
    trading_live_training: { label: '實時市場訓練', defaultGoal: 1.0 },
    real_live_trading: { label: '實盤交易記錄', defaultGoal: 2.0 },
    trading_study: { label: '交易影音學習', defaultGoal: 0.5 },
    review: { label: '交易覆盤總結', defaultGoal: 0.5 },
    spiritual_growth: { label: '靈命成長', defaultGoal: 0.5 },
    exercise: { label: '體能運動健身', defaultGoal: 0.5 },
    other_study: { label: '跨領域學習', defaultGoal: 1.0 }
  },
  counters: {
    parent_study: { label: '親子共讀學習', defaultGoal: 1 },
    parent_play: { label: '親子遊戲陪伴', defaultGoal: 1 },
    trading_static_cnt: { label: '死圖分析次數', defaultGoal: 5 },
    trading_live_cnt: { label: '生圖分析次數', defaultGoal: 3 }
  }
};

const DEFAULT_SCHEDULE_SLOTS = [
  {
    id: 'aest_0630_family_morning',
    time: '06:30-08:30 AEST',
    hkt: '',
    title: '小朋友起床 / 早餐 / 送學 / 家務高峰',
    metric: '0交易',
    status: 'family',
    weight: 1
  },
  {
    id: 'aest_0830_market_prep',
    time: '08:30-10:30 AEST',
    hkt: '06:30-08:30 HKT',
    title: '快速家務 + 開局前總準備',
    metric: '看日線/4H，標記 HSI/EUR/USD 關鍵 OB、FVG、liquidity；產出三句 bias + 關鍵價位，寫入日記；尚不交易',
    status: 'prep',
    weight: 2
  },
  {
    id: 'aest_1100_hsi_window',
    time: '11:00-12:30 AEST',
    hkt: '09:00-10:30 HKT',
    title: 'HSI 交易窗',
    metric: '唯一 HSI real-time 執行時段；最多 1-2 單，每單風險 <= 1%，entry 前必過 checklist',
    status: 'trade',
    weight: 3
  },
  {
    id: 'aest_1230_lunch_flex',
    time: '12:30-15:00 AEST',
    hkt: '',
    title: '午餐 / 家務 / 接送 / 彈性時段',
    metric: '0交易；可對 HSI 已完成的單做中段快照紀錄',
    status: 'family',
    weight: 1
  },
  {
    id: 'aest_1500_home_reset',
    time: '15:00-16:30 AEST',
    hkt: '',
    title: '家務 / 晚餐備料收尾',
    metric: '0交易；預留淨空檔給歐洲 setup',
    status: 'family',
    weight: 1
  },
  {
    id: 'aest_1630_europe_setup',
    time: '16:30 AEST',
    hkt: '14:30 HKT',
    title: '歐洲市場 Setup',
    metric: '標記 London open 前關鍵位、liquidity pool、premium/discount；只做分析/劃線/落單計劃，完成後離開螢幕',
    status: 'prep',
    weight: 2
  },
  {
    id: 'aest_1630_dinner_prep',
    time: '16:30-18:00 AEST',
    hkt: '',
    title: '煮飯前置作業 / 歐洲預掛單自動執行',
    metric: '若歐洲 setup 觸發預掛單，系統自動執行；不需要人盯盤',
    status: 'auto',
    weight: 1
  },
  {
    id: 'aest_1800_family_dinner',
    time: '18:00-19:30 AEST',
    hkt: '',
    title: '煮飯 + 家庭晚餐時間',
    metric: '完全離開圖表；螢幕關閉，0交易',
    status: 'family',
    weight: 2
  },
  {
    id: 'aest_1930_bedtime',
    time: '19:30-21:00 AEST',
    hkt: '17:30-19:00 HKT',
    title: '小朋友睡前程序',
    metric: '0交易',
    status: 'family',
    weight: 1
  },
  {
    id: 'aest_2100_us_setup',
    time: '21:00-23:00 AEST',
    hkt: '19:00-21:00 HKT',
    title: '美國市場 Setup + 開盤觀察',
    metric: '21:00-21:30 標記關鍵位落計劃；21:30 後觀察 waterfall/sweep 是否符合計劃；最多 1 單，風險 <= 1%，禁止臨場加新想法',
    status: 'trade',
    weight: 3
  },
  {
    id: 'aest_2300_review',
    time: '23:00-23:30 AEST',
    hkt: '',
    title: '每日覆盤（神復盤）',
    metric: '三個市場合併寫一篇日記；100% 完成率，非談判習慣；太累可 15 分鐘語音備忘，隔天早上補打字',
    status: 'review',
    weight: 3
  },
  {
    id: 'aest_2330_sleep_hygiene',
    time: '23:30 後 AEST',
    hkt: '',
    title: '遠離螢幕 / 睡眠衛生',
    metric: '不做隔夜監倉刺激決策',
    status: 'recovery',
    weight: 2
  }
];

// Pre-trade checklist (Priority 0 discipline gate)
const PRETRADE_CHECKLIST = [
  { id: 'trend', label: '1. 順勢', desc: 'HTF 方向一致，唔逆勢' },
  { id: 'momentum', label: '2. 原生夠力 + 破慣性', desc: '突破有力度，唔係陰跌陰升' },
  { id: 'ob', label: '3. OB', desc: '價格返到有效 Order Block' },
  { id: 'fib618', label: '4. 618', desc: '0.618 回撤 / premium-discount 合理' },
  { id: 'liquidity', label: '5. 禁區前有 $', desc: '目標方向有 liquidity 可取' },
  { id: 'timing', label: '6. 時間配合', desc: '喺計劃內交易窗（HSI / 美國）' },
  { id: 'stop', label: '7. 止蝕盤 STOP', desc: '止蝕已設好，風險 ≤ 1%' }
];
const PRETRADE_REQUIRED_COUNT = 4;
let pretradeChecks = {};

const TRADING_TIMER_KEYS = [
  'trading_static_training',
  'trading_live_training',
  'real_live_trading',
  'trading_study',
  'review'
];

// Minutes-since-midnight ranges for the Now card (23:30 slot wraps past midnight to 06:30)
const SCHEDULE_SLOT_TIMES = {
  aest_0630_family_morning: { start: 390, end: 510 },
  aest_0830_market_prep: { start: 510, end: 630 },
  aest_1100_hsi_window: { start: 660, end: 750 },
  aest_1230_lunch_flex: { start: 750, end: 900 },
  aest_1500_home_reset: { start: 900, end: 990 },
  aest_1630_europe_setup: { start: 990, end: 1020 },
  aest_1630_dinner_prep: { start: 1020, end: 1080 },
  aest_1800_family_dinner: { start: 1080, end: 1170 },
  aest_1930_bedtime: { start: 1170, end: 1260 },
  aest_2100_us_setup: { start: 1260, end: 1380 },
  aest_2300_review: { start: 1380, end: 1410 },
  aest_2330_sleep_hygiene: { start: 1410, end: 1830 }
};

function buildDefaultScheduleSlots() {
  return DEFAULT_SCHEDULE_SLOTS.map(slot => ({
    ...slot,
    ...(SCHEDULE_SLOT_TIMES[slot.id] || {})
  }));
}

let scheduleSlots = buildDefaultScheduleSlots();

const AWARENESS_NAMES = {
  1: '先知先覺',
  2: '當知當覺',
  3: '後知後覺',
  4: '不知不覺'
};

let state = {
  currentDate: getTodayDateString(),
  data: {}, // Keyed by YYYY-MM-DD
  goals: {
    trading: 2.0, // in hours
    mind: 1.0,    // in hours
    learn: 1.5,   // in hours
    social: 1.0   // limit in hours
  },
  sync: {
    token: '',
    username: '',
    repo: '',
    filepath: 'data.json'
  },
  activeTimer: null,
  timerInterval: null,
  lastTickTime: null,
  currentChartMode: 'time', // 'time' or 'emotion'
  selectedEmotion: 3,
  selectedAwareness: 2
};

const POMODORO_CONFIG = {
  workSeconds: 25 * 60,
  breakSeconds: 5 * 60
};

let pomodoroState = {
  mode: 'work',
  remainingSeconds: POMODORO_CONFIG.workSeconds,
  isRunning: false,
  lastTickAt: null,
  intervalId: null
};

// --- 2. Helper Functions ---
function getTodayDateString() {
  const d = new Date();
  return formatDateString(d);
}

function formatDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getEmotionMeta(level) {
  const map = {
    1: { label: '🔴 焦躁失控', color: '#ff0000' },
    2: { label: '🟠 波動FOMO', color: '#ff4b4b' },
    3: { label: '🟡 平穩一般', color: '#ffa500' },
    4: { label: '🟢 理性專注', color: '#00e676' },
    5: { label: '🔵 超然心流', color: '#00e5ff' }
  };
  return map[level] || map[3];
}

function hasMeaningfulDayActivity(dayData) {
  if (!dayData) return false;
  const timerTotal = Object.values(dayData.timers || {}).reduce((a, b) => a + (b || 0), 0);
  const counterTotal = Object.values(dayData.counters || {}).reduce((a, b) => a + (b || 0), 0);
  const journal = dayData.journal || {};
  const hasJournalText = Boolean((journal.setup || '').trim() || (journal.execution || '').trim() || (journal.review || '').trim() || (journal.nextAction || '').trim());
  return timerTotal > 0 || counterTotal > 0 || hasJournalText;
}

function initEmptyDay(dateStr) {
  return {
    date: dateStr,
    timers: {
      social_media: 0,
      trading_static_training: 0,
      trading_live_training: 0,
      real_live_trading: 0,
      trading_study: 0,
      review: 0,
      spiritual_growth: 0,
      exercise: 0,
      other_study: 0
    },
    counters: {
      parent_study: 0,
      parent_play: 0,
      trading_static_cnt: 0,
      trading_live_cnt: 0
    },
    journal: {
      emotion: 3, // Default 3 (Orange/Neutral)
      awareness: 2, // 1 先知先覺 ~ 4 不知不覺
      setup: '',
      execution: '',
      review: '',
      nextAction: ''
    },
    schedule: {},
    pretrade: { passes: 0 },
    water: 0,
    todos: []
  };
}

// --- 3. LocalStorage & State Management ---
function loadLocalData() {
  // Load goals
  const savedGoals = localStorage.getItem('focus_tracker_goals');
  if (savedGoals) {
    try { 
      state.goals = JSON.parse(savedGoals); 
      // Migrate old combined goals
      if (state.goals.mind !== undefined) {
        state.goals.spiritual_growth = state.goals.mind / 2;
        state.goals.exercise = state.goals.mind / 2;
        delete state.goals.mind;
      }
      // Fill missing defaults for progress bars
      if (state.goals.social_media === undefined) state.goals.social_media = state.goals.social || 1.0;
      if (state.goals.trading_static_training === undefined) state.goals.trading_static_training = 1.0;
      if (state.goals.trading_live_training === undefined) state.goals.trading_live_training = 1.0;
      if (state.goals.real_live_trading === undefined) state.goals.real_live_trading = 2.0;
      if (state.goals.trading_study === undefined) state.goals.trading_study = 0.5;
      if (state.goals.review === undefined) state.goals.review = 0.5;
      if (state.goals.spiritual_growth === undefined) state.goals.spiritual_growth = 0.5;
      if (state.goals.exercise === undefined) state.goals.exercise = 0.5;
      if (state.goals.other_study === undefined) state.goals.other_study = 1.0;
      if (!state.goals.counters) state.goals.counters = {};
      TRACKER_KEYS.counters.forEach(k => {
        if (state.goals.counters[k] === undefined) state.goals.counters[k] = TRACKER_META.counters[k].defaultGoal;
      });
    } catch (e) { console.error(e); }
  } else {
    // Set default initial goals
    state.goals = {
      trading: 2.0,
      spiritual_growth: 0.5,
      exercise: 0.5,
      learn: 1.5,
      social: 1.0,
      social_media: 1.0,
      trading_static_training: 1.0,
      trading_live_training: 1.0,
      real_live_trading: 2.0,
      trading_study: 0.5,
      review: 0.5,
      other_study: 1.0,
      counters: {
        parent_study: 1,
        parent_play: 1,
        trading_static_cnt: 5,
        trading_live_cnt: 3
      }
    };
  }

  // Load sync settings
  const savedSync = localStorage.getItem('focus_tracker_sync');
  if (savedSync) {
    try { state.sync = JSON.parse(savedSync); } catch (e) { console.error(e); }
  }

  const savedScheduleSlots = localStorage.getItem('focus_tracker_schedule_slots');
  if (savedScheduleSlots) {
    try {
      const parsed = JSON.parse(savedScheduleSlots);
      if (Array.isArray(parsed) && parsed.length > 0) {
        scheduleSlots = parsed;
      }
    } catch (e) {
      console.error('Failed to parse schedule slots', e);
      scheduleSlots = buildDefaultScheduleSlots();
    }
  }

  // Load tracker data
  const savedData = localStorage.getItem('focus_tracker_data');
  if (savedData) {
    try {
      state.data = JSON.parse(savedData);
    } catch (e) {
      console.error('Failed to parse tracker data', e);
      state.data = {};
    }
  }

  // Ensure current date exists
  ensureDateExists(state.currentDate);
}

function ensureDateExists(dateStr) {
  if (!state.data[dateStr]) {
    state.data[dateStr] = initEmptyDay(dateStr);
  } else {
    // Fill in any missing properties (e.g. from older formats)
    const empty = initEmptyDay(dateStr);
    if (!state.data[dateStr].timers) state.data[dateStr].timers = empty.timers;
    if (!state.data[dateStr].counters) state.data[dateStr].counters = empty.counters;
    if (!state.data[dateStr].journal) state.data[dateStr].journal = empty.journal;
    if (!state.data[dateStr].schedule) state.data[dateStr].schedule = empty.schedule;
    if (!state.data[dateStr].pretrade) state.data[dateStr].pretrade = { passes: 0 };
    if (state.data[dateStr].water === undefined) state.data[dateStr].water = 0;
    if (!Array.isArray(state.data[dateStr].todos)) state.data[dateStr].todos = [];
    
    // Ensure all individual timers/counters exist
    TRACKER_KEYS.timers.forEach(k => {
      if (state.data[dateStr].timers[k] === undefined) state.data[dateStr].timers[k] = 0;
    });
    TRACKER_KEYS.counters.forEach(k => {
      if (state.data[dateStr].counters[k] === undefined) state.data[dateStr].counters[k] = 0;
    });
  }
}

function saveLocalData() {
  localStorage.setItem('focus_tracker_data', JSON.stringify(state.data));
  localStorage.setItem('focus_tracker_goals', JSON.stringify(state.goals));
  localStorage.setItem('focus_tracker_sync', JSON.stringify(state.sync));
  localStorage.setItem('focus_tracker_schedule_slots', JSON.stringify(scheduleSlots));
}

function getTimerGoalHours(key) {
  return state.goals[key] || TRACKER_META.timers[key].defaultGoal;
}

function getCounterGoal(key) {
  return (state.goals.counters && state.goals.counters[key] !== undefined)
    ? state.goals.counters[key]
    : TRACKER_META.counters[key].defaultGoal;
}

function getDashboardTimeGroups(dayData) {
  const timers = dayData.timers || {};
  const tradingSecs = (timers.trading_static_training || 0) +
                      (timers.trading_live_training || 0) +
                      (timers.real_live_trading || 0) +
                      (timers.trading_study || 0) +
                      (timers.review || 0);
  const tradingGoalHours = (state.goals.trading_static_training || 1.0) +
                           (state.goals.trading_live_training || 1.0) +
                           (state.goals.real_live_trading || 2.0) +
                           (state.goals.trading_study || 0.5) +
                           (state.goals.review || 0.5);

  return [
    {
      key: 'all_trading',
      label: 'All Trading',
      seconds: tradingSecs,
      goalHours: tradingGoalHours,
      color: '#00e5ff',
      note: '死圖 + 生圖 + 實盤 + 學習 + 覆盤'
    },
    {
      key: 'spiritual_growth',
      label: '靈命成長',
      seconds: timers.spiritual_growth || 0,
      goalHours: state.goals.spiritual_growth || 0.5,
      color: '#8b5cf6',
      note: '靈修 / 靜心 / 禱告'
    },
    {
      key: 'exercise',
      label: '體能運動',
      seconds: timers.exercise || 0,
      goalHours: state.goals.exercise || 0.5,
      color: '#ec4899',
      note: '健身 / 運動'
    },
    {
      key: 'other_study',
      label: '跨領域學習',
      seconds: timers.other_study || 0,
      goalHours: state.goals.other_study || 1.0,
      color: '#f43f5e',
      note: '非交易學習'
    },
    {
      key: 'social_media',
      label: '社群娛樂限制',
      seconds: timers.social_media || 0,
      goalHours: state.goals.social_media || state.goals.social || 1.0,
      color: '#ff4b4b',
      note: '限制項：越少越好',
      isLimit: true
    }
  ];
}

// --- 4. Timer Logic (Exclusive Mode) ---
function toggleTimer(key) {
  const card = document.getElementById(`card-${key}`);
  
  if (state.activeTimer === key) {
    // Stop currently running timer
    stopActiveTimer();
  } else {
    // If another timer is running, stop it first
    if (state.activeTimer) {
      stopActiveTimer();
    }
    // Start new timer
    startTimer(key);
  }
  updateUI();
}

function startTimer(key) {
  ensureDateExists(state.currentDate);
  state.activeTimer = key;
  state.lastTickTime = Date.now();
  if (TRADING_TIMER_KEYS.includes(key)) {
    tradingSessionStartTime = Date.now();
    tradingPomodoroAlerted = false;
  } else {
    tradingSessionStartTime = null;
    tradingPomodoroAlerted = false;
  }
  
  // Set card visual state immediately
  const card = document.getElementById(`card-${key}`);
  if (card) card.classList.add('running');
  
  state.timerInterval = setInterval(() => {
    tickTimer();
  }, 100); // Tick frequently for sub-second visual fluidity
}

function stopActiveTimer() {
  if (!state.activeTimer) return;
  
  // Save final tick
  tickTimer();
  
  const card = document.getElementById(`card-${state.activeTimer}`);
  if (card) {
    card.classList.remove('running');
    card.classList.remove('overtime');
  }
  overtimeAlertedFor = null;
  tradingSessionStartTime = null;
  tradingPomodoroAlerted = false;
  
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.activeTimer = null;
  state.lastTickTime = null;
  
  saveLocalData();
}

function tickTimer() {
  if (!state.activeTimer) return;

  const today = getTodayDateString();
  if (today !== state.currentDate) {
    state.currentDate = today;
    ensureDateExists(state.currentDate);
    loadJournalForm();
  }
  
  const now = Date.now();
  const elapsedSeconds = (now - state.lastTickTime) / 1000;
  state.lastTickTime = now;
  
  // Increment active timer
  ensureDateExists(state.currentDate);
  state.data[state.currentDate].timers[state.activeTimer] += elapsedSeconds;
  
  // Update the DOM for this timer immediately (for speed)
  const timeEl = document.getElementById(`time-${state.activeTimer}`);
  if (timeEl) {
    timeEl.innerText = formatTime(state.data[state.currentDate].timers[state.activeTimer]);
  }

  checkOvertime();
  checkTradingPomodoro();
}

// --- Hyperfocus Overtime Alert ---
let overtimeAlertedFor = null;
let tradingSessionStartTime = null;
let tradingPomodoroAlerted = false;

function playOvertimeBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.4, 0.8].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    });
  } catch (err) {
    // Audio not available; visual alert still applies
  }
}

function checkOvertime() {
  if (!state.activeTimer) return;
  const key = state.activeTimer;
  const goalHours = key === 'social_media'
    ? (state.goals.social_media || state.goals.social || 1.0)
    : getTimerGoalHours(key);
  const elapsed = state.data[state.currentDate].timers[key] || 0;

  if (elapsed <= goalHours * 3600) return;

  const card = document.getElementById(`card-${key}`);
  if (card && !card.classList.contains('overtime')) {
    card.classList.add('overtime');
  }
  if (overtimeAlertedFor !== key) {
    overtimeAlertedFor = key;
    playOvertimeBeep();
  }
}

function checkTradingPomodoro() {
  if (!state.activeTimer || !TRADING_TIMER_KEYS.includes(state.activeTimer) || !tradingSessionStartTime) return;
  if (tradingPomodoroAlerted) return;

  const elapsedMs = Date.now() - tradingSessionStartTime;
  if (elapsedMs < 25 * 60 * 1000) return;

  tradingPomodoroAlerted = true;
  playOvertimeBeep();
  window.alert('Trading activity 已連續 25 分鐘。請休息 5 分鐘：離開圖表、飲水、望遠處。');
}

function renderWaterCupIcon(isDrunk) {
  if (isDrunk) {
    return `<svg class="water-cup-svg water-cup-svg--empty" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M7 3h10v2H7V3zm1.5 4h7l-1.2 13.5H9.7L8.5 7z"/>
      <path fill="currentColor" opacity="0.12" d="M9.5 9h5v10h-5z"/>
      <path fill="currentColor" d="M6.5 21h11v2h-11z"/>
    </svg>`;
  }
  return `<svg class="water-cup-svg water-cup-svg--full" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M7 3h10v2H7V3zm1.5 4h7l-1.2 13.5H9.7L8.5 7z"/>
    <path fill="currentColor" opacity="0.35" d="M9.5 8.5h5v11.5h-5z"/>
    <path fill="currentColor" d="M6.5 21h11v2h-11z"/>
  </svg>`;
}

function renderWaterTracker() {
  const container = document.getElementById('water-cups');
  const text = document.getElementById('water-progress-text');
  if (!container || !text) return;

  ensureDateExists(state.currentDate);
  const water = Math.max(0, Math.min(8, state.data[state.currentDate].water || 0));
  text.innerText = `${water}/8 杯`;
  container.innerHTML = Array.from({ length: 8 }, (_, i) => {
    const cupNumber = i + 1;
    const isDrunk = cupNumber <= water;
    return `
      <button type="button" class="water-cup ${isDrunk ? 'drunk' : ''}" data-cup="${cupNumber}" title="第 ${cupNumber} 杯">
        ${renderWaterCupIcon(isDrunk)}
      </button>
    `;
  }).join('');
}

function setWaterCount(cupNumber) {
  ensureDateExists(state.currentDate);
  const current = state.data[state.currentDate].water || 0;
  state.data[state.currentDate].water = cupNumber === current ? Math.max(0, cupNumber - 1) : cupNumber;
  saveLocalData();
  renderWaterTracker();
}

function adjustManualMinutes(key, minutesDelta) {
  const parsedMinutes = Number(minutesDelta);
  if (!Number.isFinite(parsedMinutes) || parsedMinutes === 0) return;

  ensureDateExists(state.currentDate);
  if (state.activeTimer === key) tickTimer();

  const current = state.data[state.currentDate].timers[key] || 0;
  const next = Math.max(0, current + (parsedMinutes * 60));
  state.data[state.currentDate].timers[key] = next;
  saveLocalData();
  updateUI();
}

function setManualMinutesTotal(key, totalMinutes) {
  const parsedMinutes = Number(totalMinutes);
  if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) return;

  ensureDateExists(state.currentDate);
  if (state.activeTimer === key) tickTimer();

  state.data[state.currentDate].timers[key] = parsedMinutes * 60;
  saveLocalData();
  updateUI();
}

function loadPomodoroState() {
  const raw = localStorage.getItem('focus_tracker_pomodoro');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const mode = parsed.mode === 'break' ? 'break' : 'work';
    const defaultSeconds = mode === 'work' ? POMODORO_CONFIG.workSeconds : POMODORO_CONFIG.breakSeconds;
    const remaining = Number(parsed.remainingSeconds);
    pomodoroState.mode = mode;
    pomodoroState.remainingSeconds = Number.isFinite(remaining) ? Math.max(0, Math.floor(remaining)) : defaultSeconds;
    pomodoroState.isRunning = false;
    pomodoroState.lastTickAt = null;
    pomodoroState.intervalId = null;
  } catch (err) {
    // Ignore corrupted pomodoro cache and fallback to defaults.
  }
}

function savePomodoroState() {
  const snapshot = {
    mode: pomodoroState.mode,
    remainingSeconds: Math.max(0, Math.floor(pomodoroState.remainingSeconds))
  };
  localStorage.setItem('focus_tracker_pomodoro', JSON.stringify(snapshot));
}

function formatPomodoroTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updatePomodoroUI() {
  const timeEl = document.getElementById('pomodoro-time');
  const modeEl = document.getElementById('pomodoro-mode-label');
  const toggleEl = document.getElementById('pomodoro-toggle-btn');
  const barEl = document.getElementById('pomodoro-bar');
  const ringEl = document.getElementById('pomodoro-ring-progress');
  const progressTextEl = document.getElementById('pomodoro-progress-text');
  if (!timeEl || !modeEl || !toggleEl) return;

  const totalSeconds = pomodoroState.mode === 'work' ? POMODORO_CONFIG.workSeconds : POMODORO_CONFIG.breakSeconds;
  const remaining = Math.max(0, pomodoroState.remainingSeconds);
  const pctLeft = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const circumference = 2 * Math.PI * 52; // r=52

  timeEl.innerText = formatPomodoroTime(remaining);
  modeEl.innerText = pomodoroState.mode === 'work' ? '專注 25 分鐘' : '休息 5 分鐘';
  toggleEl.innerText = pomodoroState.isRunning ? '暫停' : '開始';

  if (barEl) {
    barEl.setAttribute('data-mode', pomodoroState.mode);
    barEl.classList.toggle('is-running', Boolean(pomodoroState.isRunning));
  }
  if (ringEl) {
    ringEl.style.strokeDasharray = String(circumference);
    ringEl.style.strokeDashoffset = String(circumference * (1 - pctLeft));
  }
  if (progressTextEl) {
    progressTextEl.innerText = `剩餘 ${Math.round(pctLeft * 100)}% · ${formatPomodoroTime(remaining)}`;
  }
}

function setPomodoroMode(mode, shouldReset = true) {
  pomodoroState.mode = mode === 'break' ? 'break' : 'work';
  if (shouldReset) {
    pomodoroState.remainingSeconds = pomodoroState.mode === 'work' ? POMODORO_CONFIG.workSeconds : POMODORO_CONFIG.breakSeconds;
  }
  pomodoroState.lastTickAt = Date.now();
  savePomodoroState();
  updatePomodoroUI();
}

function stopPomodoroInterval() {
  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }
}

function tickPomodoro() {
  if (!pomodoroState.isRunning) return;
  const now = Date.now();
  const last = pomodoroState.lastTickAt || now;
  const elapsed = Math.max(0, Math.floor((now - last) / 1000));
  if (elapsed <= 0) return;

  pomodoroState.remainingSeconds = Math.max(0, pomodoroState.remainingSeconds - elapsed);
  pomodoroState.lastTickAt = now;

  if (pomodoroState.remainingSeconds === 0) {
    playOvertimeBeep();
    const nextMode = pomodoroState.mode === 'work' ? 'break' : 'work';
    const modeText = nextMode === 'work' ? '專注' : '休息';
    setPomodoroMode(nextMode, true);
    window.alert(`蕃茄時鐘完成，現在切換到 ${modeText} 時段。`);
  }

  savePomodoroState();
  updatePomodoroUI();
}

function togglePomodoro() {
  pomodoroState.isRunning = !pomodoroState.isRunning;
  pomodoroState.lastTickAt = Date.now();
  if (pomodoroState.isRunning && !pomodoroState.intervalId) {
    pomodoroState.intervalId = setInterval(tickPomodoro, 1000);
  } else if (!pomodoroState.isRunning) {
    stopPomodoroInterval();
  }
  updatePomodoroUI();
}

function resetPomodoro() {
  setPomodoroMode(pomodoroState.mode, true);
  pomodoroState.isRunning = false;
  stopPomodoroInterval();
  updatePomodoroUI();
}

// --- 5. Counter Logic ---
function changeCounter(key, delta) {
  ensureDateExists(state.currentDate);
  let val = state.data[state.currentDate].counters[key] || 0;
  val += delta;
  if (val < 0) val = 0; // Prevent negative counts
  
  state.data[state.currentDate].counters[key] = val;
  saveLocalData();
  updateUI();
}

// --- 6. SVG Drawing Utilities ---

// Dynamic SVG Activity Rings
function updateActivityRings() {
  const dayData = state.data[state.currentDate];
  if (!dayData) return;

  // 1. Trading Ring (Emerald-Cyan, C=597)
  const tradingSecs = (dayData.timers.trading_static_training || 0) + 
                       (dayData.timers.trading_live_training || 0) + 
                       (dayData.timers.real_live_trading || 0) + 
                       (dayData.timers.review || 0);
  const tradingGoalSecs = state.goals.trading * 3600;
  const tradingPct = Math.min(1, tradingSecs / Math.max(1, tradingGoalSecs));

  // 2. Spiritual Ring (Purple, C=471)
  const spiritSecs = dayData.timers.spiritual_growth || 0;
  const spiritGoalSecs = (state.goals.spiritual_growth || 0.5) * 3600;
  const spiritPct = Math.min(1, spiritSecs / Math.max(1, spiritGoalSecs));

  // 3. Exercise Ring (Pink, C=346)
  const exerciseSecs = dayData.timers.exercise || 0;
  const exerciseGoalSecs = (state.goals.exercise || 0.5) * 3600;
  const exercisePct = Math.min(1, exerciseSecs / Math.max(1, exerciseGoalSecs));

  // 4. Learning Ring (Blue, C=220)
  const learnSecs = (dayData.timers.trading_study || 0) + (dayData.timers.other_study || 0);
  const learnGoalSecs = state.goals.learn * 3600;
  const learnPct = Math.min(1, learnSecs / Math.max(1, learnGoalSecs));

  // Circle stroke-dasharray properties
  setRingProgress('ring-active-trade', 597, tradingPct);
  setRingProgress('ring-active-spirit', 471, spiritPct);
  setRingProgress('ring-active-exercise', 346, exercisePct);
  setRingProgress('ring-active-learn', 220, learnPct);

  // Update text label percentages (defensively)
  const elTrade = document.getElementById('ring-val-trade');
  const elSpirit = document.getElementById('ring-val-spirit');
  const elExercise = document.getElementById('ring-val-exercise');
  const elLearn = document.getElementById('ring-val-learn');
  const elMind = document.getElementById('ring-val-mind'); // fallback for old cache

  if (elTrade) elTrade.innerText = `${Math.round(tradingPct * 100)}%`;
  if (elSpirit) elSpirit.innerText = `${Math.round(spiritPct * 100)}%`;
  if (elExercise) elExercise.innerText = `${Math.round(exercisePct * 100)}%`;
  if (elLearn) elLearn.innerText = `${Math.round(learnPct * 100)}%`;
  if (elMind) elMind.innerText = `${Math.round(((spiritPct + exercisePct) / 2) * 100)}%`;

  // Update Dashboard Panel mini-stats
  const totalFocusSecs = tradingSecs + spiritSecs + exerciseSecs + learnSecs;
  const elFocus = document.getElementById('stat-focus-hours');
  if (elFocus) elFocus.innerHTML = `${(totalFocusSecs / 3600).toFixed(1)} <span class="stat-unit">小時</span>`;
  
  // Parental counts
  const parentCount = (dayData.counters.parent_study || 0) + (dayData.counters.parent_play || 0);
  const elParent = document.getElementById('stat-parent-count');
  if (elParent) elParent.innerHTML = `${parentCount} <span class="stat-unit">次</span>`;

  // Social Control Score (starts at 100, drops if exceed goal)
  const socialSecs = dayData.timers.social_media || 0;
  const socialLimitSecs = (state.goals.social_media || state.goals.social || 1.0) * 3600;
  let socialScore = 100;
  if (socialSecs > socialLimitSecs) {
    const excessPct = (socialSecs - socialLimitSecs) / socialLimitSecs;
    socialScore = Math.max(0, Math.round(100 - (excessPct * 100)));
  }
  const elSocial = document.getElementById('stat-social-score');
  if (elSocial) elSocial.innerHTML = `${socialScore} <span class="stat-unit">分</span>`;

  // Streaks (練槍: 死圖 + 生圖 >= 20)
  const streakEl = document.getElementById('stat-streak-days');
  if (streakEl) streakEl.innerHTML = `${calculateStreak()} <span class="stat-unit">天</span>`;
  const streakNoteEl = document.getElementById('stat-streak-note');
  if (streakNoteEl) {
    const todayPass = isChartPracticePass(dayData);
    const todayCount = getChartPracticeCount(dayData);
    streakNoteEl.innerText = todayPass
      ? `今日練槍 PASS（${todayCount}/20）`
      : `今日練槍 FAILED（${todayCount}/20）`;
    streakNoteEl.style.color = todayPass ? '#00e676' : '#ff4b4b';
  }
  updateWeeklyEmotionIndicator();
}

function setRingProgress(elementId, circumference, percent) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const offset = circumference - (percent * circumference);
  el.style.strokeDashoffset = offset;
}

function updateDashboardGoalSummary() {
  const barsContainer = document.getElementById('dashboard-goal-bars');
  const pieContainer = document.getElementById('time-pie-chart');
  if (!barsContainer || !pieContainer) return;

  ensureDateExists(state.currentDate);
  const dayData = state.data[state.currentDate];
  const groups = getDashboardTimeGroups(dayData);

  barsContainer.innerHTML = groups.map(group => {
    const currentHours = group.seconds / 3600;
    const pctRaw = group.goalHours > 0 ? (currentHours / group.goalHours) * 100 : 0;
    const pct = Math.min(100, Math.round(pctRaw));
    const statusText = group.isLimit && pctRaw > 100 ? '超出限制' : `${Math.round(pctRaw)}%`;
    return `
      <div class="dashboard-goal-row">
        <div class="dashboard-goal-row-head">
          <div>
            <span class="dashboard-goal-name">${group.label}</span>
            <span class="dashboard-goal-note">${group.note}</span>
          </div>
          <span class="dashboard-goal-value">${currentHours.toFixed(1)}h / ${group.goalHours.toFixed(1)}h · ${statusText}</span>
        </div>
        <div class="dashboard-goal-track">
          <div class="dashboard-goal-fill ${group.isLimit && pctRaw > 100 ? 'over-limit' : ''}" style="width: ${pct}%; background: ${group.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  const totalSeconds = groups.reduce((sum, group) => sum + group.seconds, 0);
  if (totalSeconds <= 0) {
    pieContainer.innerHTML = `
      <div class="pie-empty-state">今日暫時未有時間記錄</div>
    `;
    return;
  }

  let offset = 0;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const segments = groups
    .filter(group => group.seconds > 0)
    .map(group => {
      const dash = (group.seconds / totalSeconds) * circumference;
      const segment = `<circle cx="90" cy="90" r="${radius}" fill="none" stroke="${group.color}" stroke-width="28" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)" />`;
      offset += dash;
      return segment;
    }).join('');

  const legend = groups
    .filter(group => group.seconds > 0)
    .map(group => {
      const pct = Math.round((group.seconds / totalSeconds) * 100);
      return `
        <div class="pie-legend-item">
          <span class="pie-dot" style="background: ${group.color};"></span>
          <span>${group.label}</span>
          <strong>${pct}%</strong>
        </div>
      `;
    }).join('');

  pieContainer.innerHTML = `
    <div class="pie-chart-grid">
      <svg viewBox="0 0 180 180" class="time-pie-svg">
        <circle cx="90" cy="90" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="28" />
        ${segments}
        <circle cx="90" cy="90" r="48" fill="rgba(15,15,21,0.95)" />
        <text x="90" y="86" text-anchor="middle" class="pie-total-main">${(totalSeconds / 3600).toFixed(1)}h</text>
        <text x="90" y="106" text-anchor="middle" class="pie-total-sub">Total</text>
      </svg>
      <div class="pie-legend">${legend}</div>
    </div>
  `;
}

function updateWeeklyEmotionIndicator() {
  const valEl = document.getElementById('stat-weekly-emotion');
  const noteEl = document.getElementById('stat-weekly-emotion-note');
  const cardEl = document.getElementById('stat-weekly-emotion-card');
  if (!valEl || !noteEl || !cardEl) return;

  const levels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDateString(d);
    const dayData = state.data[dateStr];
    if (!hasMeaningfulDayActivity(dayData)) continue;
    const level = (dayData && dayData.journal && dayData.journal.emotion) || 3;
    levels.push(level);
  }

  if (levels.length === 0) {
    valEl.innerText = '-';
    noteEl.innerText = '尚未有足夠記錄';
    noteEl.style.color = 'var(--text-secondary)';
    cardEl.style.boxShadow = 'none';
    cardEl.style.borderColor = 'rgba(79, 70, 229, 0.22)';
    return;
  }

  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  const rounded = Math.max(1, Math.min(5, Math.round(avg)));
  const meta = getEmotionMeta(rounded);

  valEl.innerText = `${meta.label} (${avg.toFixed(1)})`;
  noteEl.innerText = `近 7 日有效記錄: ${levels.length} 天`;
  noteEl.style.color = meta.color;
  cardEl.style.borderColor = meta.color;
  cardEl.style.boxShadow = `0 0 18px ${meta.color}33`;
}

const CHART_PRACTICE_PASS_COUNT = 20;

function getChartPracticeCount(dayData) {
  if (!dayData || !dayData.counters) return 0;
  return (dayData.counters.trading_static_cnt || 0) + (dayData.counters.trading_live_cnt || 0);
}

function isChartPracticePass(dayData) {
  return getChartPracticeCount(dayData) >= CHART_PRACTICE_PASS_COUNT;
}

// Calculate streaks of 練槍 pass days (死圖 + 生圖 >= 20)
function calculateStreak() {
  let streak = 0;
  let checkDate = new Date();
  const todayStr = getTodayDateString();

  // If today not yet pass, start counting from yesterday
  if (!state.data[todayStr] || !isChartPracticePass(state.data[todayStr])) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const checkDateStr = formatDateString(checkDate);
    const dayData = state.data[checkDateStr];
    if (!dayData || !isChartPracticePass(dayData)) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function getMinutesSinceMidnight(date = new Date()) {
  return (date.getHours() * 60) + date.getMinutes();
}

function upsertAutoTodo(dayData, id, text, shouldExist) {
  if (!Array.isArray(dayData.todos)) dayData.todos = [];
  const existing = dayData.todos.find(t => t.id === id);

  if (shouldExist) {
    if (!existing) {
      dayData.todos.push({
        id,
        text,
        source: 'auto',
        done: false,
        createdAt: Date.now()
      });
    } else if (existing.done) {
      // Keep manually completed items completed even if still failing
    } else {
      existing.text = text;
    }
  } else if (existing && existing.source === 'auto') {
    // Goal caught up: auto-complete
    existing.done = true;
  }
}

function syncTodosFromCheckpoints() {
  ensureDateExists(state.currentDate);
  const dayData = state.data[state.currentDate];
  const nowMins = getMinutesSinceMidnight();
  const water = dayData.water || 0;
  let changed = false;
  const before = JSON.stringify(dayData.todos || []);

  // Water checkpoints
  const waterChecks = [
    { id: 'water_1200', mins: 12 * 60, cups: 2, text: '12:00 飲水未達 2 杯（補水）' },
    { id: 'water_1600', mins: 16 * 60, cups: 4, text: '16:00 飲水未達 4 杯（補水）' },
    { id: 'water_1900', mins: 19 * 60, cups: 6, text: '19:00 飲水未達 6 杯（補水）' }
  ];
  waterChecks.forEach(check => {
    const failed = nowMins >= check.mins && water < check.cups;
    upsertAutoTodo(dayData, check.id, check.text, failed);
  });

  // Habit checkpoints at 16:00
  const spiritGoalSecs = (state.goals.spiritual_growth || 0.5) * 3600;
  const exerciseGoalSecs = (state.goals.exercise || 0.5) * 3600;
  const spiritFailed = nowMins >= (16 * 60) && (dayData.timers.spiritual_growth || 0) < spiritGoalSecs;
  const exerciseFailed = nowMins >= (16 * 60) && (dayData.timers.exercise || 0) < exerciseGoalSecs;
  upsertAutoTodo(dayData, 'spirit_1600', '16:00 靈命成長未達標（補做）', spiritFailed);
  upsertAutoTodo(dayData, 'exercise_1600', '16:00 體能運動健身未達標（補做）', exerciseFailed);

  const after = JSON.stringify(dayData.todos || []);
  changed = before !== after;
  if (changed) saveLocalData();
  renderTodoList();
}

function renderTodoList() {
  const listEl = document.getElementById('todo-list');
  const countEl = document.getElementById('todo-count');
  if (!listEl) return;

  ensureDateExists(state.currentDate);
  const todos = state.data[state.currentDate].todos || [];
  const openCount = todos.filter(t => !t.done).length;
  if (countEl) countEl.innerText = `${openCount} 項待辦`;

  if (todos.length === 0) {
    listEl.innerHTML = `<li class="todo-empty">暫時冇 To-do，繼續保持。</li>`;
    return;
  }

  const sorted = [...todos].sort((a, b) => Number(a.done) - Number(b.done) || (a.createdAt || 0) - (b.createdAt || 0));
  listEl.innerHTML = sorted.map(todo => `
    <li class="todo-item ${todo.done ? 'done' : ''}">
      <input type="checkbox" class="todo-check" data-todo-id="${todo.id}" ${todo.done ? 'checked' : ''}>
      <span class="todo-text">${todo.text}</span>
    </li>
  `).join('');
}

function toggleTodoDone(todoId) {
  ensureDateExists(state.currentDate);
  const todos = state.data[state.currentDate].todos || [];
  const target = todos.find(t => t.id === todoId);
  if (!target) return;
  target.done = !target.done;
  saveLocalData();
  renderTodoList();
}

// Weekly Mini Rings Wall Generator
function renderWeeklyRings() {
  const container = document.getElementById('weekly-rings-row-el');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  
  // Get Mon-Sun of current week
  const startOfWeek = new Date(today);
  // Adjust to Monday
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const daysLabel = ['一', '二', '三', '四', '五', '六', '日'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDateString(d);
    ensureDateExists(dateStr);
    const dayData = state.data[dateStr];
    
    // Calculate percentages
    const tradingSecs = (dayData.timers.trading_static_training || 0) + 
                         (dayData.timers.trading_live_training || 0) + 
                         (dayData.timers.real_live_trading || 0) + 
                         (dayData.timers.review || 0);
    const tradingPct = Math.min(1, tradingSecs / Math.max(1, state.goals.trading * 3600));

    const spiritSecs = dayData.timers.spiritual_growth || 0;
    const spiritPct = Math.min(1, spiritSecs / Math.max(1, (state.goals.spiritual_growth || 0.5) * 3600));

    const exerciseSecs = dayData.timers.exercise || 0;
    const exercisePct = Math.min(1, exerciseSecs / Math.max(1, (state.goals.exercise || 0.5) * 3600));

    const learnSecs = (dayData.timers.trading_study || 0) + (dayData.timers.other_study || 0);
    const learnPct = Math.min(1, learnSecs / Math.max(1, state.goals.learn * 3600));

    // Circumferences:
    // Ring 1: R=18 -> C=113.1
    // Ring 2: R=14 -> C=88.0
    // Ring 3: R=10 -> C=62.8
    // Ring 4: R=6  -> C=37.7
    const off1 = 113.1 - (tradingPct * 113.1);
    const off2 = 88.0 - (spiritPct * 88.0);
    const off3 = 62.8 - (exercisePct * 62.8);
    const off4 = 37.7 - (learnPct * 37.7);

    const isToday = dateStr === getTodayDateString();

    const box = document.createElement('div');
    box.className = 'weekly-day-ring-box';
    box.innerHTML = `
      <svg viewBox="0 0 48 48" class="mini-rings-svg">
        <circle cx="24" cy="24" r="18" class="mini-ring-bg" stroke="#1e1e2f" stroke-width="3" fill="none" />
        <circle cx="24" cy="24" r="14" class="mini-ring-bg" stroke="#1e1e2f" stroke-width="3" fill="none" />
        <circle cx="24" cy="24" r="10" class="mini-ring-bg" stroke="#1e1e2f" stroke-width="3" fill="none" />
        <circle cx="24" cy="24" r="6" class="mini-ring-bg" stroke="#1e1e2f" stroke-width="3" fill="none" />
        
        <circle cx="24" cy="24" r="18" stroke="#00e676" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="${off1}" transform="rotate(-90 24 24)" />
        <circle cx="24" cy="24" r="14" stroke="#8b5cf6" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="88.0" stroke-dashoffset="${off2}" transform="rotate(-90 24 24)" />
        <circle cx="24" cy="24" r="10" stroke="#ec4899" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="62.8" stroke-dashoffset="${off3}" transform="rotate(-90 24 24)" />
        <circle cx="24" cy="24" r="6" stroke="#2f80ed" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="37.7" stroke-dashoffset="${off4}" transform="rotate(-90 24 24)" />
      </svg>
      <span class="weekly-day-label ${isToday ? 'today' : ''}">${daysLabel[i]}</span>
    `;
    container.appendChild(box);
  }
}

// Render dynamic charts (Vibrant Custom SVG Charts)
function renderWeeklyChart() {
  const container = document.getElementById('chart-container');
  if (!container) return;
  container.innerHTML = '';

  // Get last 7 days keys
  const last7Days = [];
  const daysLabel = [];
  const weekdayShort = ['日', '一', '二', '三', '四', '五', '六'];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(formatDateString(d));
    daysLabel.push(weekdayShort[d.getDay()]);
  }

  if (state.currentChartMode === 'time') {
    // Draw Stacked Bar Chart for focus hours
    renderStackedBarChart(container, last7Days, daysLabel);
  } else {
    // Draw Line Chart for Emotion Levels
    renderEmotionLineChart(container, last7Days, daysLabel);
  }
}

function renderStackedBarChart(container, days, labels) {
  const width = 500;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Process data (convert seconds to hours)
  const barData = days.map(d => {
    ensureDateExists(d);
    const dataObj = state.data[d];
    const tradeHours = ((dataObj.timers.trading_static_training || 0) + 
                        (dataObj.timers.trading_live_training || 0) + 
                        (dataObj.timers.real_live_trading || 0) + 
                        (dataObj.timers.review || 0)) / 3600;
    const spiritHours = (dataObj.timers.spiritual_growth || 0) / 3600;
    const exerciseHours = (dataObj.timers.exercise || 0) / 3600;
    const learnHours = ((dataObj.timers.trading_study || 0) + 
                        (dataObj.timers.other_study || 0)) / 3600;
    return { trade: tradeHours, spirit: spiritHours, exercise: exerciseHours, learn: learnHours };
  });

  // Find max stack height to scale
  let maxVal = 4; // Default baseline at least 4 hours
  barData.forEach(d => {
    const total = d.trade + d.spirit + d.exercise + d.learn;
    if (total > maxVal) maxVal = total;
  });
  maxVal = Math.ceil(maxVal);

  // Generate SVG string
  let svgContent = `
    <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
      <defs>
        <linearGradient id="grad-trade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00e5ff" />
          <stop offset="100%" stop-color="#00e676" />
        </linearGradient>
        <linearGradient id="grad-spirit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a78bfa" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
        <linearGradient id="grad-exercise" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f43f5e" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <linearGradient id="grad-learn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00d2ff" />
          <stop offset="100%" stop-color="#2f80ed" />
        </linearGradient>
      </defs>
  `;

  // Draw Gridlines and Y-axis labels
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal / gridSteps) * i;
    const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
    svgContent += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
      <text x="${padding.left - 10}" y="${y + 4}" fill="#9ca3af" font-size="10" text-anchor="end">${val.toFixed(1)}h</text>
    `;
  }

  // Draw Bars
  const numBars = days.length;
  const barGap = 16;
  const totalGapsWidth = barGap * (numBars - 1);
  const barWidth = (chartWidth - totalGapsWidth) / numBars;

  for (let i = 0; i < numBars; i++) {
    const d = barData[i];
    const x = padding.left + i * (barWidth + barGap);
    
    // Scale heights
    const hTrade = (d.trade / maxVal) * chartHeight;
    const hSpirit = (d.spirit / maxVal) * chartHeight;
    const hExercise = (d.exercise / maxVal) * chartHeight;
    const hLearn = (d.learn / maxVal) * chartHeight;
    
    // Stack coordinates (y starts from top)
    let currentY = padding.top + chartHeight;
    
    // 1. Draw Trading Segment (Bottom segment)
    if (hTrade > 1) {
      currentY -= hTrade;
      svgContent += `<rect x="${x}" y="${currentY}" width="${barWidth}" height="${hTrade}" fill="url(#grad-trade)" rx="4" class="chart-bar" />`;
    }
    
    // 2. Draw Spirit Segment
    if (hSpirit > 1) {
      currentY -= hSpirit;
      svgContent += `<rect x="${x}" y="${currentY}" width="${barWidth}" height="${hSpirit}" fill="url(#grad-spirit)" rx="4" class="chart-bar" />`;
    }

    // 3. Draw Exercise Segment
    if (hExercise > 1) {
      currentY -= hExercise;
      svgContent += `<rect x="${x}" y="${currentY}" width="${barWidth}" height="${hExercise}" fill="url(#grad-exercise)" rx="4" class="chart-bar" />`;
    }
    
    // 4. Draw Learn Segment (Top segment)
    if (hLearn > 1) {
      currentY -= hLearn;
      svgContent += `<rect x="${x}" y="${currentY}" width="${barWidth}" height="${hLearn}" fill="url(#grad-learn)" rx="4" class="chart-bar" />`;
    }

    // Draw Day X-axis labels
    const labelX = x + barWidth / 2;
    const labelY = height - 10;
    svgContent += `<text x="${labelX}" y="${labelY}" class="chart-label-txt">${labels[i]}</text>`;
  }

  // Draw X Axis line
  svgContent += `
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" class="chart-axis-line" />
    </svg>
  `;

  container.innerHTML = svgContent;
}

function renderEmotionLineChart(container, days, labels) {
  const width = 500;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Process data (Get emotion level 1~5)
  const linePoints = days.map((d, index) => {
    ensureDateExists(d);
    const dataObj = state.data[d];
    const emotionVal = dataObj.journal.emotion || 3;
    
    // Calculate coordinate positions
    const numPoints = days.length;
    const x = padding.left + (index / (numPoints - 1)) * chartWidth;
    // Level 5 is top (highest), Level 1 is bottom (lowest)
    const y = padding.top + chartHeight - ((emotionVal - 1) / 4) * chartHeight;
    return { x, y, val: emotionVal };
  });

  const emotionColors = {
    1: '#ff0000', // DarkRed/Red
    2: '#ff4b4b', // Red-Orange
    3: '#ffa500', // Orange/Yellow
    4: '#00e676', // Green
    5: '#00e5ff'  // Blue
  };

  const emotionLabels = ['焦慮失控', '波動FOMO', '平穩一般', '理性專注', '超然心流'];

  // Start SVG string
  let svgContent = `
    <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#4facfe" />
          <stop offset="100%" stop-color="#00f2fe" />
        </linearGradient>
        <filter id="glow-circle" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
  `;

  // Draw horizontal grids for the 5 levels
  for (let i = 0; i < 5; i++) {
    const y = padding.top + chartHeight - (i / 4) * chartHeight;
    svgContent += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
      <text x="${padding.left - 10}" y="${y + 4}" fill="#9ca3af" font-size="10" text-anchor="end">${emotionLabels[i]}</text>
    `;
  }

  // Construct line path points string
  let pathStr = '';
  linePoints.forEach((pt, i) => {
    if (i === 0) pathStr += `M ${pt.x} ${pt.y}`;
    else pathStr += ` L ${pt.x} ${pt.y}`;
  });

  // Draw connecting line
  svgContent += `<path d="${pathStr}" class="chart-line-path" stroke="url(#line-grad)" />`;

  // Draw glowing nodes and date labels
  linePoints.forEach((pt, i) => {
    const color = emotionColors[pt.val];
    svgContent += `
      <circle cx="${pt.x}" cy="${pt.y}" r="5.5" class="chart-dot" fill="${color}" stroke="#0f0f15" filter="url(#glow-circle)" />
      <text x="${pt.x}" y="${height - 10}" class="chart-label-txt">${labels[i]}</text>
    `;
  });

  // Draw bottom X Axis line
  svgContent += `
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" class="chart-axis-line" />
    </svg>
  `;

  container.innerHTML = svgContent;
}

// --- 7. History Timeline & Keyword Search ---
function renderHistory() {
  const container = document.getElementById('history-timeline-container');
  if (!container) return;
  container.innerHTML = '';

  const searchInput = document.getElementById('history-search-input').value.toLowerCase().trim();
  const emotionFilter = document.getElementById('history-emotion-filter').value;

  // Sort dates descending (most recent first)
  const sortedDates = Object.keys(state.data).sort((a, b) => new Date(b) - new Date(a));
  
  let matchesCount = 0;

  sortedDates.forEach(dateStr => {
    const d = state.data[dateStr];
    
    // Filters check
    const matchesSearch = !searchInput || 
      (d.journal.setup && d.journal.setup.toLowerCase().includes(searchInput)) ||
      (d.journal.execution && d.journal.execution.toLowerCase().includes(searchInput)) ||
      (d.journal.review && d.journal.review.toLowerCase().includes(searchInput)) ||
      (d.journal.nextAction && d.journal.nextAction.toLowerCase().includes(searchInput));
      
    const matchesEmotion = !emotionFilter || String(d.journal.emotion) === emotionFilter;

    if (!matchesSearch || !matchesEmotion) return;
    
    matchesCount++;
    
    // Draw Day Card
    const totalFocusSecs = Object.values(d.timers).reduce((a,b) => a+b, 0) - (d.timers.social_media || 0); // focus = all minus social
    const emotionColors = {
      1: '#ff0000',
      2: '#ff4b4b',
      3: '#ffa500',
      4: '#00e676',
      5: '#00e5ff'
    };
    const emotionColor = emotionColors[d.journal.emotion || 3];
    const emotionNames = { 1: '🔴 焦躁失控', 2: '🟠 波動FOMO', 3: '🟡 平穩一般', 4: '🟢 理性專注', 5: '🔵 超然心流' };

    const card = document.createElement('div');
    card.className = `glass-card history-card emo-border-${d.journal.emotion || 3}`;
    card.id = `history-card-${dateStr}`;
    card.innerHTML = `
      <div class="history-card-header" onclick="toggleHistoryCard('${dateStr}')">
        <div class="history-card-header-left">
          <span class="history-emotion-ring" style="color: ${emotionColor}; background: ${emotionColor};"></span>
          <span class="history-date">${dateStr}</span>
        </div>
        <div class="history-card-header-right">
          <span class="history-focus-tag">專注: ${(totalFocusSecs / 3600).toFixed(1)} 小時</span>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" class="history-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      
      <div class="history-card-body">
        <div class="history-details-grid">
          
          <!-- Column 1: Durations & Counts -->
          <div class="history-stats-col">
            <h4 class="history-section-title">今日數據明細</h4>
            <div class="history-stats-list">
              <div class="history-stat-item">
                <span class="h-stat-name">社群娛樂時間</span>
                <span class="h-stat-val" style="color: var(--color-social);">${formatTime(d.timers.social_media || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">歷史圖表訓練 (死圖)</span>
                <span class="h-stat-val">${formatTime(d.timers.trading_static_training || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">實時市場訓練 (生圖)</span>
                <span class="h-stat-val">${formatTime(d.timers.trading_live_training || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">實盤交易記錄</span>
                <span class="h-stat-val">${formatTime(d.timers.real_live_trading || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">交易覆盤總結</span>
                <span class="h-stat-val">${formatTime(d.timers.review || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">靈命成長時間</span>
                <span class="h-stat-val" style="color: var(--color-spirit);">${formatTime(d.timers.spiritual_growth || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">體能運動健身</span>
                <span class="h-stat-val">${formatTime(d.timers.exercise || 0)}</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">親子共讀與遊戲</span>
                <span class="h-stat-val">${(d.counters.parent_study || 0) + (d.counters.parent_play || 0)} 次</span>
              </div>
              <div class="history-stat-item">
                <span class="h-stat-name">圖表分析 (死圖/生圖)</span>
                <span class="h-stat-val">${(d.counters.trading_static_cnt || 0) + (d.counters.trading_live_cnt || 0)} 次</span>
              </div>
            </div>
          </div>
          
          <!-- Column 2: Free Text Journal -->
          <div class="history-journal-col">
            <h4 class="history-section-title">交易心理日記</h4>
            
            <div class="journal-text-block">
              <span class="journal-text-label">心理狀態</span>
              <div class="journal-text-content" style="border-left-color: ${emotionColor}; font-weight: 600;">
                ${emotionNames[d.journal.emotion || 3]}${d.journal.awareness ? ` ｜ 覺察度: ${d.journal.awareness} ${AWARENESS_NAMES[d.journal.awareness] || ''}` : ''}
              </div>
            </div>
            
            <div class="journal-text-block">
              <span class="journal-text-label">1. 設定問題 (Setup)</span>
              <div class="journal-text-content">${d.journal.setup || '<span style="color: var(--text-muted);">無記錄</span>'}</div>
            </div>
            
            <div class="journal-text-block">
              <span class="journal-text-label">2. 執行問題</span>
              <div class="journal-text-content">${d.journal.execution || '<span style="color: var(--text-muted);">無記錄</span>'}</div>
            </div>
            
            <div class="journal-text-block">
              <span class="journal-text-label">3. 覆盤總結</span>
              <div class="journal-text-content">${d.journal.review || '<span style="color: var(--text-muted);">無記錄</span>'}</div>
            </div>
            
            <div class="journal-text-block">
              <span class="journal-text-label">4. 下一步行動</span>
              <div class="journal-text-content" style="border-left-color: #00e676; font-weight: 500;">
                ${d.journal.nextAction || '<span style="color: var(--text-muted);">無記錄</span>'}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  if (matchesCount === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px;">
        找不到任何匹配的歷史日記記錄。
      </div>
    `;
  }
}

// Expandable history card handler
window.toggleHistoryCard = function(dateStr) {
  const card = document.getElementById(`history-card-${dateStr}`);
  if (card) {
    card.classList.toggle('expanded');
  }
};

function calculateScheduleScore(dayData) {
  const slots = scheduleSlots;
  const completed = slots.filter(slot => dayData.schedule && dayData.schedule[slot.id]).length;
  const total = slots.length;
  const totalWeight = slots.reduce((sum, slot) => sum + (slot.weight || 1), 0);
  const completedWeight = slots.reduce((sum, slot) => {
    return sum + ((dayData.schedule && dayData.schedule[slot.id]) ? (slot.weight || 1) : 0);
  }, 0);
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completedWeight,
    totalWeight,
    weightedPercent: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
  };
}

function renderSchedule() {
  const container = document.getElementById('schedule-list');
  const scoreEl = document.getElementById('schedule-score');
  const noteEl = document.getElementById('schedule-score-note');
  if (!container || !scoreEl || !noteEl) return;

  ensureDateExists(state.currentDate);
  const dayData = state.data[state.currentDate];
  const score = calculateScheduleScore(dayData);

  scoreEl.innerText = `${score.weightedPercent}%`;
  noteEl.innerText = `完成 ${score.completed} / ${score.total} 個時段 | 加權 ${score.completedWeight} / ${score.totalWeight} 分`;

  // 7-day rolling average keeps one bad day from feeling like total failure
  const rollingEl = document.getElementById('schedule-rolling-note');
  if (rollingEl) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = formatDateString(d);
      sum += state.data[ds] ? calculateScheduleScore(state.data[ds]).weightedPercent : 0;
    }
    rollingEl.innerText = `7 日滾動平均: ${Math.round(sum / 7)}%（睇趨勢，唔使日日 100%）`;
  }
  container.innerHTML = scheduleSlots.map(slot => {
    const isDone = Boolean(dayData.schedule && dayData.schedule[slot.id]);
    return `
      <div class="schedule-slot ${isDone ? 'done' : ''}" data-status="${slot.status}">
        <div class="schedule-slot-info">
          <span class="schedule-time">${slot.time}${slot.hkt ? ` (${slot.hkt})` : ''}</span>
          <span class="schedule-title">${slot.title}</span>
          <span class="schedule-metric">${slot.metric}</span>
          <span class="schedule-weight">權重 ${slot.weight || 1} 分</span>
        </div>
        <button type="button" class="schedule-switch ${isDone ? 'on' : ''}" data-slot="${slot.id}" aria-pressed="${isDone}">
          <span class="switch-knob"></span>
        </button>
      </div>
    `;
  }).join('');
}

function minutesToTimeParts(totalMinutes) {
  const normalized = Math.max(0, parseInt(totalMinutes, 10) || 0);
  const nextDay = normalized >= 1440;
  const mins = nextDay ? normalized - 1440 : normalized;
  const hour = Math.min(23, Math.floor(mins / 60));
  const minute = (mins % 60) >= 30 ? 30 : 0;
  return { hour, minute, nextDay };
}

function timePartsToMinutes(hour, minute, nextDay) {
  const h = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
  const m = parseInt(minute, 10) === 30 ? 30 : 0;
  const base = h * 60 + m;
  return nextDay ? base + 1440 : base;
}

function buildHourSelectOptions(selectedHour) {
  return Array.from({ length: 24 }, (_, hour) => {
    const label = String(hour).padStart(2, '0');
    const selected = hour === selectedHour ? 'selected' : '';
    return `<option value="${hour}" ${selected}>${label}</option>`;
  }).join('');
}

function buildMinuteSelectOptions(selectedMinute) {
  return [0, 30].map(minute => {
    const label = String(minute).padStart(2, '0');
    const selected = minute === selectedMinute ? 'selected' : '';
    return `<option value="${minute}" ${selected}>${label}</option>`;
  }).join('');
}

function renderScheduleEditor() {
  const editor = document.getElementById('schedule-editor-list');
  if (!editor) return;

  const escapeAttr = value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const escapeText = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

  editor.innerHTML = scheduleSlots.map(slot => {
    const startParts = minutesToTimeParts(slot.start || 0);
    const endParts = minutesToTimeParts(slot.end || 0);
    return `
    <div class="schedule-editor-row" data-slot="${slot.id}">
      <div class="form-grid schedule-editor-grid">
        <div class="form-group schedule-time-group">
          <label class="form-label">開始時間</label>
          <div class="schedule-time-selects">
            <select class="schedule-edit-start-hour">${buildHourSelectOptions(startParts.hour)}</select>
            <span class="schedule-time-sep">時</span>
            <select class="schedule-edit-start-minute">${buildMinuteSelectOptions(startParts.minute)}</select>
            <span class="schedule-time-sep">分</span>
            <label class="schedule-nextday-label">
              <input type="checkbox" class="schedule-edit-start-nextday" ${startParts.nextDay ? 'checked' : ''}>
              翌日
            </label>
          </div>
        </div>
        <div class="form-group schedule-time-group">
          <label class="form-label">完結時間</label>
          <div class="schedule-time-selects">
            <select class="schedule-edit-end-hour">${buildHourSelectOptions(endParts.hour)}</select>
            <span class="schedule-time-sep">時</span>
            <select class="schedule-edit-end-minute">${buildMinuteSelectOptions(endParts.minute)}</select>
            <span class="schedule-time-sep">分</span>
            <label class="schedule-nextday-label">
              <input type="checkbox" class="schedule-edit-end-nextday" ${endParts.nextDay ? 'checked' : ''}>
              翌日
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">顯示時間</label>
          <input type="text" class="schedule-edit-time" value="${escapeAttr(slot.time)}">
        </div>
        <div class="form-group">
          <label class="form-label">HKT 對照</label>
          <input type="text" class="schedule-edit-hkt" value="${escapeAttr(slot.hkt)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">內容</label>
        <input type="text" class="schedule-edit-title" value="${escapeAttr(slot.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">量化指標 / 交易狀態</label>
        <textarea class="schedule-edit-metric" rows="2">${escapeText(slot.metric)}</textarea>
      </div>
    </div>
  `;
  }).join('');
}

function saveScheduleEditor() {
  const rows = document.querySelectorAll('.schedule-editor-row');
  scheduleSlots = Array.from(rows).map(row => {
    const id = row.getAttribute('data-slot');
    const current = scheduleSlots.find(slot => slot.id === id) || {};
    return {
      ...current,
      start: timePartsToMinutes(
        row.querySelector('.schedule-edit-start-hour').value,
        row.querySelector('.schedule-edit-start-minute').value,
        row.querySelector('.schedule-edit-start-nextday').checked
      ),
      end: timePartsToMinutes(
        row.querySelector('.schedule-edit-end-hour').value,
        row.querySelector('.schedule-edit-end-minute').value,
        row.querySelector('.schedule-edit-end-nextday').checked
      ),
      time: row.querySelector('.schedule-edit-time').value.trim(),
      hkt: row.querySelector('.schedule-edit-hkt').value.trim(),
      title: row.querySelector('.schedule-edit-title').value.trim(),
      metric: row.querySelector('.schedule-edit-metric').value.trim()
    };
  });
  saveLocalData();
  renderSchedule();
  renderScheduleEditor();
  renderNowCard();
}

function toggleScheduleSlot(slotId) {
  ensureDateExists(state.currentDate);
  const schedule = state.data[state.currentDate].schedule;
  schedule[slotId] = !schedule[slotId];
  saveLocalData();
  renderSchedule();
}

// --- Now Card (what should I do right now) ---
function findCurrentSlot() {
  const now = new Date();
  const rawMinutes = now.getHours() * 60 + now.getMinutes();
  const minutes = rawMinutes < 390 ? rawMinutes + 1440 : rawMinutes; // pre-06:30 belongs to overnight slot

  let current = null;
  for (const slot of scheduleSlots) {
    const t = slot;
    if (t.start === undefined || t.end === undefined) continue;
    if (minutes >= t.start && minutes < t.end) {
      current = slot;
      break;
    }
  }

  let next = null;
  let minutesToNext = Infinity;
  for (const slot of scheduleSlots) {
    const t = slot;
    if (t.start === undefined) continue;
    let diff = t.start - minutes;
    if (diff <= 0) diff += 1440;
    if (diff < minutesToNext) {
      minutesToNext = diff;
      next = slot;
    }
  }

  return { current, next, minutesToNext };
}

function renderNowCard() {
  const cardEl = document.getElementById('now-card');
  const timeEl = document.getElementById('now-slot-time');
  const titleEl = document.getElementById('now-slot-title');
  const metricEl = document.getElementById('now-slot-metric');
  const nextEl = document.getElementById('now-next-info');
  if (!cardEl || !timeEl || !titleEl || !metricEl || !nextEl) return;

  const { current, next, minutesToNext } = findCurrentSlot();

  if (current) {
    timeEl.innerText = current.time + (current.hkt ? ` (${current.hkt})` : '');
    titleEl.innerText = current.title;
    metricEl.innerText = current.metric;
    cardEl.setAttribute('data-status', current.status);
  } else {
    timeEl.innerText = '自由時段';
    titleEl.innerText = '冇排程任務，休息或補漏';
    metricEl.innerText = '';
    cardEl.setAttribute('data-status', 'free');
  }

  if (next && Number.isFinite(minutesToNext)) {
    const hrs = Math.floor(minutesToNext / 60);
    const mins = minutesToNext % 60;
    const eta = hrs > 0 ? `${hrs} 小時 ${mins} 分鐘後` : `${mins} 分鐘後`;
    nextEl.innerText = `${eta} → ${next.title}（${next.time}）`;
  } else {
    nextEl.innerText = '--';
  }
}

// --- Pre-trade Checklist ---
function renderPretradeChecklist() {
  const list = document.getElementById('pretrade-list');
  const statusEl = document.getElementById('pretrade-status');
  const passBtn = document.getElementById('btn-pretrade-pass');
  const countEl = document.getElementById('pretrade-pass-count');
  if (!list || !statusEl || !passBtn) return;

  list.innerHTML = PRETRADE_CHECKLIST.map(item => {
    const checked = Boolean(pretradeChecks[item.id]);
    return `
      <button type="button" class="pretrade-item ${checked ? 'checked' : ''}" data-check="${item.id}">
        <span class="pretrade-box">${checked ? '✓' : ''}</span>
        <span class="pretrade-item-meta">
          <span class="pretrade-item-label">${item.label}</span>
          <span class="pretrade-item-desc">${item.desc}</span>
        </span>
      </button>
    `;
  }).join('');

  const done = PRETRADE_CHECKLIST.filter(item => pretradeChecks[item.id]).length;
  statusEl.innerText = `${done}/${PRETRADE_CHECKLIST.length}`;
  passBtn.disabled = done < PRETRADE_REQUIRED_COUNT;
  passBtn.innerText = done >= PRETRADE_REQUIRED_COUNT
    ? '4/7 已達標，可以落單'
    : `至少 ${PRETRADE_REQUIRED_COUNT}/7 先可以落單`;

  ensureDateExists(state.currentDate);
  if (countEl) {
    countEl.innerText = (state.data[state.currentDate].pretrade || { passes: 0 }).passes || 0;
  }
}

function buildDailySummary(dateStr, dayData) {
  const timerHours = {};
  TRACKER_KEYS.timers.forEach(k => {
    timerHours[k] = Number(((dayData.timers[k] || 0) / 3600).toFixed(3));
  });

  const focusSeconds = Object.values(dayData.timers || {}).reduce((a, b) => a + (b || 0), 0) - (dayData.timers.social_media || 0);
  const scheduleScore = calculateScheduleScore(dayData);
  const completedTimerGoals = TRACKER_KEYS.timers.filter(k => {
    const goalHours = k === 'social_media'
      ? (state.goals.social_media || state.goals.social || TRACKER_META.timers[k].defaultGoal)
      : getTimerGoalHours(k);
    return (dayData.timers[k] || 0) >= goalHours * 3600;
  }).length;
  const completedCounterGoals = TRACKER_KEYS.counters.filter(k => (dayData.counters[k] || 0) >= getCounterGoal(k)).length;

  return {
    date: dateStr,
    timerHours,
    counters: dayData.counters || {},
    emotion: dayData.journal ? dayData.journal.emotion : null,
    awareness: dayData.journal ? (dayData.journal.awareness || null) : null,
    pretradePasses: (dayData.pretrade && dayData.pretrade.passes) || 0,
    waterCups: dayData.water || 0,
    focusHours: Number((focusSeconds / 3600).toFixed(3)),
    completedTimerGoals,
    completedCounterGoals,
    scheduleCompletionPercent: scheduleScore.percent,
    scheduleWeightedPercent: scheduleScore.weightedPercent,
    scheduleCompletedSlots: scheduleScore.completed,
    scheduleCompletedWeight: scheduleScore.completedWeight,
    scheduleTotalWeight: scheduleScore.totalWeight,
    hasJournalText: Boolean(dayData.journal && ((dayData.journal.setup || '').trim() || (dayData.journal.execution || '').trim() || (dayData.journal.review || '').trim() || (dayData.journal.nextAction || '').trim()))
  };
}

function exportJsonFile(filename, payload) {
  try {
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
    return true;
  } catch (err) {
    console.error('exportJsonFile failed', err);
    return false;
  }
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Fall through to legacy copy.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    return false;
  }
}

function normalizeImportedTrackerData(imported) {
  // Accept raw day-map, or wrapped export payloads.
  if (!imported || typeof imported !== 'object') return null;
  if (imported.rawData && typeof imported.rawData === 'object') return imported.rawData;
  if (imported.data && typeof imported.data === 'object' && !imported.timers) return imported.data;
  // Heuristic: keys look like YYYY-MM-DD
  const keys = Object.keys(imported);
  if (keys.length === 0) return imported;
  if (keys.some(k => /^\d{4}-\d{2}-\d{2}$/.test(k))) return imported;
  return null;
}

function parseTimeInputToSeconds(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  // Plain minutes: "90"
  if (/^\d+(\.\d+)?$/.test(text)) {
    const mins = Number(text);
    if (!Number.isFinite(mins) || mins < 0) return null;
    return Math.round(mins * 60);
  }

  // HH:MM:SS or MM:SS
  const parts = text.split(':').map(p => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some(p => p === '' || !/^\d+$/.test(p))) return null;

  const nums = parts.map(n => parseInt(n, 10));
  let hours = 0;
  let mins = 0;
  let secs = 0;
  if (nums.length === 3) {
    [hours, mins, secs] = nums;
  } else {
    [mins, secs] = nums;
  }
  if (mins > 59 || secs > 59) return null;
  return (hours * 3600) + (mins * 60) + secs;
}

function setManualSecondsTotal(key, totalSeconds) {
  const secs = Number(totalSeconds);
  if (!Number.isFinite(secs) || secs < 0) return;

  ensureDateExists(state.currentDate);
  if (state.activeTimer === key) tickTimer();

  state.data[state.currentDate].timers[key] = secs;
  saveLocalData();
  updateUI();
}

function renderManualMinuteControls() {
  TRACKER_KEYS.timers.forEach(key => {
    const card = document.getElementById(`card-${key}`);
    if (!card || card.querySelector('.manual-minute-controls')) return;

    const currentSecs = (state.data[state.currentDate] && state.data[state.currentDate].timers[key]) || 0;
    const controls = document.createElement('div');
    controls.className = 'manual-minute-controls';
    controls.innerHTML = `
      <span class="manual-total-label">總時間</span>
      <input type="text" class="manual-minute-input" inputmode="numeric" placeholder="HH:MM:SS" value="${formatTime(currentSecs)}" data-timer="${key}" title="可輸入 HH:MM:SS、MM:SS 或總分鐘數">
      <button type="button" class="btn-manual-minutes" data-action="sub5" data-timer="${key}">-5分</button>
      <button type="button" class="btn-manual-minutes" data-action="add5" data-timer="${key}">+5分</button>
      <button type="button" class="btn-manual-minutes btn-manual-set" data-action="set" data-timer="${key}">套用</button>
    `;
    card.appendChild(controls);
  });
}

// --- 8. UI Synchronization & Setup ---
function updateUI() {
  ensureDateExists(state.currentDate);
  const dayData = state.data[state.currentDate];
  
  // Set date text
  document.getElementById('current-date-str').innerText = `${state.currentDate} (今日)`;
  
  // Update timers displays (only if they aren't currently running, to avoid flickers)
  TRACKER_KEYS.timers.forEach(k => {
    if (state.activeTimer !== k) {
      const el = document.getElementById(`time-${k}`);
      if (el) el.innerText = formatTime(dayData.timers[k]);
    }

    const totalInput = document.querySelector(`.manual-minute-input[data-timer="${k}"]`);
    if (totalInput && document.activeElement !== totalInput) {
      totalInput.value = formatTime(dayData.timers[k] || 0);
    }
    
    // Per-item progress bars are intentionally not shown in the widget.
  });

  // Update counters
  TRACKER_KEYS.counters.forEach(k => {
    const el = document.getElementById(`cnt-${k}`);
    if (el) el.innerText = dayData.counters[k];
    if (el && el.parentElement) {
      let targetEl = el.parentElement.querySelector('.counter-target');
      if (!targetEl) {
        targetEl = document.createElement('span');
        targetEl.className = 'counter-target';
        el.parentElement.appendChild(targetEl);
      }
      const goal = getCounterGoal(k);
      const pct = goal > 0 ? Math.min(100, Math.round(((dayData.counters[k] || 0) / goal) * 100)) : 0;
      targetEl.innerText = `目標: ${goal} 次 | ${pct}%`;
    }
  });

  // Update dashboard visuals
  updateActivityRings();
  updateDashboardGoalSummary();
  renderWaterTracker();
  renderWeeklyRings();
  renderWeeklyChart();
  renderSchedule();
  syncTodosFromCheckpoints();
}

// Load daily journal form inputs with saved state
function loadJournalForm() {
  ensureDateExists(state.currentDate);
  const journal = state.data[state.currentDate].journal;
  state.selectedEmotion = journal.emotion || 3;
  state.selectedAwareness = journal.awareness || 2;
  document.querySelectorAll('.awareness-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-aware')) === state.selectedAwareness);
  });
  
  const elSetup = document.getElementById('journal-setup');
  const elExec = document.getElementById('journal-execution');
  const elReview = document.getElementById('journal-review');
  const elNext = document.getElementById('journal-next-action');

  if (elSetup) elSetup.value = journal.setup || '';
  if (elExec) elExec.value = journal.execution || '';
  if (elReview) elReview.value = journal.review || '';
  if (elNext) elNext.value = journal.nextAction || '';
  
  // Reset active button state
  const btns = document.querySelectorAll('.emotion-btn');
  btns.forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.getAttribute('data-level')) === state.selectedEmotion) {
      btn.classList.add('active');
    }
  });
}

// --- 9. GitHub Sync Engine ---
function setSyncStatus(status, text) {
  const badge = document.getElementById('nav-sync-status');
  if (!badge) return;

  badge.className = 'sync-badge ' + status;
  badge.querySelector('.badge-text').innerText = text;
}

// GitHub API: Pull Data
async function gitHubPull() {
  const { token, username, repo, filepath } = state.sync;
  if (!token || !username || !repo) {
    setSyncStatus('offline', '本地儲存');
    return false;
  }

  setSyncStatus('syncing', '正在下載...');
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${filepath}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (res.status === 404) {
      // File not found on repo, which means first time sync. We will push local data
      setSyncStatus('online', '初始化中...');
      await gitHubPush(true);
      return true;
    }

    if (!res.ok) throw new Error('GitHub Pull Failed');

    const json = await res.json();
    const remoteContent = atob(json.content.replace(/\s/g, ''));
    const remoteData = JSON.parse(remoteContent);

    // Conflict Resolution: Merge remote and local
    mergeData(remoteData);
    saveLocalData();
    updateUI();
    loadJournalForm();
    
    setSyncStatus('online', '雲端同步');
    return true;
  } catch (err) {
    console.error(err);
    setSyncStatus('offline', '同步失敗');
    alert('GitHub 下載數據失敗，請檢查設定與 Token 權限。');
    return false;
  }
}

// GitHub API: Push Data
async function gitHubPush(isNewFile = false) {
  const { token, username, repo, filepath } = state.sync;
  if (!token || !username || !repo) return false;

  setSyncStatus('syncing', '正在上傳...');
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${filepath}`;

  try {
    let sha = null;

    if (!isNewFile) {
      // Need to fetch file metadata to get SHA
      const getRes = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const metadata = await getRes.json();
        sha = metadata.sha;
      }
    }

    // Convert local data to Base64 String (handling Unicode cleanly)
    const localJsonStr = JSON.stringify(state.data, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(localJsonStr)));

    const body = {
      message: `Sync activity logs: ${getTodayDateString()}`,
      content: base64Content
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) throw new Error('GitHub Push Failed');

    setSyncStatus('online', '已同步');
    return true;
  } catch (err) {
    console.error(err);
    setSyncStatus('offline', '上傳失敗');
    alert('上傳數據到 GitHub 失敗。');
    return false;
  }
}

// Merge remote database into local database smoothly (Conflict resolution)
function mergeData(remoteData) {
  Object.keys(remoteData).forEach(dateStr => {
    if (!state.data[dateStr]) {
      state.data[dateStr] = remoteData[dateStr];
    } else {
      const local = state.data[dateStr];
      const remote = remoteData[dateStr];

      // Merge Timers: Keep maximum duration recorded
      TRACKER_KEYS.timers.forEach(k => {
        local.timers[k] = Math.max(local.timers[k] || 0, remote.timers[k] || 0);
      });

      // Merge Counters: Keep maximum counts
      TRACKER_KEYS.counters.forEach(k => {
        local.counters[k] = Math.max(local.counters[k] || 0, remote.counters[k] || 0);
      });

      // Merge Journal text (Keep longer entries, or take remote if local is empty)
      if (remote.journal) {
        if (!local.journal) local.journal = remote.journal;
        else {
          local.journal.emotion = remote.journal.emotion || local.journal.emotion || 3;
          if ((remote.journal.setup || '').length > (local.journal.setup || '').length) local.journal.setup = remote.journal.setup;
          if ((remote.journal.execution || '').length > (local.journal.execution || '').length) local.journal.execution = remote.journal.execution;
          if ((remote.journal.review || '').length > (local.journal.review || '').length) local.journal.review = remote.journal.review;
          if ((remote.journal.nextAction || '').length > (local.journal.nextAction || '').length) local.journal.nextAction = remote.journal.nextAction;
        }
      }
    }
  });
}

// --- 10. Event Listeners & Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      if (window.caches) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
    } catch (err) {
      console.warn('Unable to clear old service worker cache', err);
    }
  }
  
  // 1. Initial State Load
  loadLocalData();
  
  // Display Local computer IP dynamically in installation instructions
  const hostname = window.location.hostname || 'localhost';
  const port = window.location.port || '8000';
  document.querySelectorAll('.local-ip-placeholder').forEach(el => {
    el.innerText = `${hostname}:${port}`;
  });

  // 2. Setup Navigation Routing
  const navBtns = document.querySelectorAll('.nav-btn');
  const viewPanels = document.querySelectorAll('.view-panel');
  const viewTitle = document.getElementById('view-title');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-target');
      
      navBtns.forEach(b => b.classList.remove('active'));
      viewPanels.forEach(v => v.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(targetView).classList.add('active');
      
      // Update page title
      if (targetView === 'widget-view') {
        viewTitle.innerText = '小工具計時器';
      } else if (targetView === 'dashboard-view') {
        viewTitle.innerText = '運動儀表板 (進度)';
        renderWeeklyChart();
      } else if (targetView === 'history-view') {
        viewTitle.innerText = '歷史交易日記';
        renderHistory();
      } else if (targetView === 'schedule-view') {
        viewTitle.innerText = '時間表執行追蹤';
        renderSchedule();
        renderScheduleEditor();
      } else if (targetView === 'settings-view') {
        viewTitle.innerText = '設定與同步';
      }
    });
  });

  // 3. Setup Timer Card clicks
  renderManualMinuteControls();

  document.querySelectorAll('.btn-timer-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const timerKey = btn.getAttribute('data-timer');
      toggleTimer(timerKey);
    });
  });

  document.addEventListener('click', (e) => {
    const manualBtn = e.target.closest('.btn-manual-minutes');
    if (!manualBtn) return;

    const timerKey = manualBtn.getAttribute('data-timer');
    const input = document.querySelector(`.manual-minute-input[data-timer="${timerKey}"]`);
    const action = manualBtn.getAttribute('data-action') || 'set';

    if (action === 'add5') {
      adjustManualMinutes(timerKey, 5);
      return;
    }
    if (action === 'sub5') {
      adjustManualMinutes(timerKey, -5);
      return;
    }

    const rawVal = input ? input.value.trim() : '';
    if (rawVal === '') return;
    const totalSeconds = parseTimeInputToSeconds(rawVal);
    if (totalSeconds === null) {
      alert('請輸入有效總時間：HH:MM:SS、MM:SS，或總分鐘數（例如 90）');
      return;
    }
    setManualSecondsTotal(timerKey, totalSeconds);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.manual-minute-input');
    if (!input) return;
    e.preventDefault();
    const timerKey = input.getAttribute('data-timer');
    const totalSeconds = parseTimeInputToSeconds(input.value);
    if (totalSeconds === null) {
      alert('請輸入有效總時間：HH:MM:SS、MM:SS，或總分鐘數（例如 90）');
      return;
    }
    setManualSecondsTotal(timerKey, totalSeconds);
  });

  // 4. Setup Counter Clicks
  document.querySelectorAll('.btn-counter').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-counter');
      const action = btn.getAttribute('data-action');
      const delta = action === 'inc' ? 1 : -1;
      changeCounter(key, delta);
    });
  });

  document.addEventListener('click', (e) => {
    const scheduleBtn = e.target.closest('.schedule-switch');
    if (scheduleBtn) {
      toggleScheduleSlot(scheduleBtn.getAttribute('data-slot'));
      return;
    }

    const waterCup = e.target.closest('.water-cup');
    if (waterCup) {
      setWaterCount(parseInt(waterCup.getAttribute('data-cup'), 10));
      return;
    }

    const pretradeItem = e.target.closest('.pretrade-item');
    if (pretradeItem) {
      const checkId = pretradeItem.getAttribute('data-check');
      pretradeChecks[checkId] = !pretradeChecks[checkId];
      renderPretradeChecklist();
    }
  });

  document.addEventListener('change', (e) => {
    const todoCheck = e.target.closest('.todo-check');
    if (!todoCheck) return;
    toggleTodoDone(todoCheck.getAttribute('data-todo-id'));
  });

  // Pre-trade checklist pass / reset
  const btnPretradePass = document.getElementById('btn-pretrade-pass');
  if (btnPretradePass) {
    btnPretradePass.addEventListener('click', () => {
      ensureDateExists(state.currentDate);
      if (!state.data[state.currentDate].pretrade) {
        state.data[state.currentDate].pretrade = { passes: 0 };
      }
      state.data[state.currentDate].pretrade.passes += 1;
      pretradeChecks = {};
      saveLocalData();
      renderPretradeChecklist();
    });
  }

  const btnPretradeReset = document.getElementById('btn-pretrade-reset');
  if (btnPretradeReset) {
    btnPretradeReset.addEventListener('click', () => {
      pretradeChecks = {};
      renderPretradeChecklist();
    });
  }

  // Awareness picker (1 先知先覺 ~ 4 不知不覺)
  const awarenessBtns = document.querySelectorAll('.awareness-btn');
  awarenessBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      awarenessBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedAwareness = parseInt(btn.getAttribute('data-aware'));
    });
  });

  // Now card + todo checkpoint refresh
  renderNowCard();
  renderPretradeChecklist();
  renderScheduleEditor();
  syncTodosFromCheckpoints();
  setInterval(() => {
    renderNowCard();
    syncTodosFromCheckpoints();
  }, 60000);

  const btnSaveSchedule = document.getElementById('btn-save-schedule');
  if (btnSaveSchedule) {
    btnSaveSchedule.addEventListener('click', saveScheduleEditor);
  }

  const btnResetSchedule = document.getElementById('btn-reset-schedule');
  if (btnResetSchedule) {
    btnResetSchedule.addEventListener('click', () => {
      if (!confirm('確定還原預設時間表？你自訂的時間與內容會被覆蓋。')) return;
      scheduleSlots = buildDefaultScheduleSlots();
      saveLocalData();
      renderSchedule();
      renderScheduleEditor();
      renderNowCard();
    });
  }

  // Pomodoro controls
  loadPomodoroState();
  updatePomodoroUI();
  const pomodoroToggleBtn = document.getElementById('pomodoro-toggle-btn');
  const pomodoroResetBtn = document.getElementById('pomodoro-reset-btn');
  const pomodoroSkipBtn = document.getElementById('pomodoro-skip-btn');

  if (pomodoroToggleBtn) pomodoroToggleBtn.addEventListener('click', togglePomodoro);
  if (pomodoroResetBtn) pomodoroResetBtn.addEventListener('click', resetPomodoro);
  if (pomodoroSkipBtn) {
    pomodoroSkipBtn.addEventListener('click', () => {
      const nextMode = pomodoroState.mode === 'work' ? 'break' : 'work';
      setPomodoroMode(nextMode, true);
    });
  }

  // Save local + push current progress to GitHub (manual, not daily auto)
  const btnSavePush = document.getElementById('btn-save-push');
  if (btnSavePush) {
    btnSavePush.addEventListener('click', async () => {
      if (state.activeTimer) tickTimer();
      saveLocalData();

      if (!state.sync.token || !state.sync.username || !state.sync.repo) {
        alert('本地已儲存。尚未設定 GitHub Token / 帳號 / Repo，請先到「設定與同步」。');
        return;
      }

      btnSavePush.disabled = true;
      const originalText = btnSavePush.querySelector('.btn-text');
      if (originalText) originalText.innerText = '推送中...';
      const ok = await gitHubPush(false);
      if (originalText) originalText.innerText = '儲存並推送';
      btnSavePush.disabled = false;
      alert(ok ? '已儲存並推送到 GitHub。' : '本地已儲存，但 GitHub 推送失敗，請檢查 Token / 權限。');
    });
  }

  // 5. Setup Journal Emotion Picker
  const emotionBtns = document.querySelectorAll('.emotion-btn');
  
  emotionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      emotionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedEmotion = parseInt(btn.getAttribute('data-level'));
    });
  });

  // Save Journal Form Submit
  const journalForm = document.getElementById('trading-journal-form');
  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ensureDateExists(state.currentDate);
    
    state.data[state.currentDate].journal = {
      emotion: state.selectedEmotion || 3,
      awareness: state.selectedAwareness || 2,
      setup: document.getElementById('journal-setup').value.trim(),
      execution: document.getElementById('journal-execution').value.trim(),
      review: document.getElementById('journal-review').value.trim(),
      nextAction: document.getElementById('journal-next-action').value.trim()
    };
    
    saveLocalData();
    alert('今日交易日記已成功儲存！');
    
    // Auto push to GitHub if setup
    if (state.sync.token && state.sync.username && state.sync.repo) {
      gitHubPush();
    }
  });

  // 6. Setup History search & filter changes
  document.getElementById('history-search-input').addEventListener('input', renderHistory);
  document.getElementById('history-emotion-filter').addEventListener('change', renderHistory);

  // 7. Setup Chart Toggle buttons
  const btnChartTime = document.getElementById('btn-chart-time');
  const btnChartEmotion = document.getElementById('btn-chart-emotion');

  btnChartTime.addEventListener('click', () => {
    btnChartTime.classList.add('active');
    btnChartEmotion.classList.remove('active');
    state.currentChartMode = 'time';
    renderWeeklyChart();
  });

  btnChartEmotion.addEventListener('click', () => {
    btnChartEmotion.classList.add('active');
    btnChartTime.classList.remove('active');
    state.currentChartMode = 'emotion';
    renderWeeklyChart();
  });

  // 8. Compact Widget Size Toggle
  const toggleWidgetBtn = document.getElementById('toggle-widget-size');
  toggleWidgetBtn.addEventListener('click', () => {
    document.body.classList.toggle('widget-mode');
    
    // Update button text / state
    const isWidget = document.body.classList.contains('widget-mode');
    toggleWidgetBtn.querySelector('.btn-text').innerText = isWidget ? '退出小工具模式' : '極簡小工具模式';
  });

  // 9. Load Sync Settings to Form (Defensively)
  const syncTokenEl = document.getElementById('sync-token');
  const syncUserEl = document.getElementById('sync-user');
  const syncRepoEl = document.getElementById('sync-repo');
  const syncPathEl = document.getElementById('sync-path');

  if (syncTokenEl) syncTokenEl.value = state.sync.token || '';
  if (syncUserEl) syncUserEl.value = state.sync.username || '';
  if (syncRepoEl) syncRepoEl.value = state.sync.repo || '';
  if (syncPathEl) syncPathEl.value = state.sync.filepath || 'data.json';

  // Save Sync Form Submit
  const syncFormEl = document.getElementById('github-sync-form');
  if (syncFormEl) {
    syncFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      state.sync.token = syncTokenEl.value.trim();
      state.sync.username = syncUserEl.value.trim();
      state.sync.repo = syncRepoEl.value.trim();
      state.sync.filepath = syncPathEl.value.trim() || 'data.json';
      
      saveLocalData();
      alert('同步設定已儲存，正在嘗試進行首次拉取合併...');
      await gitHubPull();
    });
  }

  // Force Push click
  const btnForcePush = document.getElementById('btn-force-push');
  if (btnForcePush) {
    btnForcePush.addEventListener('click', async () => {
      if (confirm('這將覆蓋 GitHub 上現有的 JSON 檔案，以本地數據為主。確定要強制上傳 (Push) 嗎？')) {
        await gitHubPush(false);
      }
    });
  }

  // 10. Load Goal Settings to Form (Defensively)
  const elGoalTrading = document.getElementById('goal-trading');
  const elGoalSpirit = document.getElementById('goal-spirit');
  const elGoalExercise = document.getElementById('goal-exercise');
  const elGoalLearn = document.getElementById('goal-learn');
  const elGoalSocial = document.getElementById('goal-social');
  const elGoalMind = document.getElementById('goal-mind'); // fallback for old cache
  const elItemGoalInputs = {
    social_media: document.getElementById('goal-social_media'),
    trading_static_training: document.getElementById('goal-trading_static_training'),
    trading_live_training: document.getElementById('goal-trading_live_training'),
    real_live_trading: document.getElementById('goal-real_live_trading'),
    trading_study: document.getElementById('goal-trading_study'),
    review: document.getElementById('goal-review'),
    spiritual_growth: document.getElementById('goal-spiritual_growth'),
    exercise: document.getElementById('goal-exercise_item'),
    other_study: document.getElementById('goal-other_study')
  };
  const elCounterGoalInputs = {
    parent_study: document.getElementById('goal-parent_study'),
    parent_play: document.getElementById('goal-parent_play'),
    trading_static_cnt: document.getElementById('goal-trading_static_cnt'),
    trading_live_cnt: document.getElementById('goal-trading_live_cnt')
  };

  if (elGoalTrading) elGoalTrading.value = state.goals.trading;
  if (elGoalSpirit) elGoalSpirit.value = state.goals.spiritual_growth || 0.5;
  if (elGoalExercise) elGoalExercise.value = state.goals.exercise || 0.5;
  if (elGoalLearn) elGoalLearn.value = state.goals.learn;
  if (elGoalSocial) elGoalSocial.value = state.goals.social_media || state.goals.social || 1.0;
  if (elGoalMind) elGoalMind.value = (state.goals.spiritual_growth || 0.5) + (state.goals.exercise || 0.5);
  TRACKER_KEYS.timers.forEach(k => {
    const input = elItemGoalInputs[k];
    if (input) input.value = k === 'social_media' ? (state.goals.social_media || state.goals.social || 1.0) : getTimerGoalHours(k);
  });
  TRACKER_KEYS.counters.forEach(k => {
    const input = elCounterGoalInputs[k];
    if (input) input.value = getCounterGoal(k);
  });

  // Save Goals Form
  const elGoalsForm = document.getElementById('goals-form');
  if (elGoalsForm) {
    elGoalsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (elGoalTrading) state.goals.trading = parseFloat(elGoalTrading.value) || 2.0;
      if (elGoalSpirit) state.goals.spiritual_growth = parseFloat(elGoalSpirit.value) || 0.5;
      if (elGoalExercise) state.goals.exercise = parseFloat(elGoalExercise.value) || 0.5;
      if (elGoalLearn) state.goals.learn = parseFloat(elGoalLearn.value) || 1.5;
      if (elGoalSocial) state.goals.social_media = parseFloat(elGoalSocial.value) || 1.0;
      state.goals.social = state.goals.social_media; // maintain fallback sync
      TRACKER_KEYS.timers.forEach(k => {
        const input = elItemGoalInputs[k];
        if (input) state.goals[k] = parseFloat(input.value) || TRACKER_META.timers[k].defaultGoal;
      });
      if (!state.goals.counters) state.goals.counters = {};
      TRACKER_KEYS.counters.forEach(k => {
        const input = elCounterGoalInputs[k];
        if (input) state.goals.counters[k] = parseInt(input.value, 10) || TRACKER_META.counters[k].defaultGoal;
      });
      
      saveLocalData();
      updateUI();
      alert('每日追蹤目標已更新！');
    });
  }

  // 11. Backup / Export JSON
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const ok = exportJsonFile(`focus_tracker_backup_${getTodayDateString()}.json`, state.data);
      if (ok) {
        alert('已觸發下載。如果 Downloads 沒有檔案，請改按「複製備份到剪貼簿」，或檢查瀏覽器是否攔截下載。');
      } else {
        alert('匯出失敗。請改用「複製備份到剪貼簿」。');
      }
    });
  }

  const btnCopyJson = document.getElementById('btn-copy-json');
  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', async () => {
      const dataStr = JSON.stringify(state.data, null, 2);
      const ok = await copyTextToClipboard(dataStr);
      if (ok) {
        alert('已複製完整備份到剪貼簿。請到 GitHub 版頁面按 F12 → Console，貼上還原指令。');
      } else {
        alert('複製失敗。請按 F12 打開 Console，執行：copy(localStorage.getItem("focus_tracker_data"))');
      }
    });
  }

  // Tidy long-format CSV for analytics coursework (date, metric, value)
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const lines = ['date,metric,value'];
      Object.keys(state.data).sort().forEach(dateStr => {
        const s = buildDailySummary(dateStr, state.data[dateStr]);
        TRACKER_KEYS.timers.forEach(k => lines.push(`${dateStr},timer_${k}_hours,${s.timerHours[k]}`));
        TRACKER_KEYS.counters.forEach(k => lines.push(`${dateStr},counter_${k},${s.counters[k] || 0}`));
        lines.push(`${dateStr},emotion,${s.emotion == null ? '' : s.emotion}`);
        lines.push(`${dateStr},awareness,${s.awareness == null ? '' : s.awareness}`);
        lines.push(`${dateStr},focus_hours,${s.focusHours}`);
        lines.push(`${dateStr},schedule_weighted_percent,${s.scheduleWeightedPercent}`);
        lines.push(`${dateStr},pretrade_passes,${s.pretradePasses}`);
        lines.push(`${dateStr},water_cups,${s.waterCups}`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focus_tracker_tidy_${getTodayDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const btnExportAnalysisJson = document.getElementById('btn-export-analysis-json');
  if (btnExportAnalysisJson) {
    btnExportAnalysisJson.addEventListener('click', () => {
      const dailySummaries = Object.keys(state.data)
        .sort()
        .map(dateStr => buildDailySummary(dateStr, state.data[dateStr]));
      exportJsonFile(`focus_tracker_analysis_${getTodayDateString()}.json`, {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        trackerMeta: TRACKER_META,
        goals: state.goals,
        scheduleSlots,
        dailySummaries,
        rawData: state.data
      });
    });
  }

  // Backup / Import JSON
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const importedRaw = JSON.parse(evt.target.result);
          const importedData = normalizeImportedTrackerData(importedRaw);
          if (!importedData) {
            alert('JSON 格式不正確。請匯入 Export JSON 備份（日期為 key 的資料）。');
            return;
          }
          if (confirm('匯入備份將會合併您的歷史數據。確定要繼續嗎？')) {
            mergeData(importedData);
            saveLocalData();
            updateUI();
            loadJournalForm();
            alert('數據備份已順利匯入合併！');
          }
        } catch (err) {
          alert('無效的 JSON 備份檔案，匯入失敗。');
        }
      };
      reader.readAsText(file);
    });
  }

  // Clean Database Reset
  const btnResetDb = document.getElementById('btn-reset-db');
  if (btnResetDb) {
    btnResetDb.addEventListener('click', () => {
      if (confirm('警告！這將徹底刪除本地的所有交易日記及時間紀錄，此操作無法復原！確定要清除嗎？')) {
        localStorage.removeItem('focus_tracker_data');
        state.data = {};
        state.activeTimer = null;
        if (state.timerInterval) clearInterval(state.timerInterval);
        ensureDateExists(state.currentDate);
        saveLocalData();
        updateUI();
        loadJournalForm();
        alert('所有本地數據已被完全清除。');
      }
    });
  }

  // 12. Run initial UI updates & pull (if sync enabled)
  updateUI();
  loadJournalForm();
  
  if (state.sync.token && state.sync.username && state.sync.repo) {
    gitHubPull();
  }

  // Service worker registration is disabled during local development to avoid stale UI cache.
});
