 /* ===== MINDSPACE APP.JS ===== */

// ---- CONFIG ----
let CONFIG = {
  supabaseUrl: 'https://nwsbrxacmpxqwzrptuvg.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c2JyeGFjbXB4cXd6cnB0dXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTA0MzYsImV4cCI6MjA4OTMyNjQzNn0.dxJRaor7NljpYPOhmNDn3yDlg-I-p-6UXe4ZNj0OCCM',
  geminiKey: 'add your api key'
};

let supabaseClient = null;
let currentUser = null;
let isDemoMode = false;

// In-memory demo storage
let demoData = {
  moods: [],
  journals: [],
  posts: [],
  username: 'WellnessSoul'
};

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadConfig();
  setGreeting();
  setJournalDate();
  loadAffirmation();
  loadTip();
  initResources();
  loadCommunityPosts();
  initBreathing();
  setupSidebarNav();
  setupAuthTabs();
});

function loadConfig() {
  const sbUrl = localStorage.getItem('ms_sb_url');
  const sbKey = localStorage.getItem('ms_sb_key');
  const geminiKey = localStorage.getItem('ms_gemini_key');

  if (sbUrl && sbUrl.trim()) CONFIG.supabaseUrl = sbUrl.trim();
  if (sbKey && sbKey.trim()) CONFIG.supabaseKey = sbKey.trim();
  if (geminiKey && geminiKey.trim()) CONFIG.geminiKey = geminiKey.trim();

  if (CONFIG.supabaseUrl && CONFIG.supabaseKey) {
    try {
      supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      console.log('Supabase initialized successfully');
    } catch (e) {
      console.error('Supabase init failed:', e);
      showToast('Supabase connection failed.');
    }
  }
}

// ---- AUTH ----
function setupAuthTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

async function authLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const msg = document.getElementById('auth-msg');

  if (!email || !pass) { msg.textContent = 'Please enter email and password.'; return; }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
      msg.textContent = error.message;
      showToast('Login failed: ' + error.message);
      return;
    }
    currentUser = data.user;
    const meta = data.user.user_metadata;
    enterApp(meta?.username || email.split('@')[0]);
  } else {
    msg.textContent = 'Supabase not configured. Use Guest mode or setup credentials in Settings ⚙️';
    showToast('Missing Supabase configuration');
  }
}

async function authRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const msg = document.getElementById('auth-msg');

  if (!name || !email || !pass) { msg.textContent = 'Please fill in all fields.'; return; }
  if (pass.length < 8) { msg.textContent = 'Password must be at least 8 characters.'; return; }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signUp({
      email, password: pass,
      options: { data: { username: name } }
    });
    if (error) {
      msg.textContent = error.message;
      showToast('Registration failed: ' + error.message);
      return;
    }
    currentUser = data.user;
    await ensureUserProfile(name);
    enterApp(name);
  } else {
    msg.textContent = 'Supabase not configured. Use Guest mode or setup credentials in Settings ⚙️';
    showToast('Missing Supabase configuration');
  }
}

async function ensureUserProfile(username) {
  if (!supabaseClient || !currentUser) return;
  try {
    await supabaseClient.from('profiles').upsert({
      id: currentUser.id, username, created_at: new Date().toISOString()
    });
  } catch (e) { console.warn('Profile upsert skipped:', e); }
}

function demoLogin() {
  isDemoMode = true;
  currentUser = { id: 'demo', email: 'demo@mindspace.app' };
  loadDemoData();
  enterApp(demoData.username);
}

function loadDemoData() {
  const saved = localStorage.getItem('ms_demo_data');
  if (saved) { try { demoData = JSON.parse(saved); } catch (e) { } }
  if (!demoData.posts || demoData.posts.length === 0) {
    demoData.posts = getDefaultPosts();
  }
}

function saveDemoData() {
  localStorage.setItem('ms_demo_data', JSON.stringify(demoData));
}

function getDefaultPosts() {
  return [
    { id: 1, text: "Had a really tough week but I'm proud I got through it. Small wins matter 💪", tag: 'progress', anon: '🌸', time: '2h ago', likes: 12, liked: false },
    { id: 2, text: "Anxiety has been really high lately. Does anyone have tips that actually help?", tag: 'anxiety', anon: '🌊', time: '4h ago', likes: 8, liked: false },
    { id: 3, text: "Grateful for this community. Just knowing I'm not alone makes such a difference.", tag: 'gratitude', anon: '☀️', time: '1d ago', likes: 23, liked: false },
    { id: 4, text: "I need to vent — sometimes everything just feels too much. Anyone else feel this way?", tag: 'vent', anon: '🍃', time: '1d ago', likes: 5, liked: false }
  ];
}

function enterApp(username) {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('auth-overlay').classList.remove('active');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-username').textContent = username;
  document.getElementById('topbar-avatar').textContent = username[0].toUpperCase();
  document.getElementById('sidebar-avatar').textContent = username[0].toUpperCase();
  loadMoodHistory();
  loadJournalEntries();
  loadCommunityPosts();
  updateStreak();
}

async function logout() {
  if (supabaseClient && !isDemoMode) await supabaseClient.auth.signOut();
  currentUser = null; isDemoMode = false;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  navigate('dashboard');
}

// ---- LANDING PAGE LOGIC ----
function openAuth(tab = 'login') {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('active');
  
  // Switch to correct tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
}

function scrollToFeatures() {
  document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// ---- THEME LOGIC ----
function initTheme() {
  if (localStorage.getItem('ms_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeUI(true);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('ms_theme', isDark ? 'dark' : 'light');
  updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
  const icon = isDark ? '☀️' : '🌙';
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.textContent = icon);
  const sideIcon = document.querySelector('.theme-icon');
  if (sideIcon) sideIcon.textContent = icon;
}

// ---- NAVIGATION ----
function setupSidebarNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.page);
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
}

function navigate(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  if (page === 'tracker') { updateMoodEmoji(); loadMoodCharts(); }
  if (page === 'journal') { loadJournalEntries(); }
  if (page === 'community') { loadCommunityPosts(); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ---- GREETING ----
function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = greet + ' 🌿';
}

// ---- AFFIRMATIONS & TIPS ----
const AFFIRMATIONS = [
  "You are worthy of love and kindness, especially from yourself.",
  "Every step forward, no matter how small, is progress.",
  "You have survived every difficult day so far.",
  "Your feelings are valid. You are allowed to feel them.",
  "Rest is not laziness — it is part of healing.",
  "You are doing better than you think.",
  "Healing is not linear, and that is okay.",
  "You deserve the same compassion you give to others.",
  "Today, you showed up. That counts.",
  "Your mind deserves care, just like your body."
];
const TIPS = [
  "Try the 5-4-3-2-1 grounding technique: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
  "A 10-minute walk in nature can reduce cortisol levels significantly.",
  "Writing down 3 gratitudes each night rewires your brain for positivity over time.",
  "Limit screen time 1 hour before bed to improve sleep quality and mood.",
  "Staying hydrated has a direct impact on mood and cognitive function.",
  "Reaching out to one person today — even a text — can break isolation.",
  "Deep belly breathing for 2 minutes activates your parasympathetic nervous system.",
  "Regular journaling helps process emotions and reduce anxiety.",
  "A consistent wake-up time (even on weekends) stabilizes your mood cycle.",
  "Acts of kindness to others boost your own dopamine and serotonin."
];
const PROMPTS = [
  "What made you smile today?",
  "What is one thing you're proud of this week?",
  "Describe a moment of peace you experienced recently.",
  "What are you grateful for right now?",
  "What would your future self tell you today?",
  "What emotion are you carrying, and where do you feel it in your body?",
  "What is one small thing you could do to be kind to yourself today?",
  "Describe a challenge you overcame. What did it teach you?",
  "What boundaries would help you feel safer right now?",
  "Write a letter to your younger self."
];

function loadAffirmation() {
  const stored = JSON.parse(localStorage.getItem('ms_affirmation') || 'null');
  const today = new Date().toDateString();
  if (stored && stored.date === today) {
    document.getElementById('affirmation-text').textContent = stored.text;
  } else {
    newAffirmation();
  }
}
function newAffirmation() {
  const text = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
  document.getElementById('affirmation-text').textContent = text;
  localStorage.setItem('ms_affirmation', JSON.stringify({ date: new Date().toDateString(), text }));
}
function loadTip() {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  document.getElementById('tip-text').textContent = tip;
}
function newPrompt() {
  const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  document.getElementById('prompt-text').textContent = p;
}
function setJournalDate() {
  document.getElementById('journal-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('prompt-text').textContent = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

// ---- QUICK MOOD ----
function quickMood(val) {
  document.querySelectorAll('.mood-q').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val) === val));
  const entry = { score: val * 2, emotions: [], note: 'Quick check-in', time: new Date().toISOString() };
  saveMoodEntry(entry);
  showToast('Mood logged! 💚');
  updateStreak();
}

// ---- MOOD TRACKER ----
const MOOD_EMOJIS = ['', '😞', '😔', '😟', '😕', '😐', '🙂', '😊', '😄', '🥰', '🤩'];

function updateMoodEmoji() {
  const v = document.getElementById('mood-slider').value;
  document.getElementById('mood-emoji').textContent = MOOD_EMOJIS[v] || '😐';
  document.getElementById('mood-value').textContent = v + ' / 10';
}

function toggleEtag(btn) { btn.classList.toggle('active'); }

async function logMood() {
  const score = parseInt(document.getElementById('mood-slider').value);
  const emotions = [...document.querySelectorAll('.etag.active')].map(b => b.textContent.trim());
  const note = document.getElementById('mood-note').value.trim();
  const msg = document.getElementById('tracker-msg');

  const entry = { score, emotions, note, time: new Date().toISOString() };

  if (supabaseClient && currentUser && !isDemoMode) {
    const { error } = await supabaseClient.from('mood_logs').insert({
      user_id: currentUser.id, score, emotions, note, created_at: entry.time
    });
    if (error) { msg.textContent = 'Error saving: ' + error.message; return; }
  } else {
    demoData.moods.unshift(entry);
    saveDemoData();
  }

  msg.textContent = '✅ Mood logged successfully!';
  document.getElementById('mood-note').value = '';
  document.querySelectorAll('.etag.active').forEach(b => b.classList.remove('active'));
  updateStreak();
  loadMoodCharts();
  loadMoodHistory();
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

async function saveMoodEntry(entry) {
  if (supabaseClient && currentUser && !isDemoMode) {
    await supabaseClient.from('mood_logs').insert({
      user_id: currentUser.id, score: entry.score, emotions: entry.emotions,
      note: entry.note, created_at: entry.time
    });
  } else {
    demoData.moods.unshift(entry);
    saveDemoData();
  }
}

async function loadMoodHistory() {
  let moods = [];
  if (supabaseClient && currentUser && !isDemoMode) {
    const { data } = await supabaseClient.from('mood_logs')
      .select('*').eq('user_id', currentUser.id)
      .order('created_at', { ascending: false }).limit(20);
    moods = data || [];
  } else {
    moods = (demoData.moods || []).slice(0, 20);
  }
  renderMoodHistory(moods);
  renderDashboardChart(moods);
}

function renderMoodHistory(moods) {
  const list = document.getElementById('mood-history-list');
  if (!list) return;
  if (moods.length === 0) { list.innerHTML = '<p class="no-data">No mood entries yet. Start tracking! 🌱</p>'; return; }
  list.innerHTML = moods.map(m => {
    const score = m.score || 5;
    const emoji = MOOD_EMOJIS[Math.min(Math.floor(score), 10)] || '😐';
    const tags = (m.emotions || []).map(e => `<span class="me-tag">${e}</span>`).join('');
    const date = new Date(m.time || m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<div class="mood-entry">
      <span class="me-emoji">${emoji}</span>
      <div class="me-info">
        <div class="me-date">${date}</div>
        ${tags ? `<div class="me-tags">${tags}</div>` : ''}
        ${m.note ? `<div class="me-note">${m.note}</div>` : ''}
      </div>
      <span class="me-score">${score}/10</span>
    </div>`;
  }).join('');
}

let dashChart = null, histChart = null;
function renderDashboardChart(moods) {
  const recent = [...moods].reverse().slice(-7);
  const placeholder = document.getElementById('chart-placeholder');
  const canvas = document.getElementById('mood-chart');
  if (!recent.length) { if (placeholder) placeholder.style.display = 'block'; if (canvas) canvas.style.display = 'none'; return; }
  if (placeholder) placeholder.style.display = 'none';
  if (canvas) canvas.style.display = 'block';
  const labels = recent.map(m => new Date(m.time || m.created_at).toLocaleDateString('en-US', { weekday: 'short' }));
  const data = recent.map(m => m.score);
  if (dashChart) dashChart.destroy();
  dashChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{ data, borderColor: '#4a9468', backgroundColor: 'rgba(74,148,104,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#4a9468', pointRadius: 5 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 1, max: 10, ticks: { color: '#4a6a58', stepSize: 2 }, grid: { color: '#edf9f2' } }, x: { ticks: { color: '#4a6a58' }, grid: { display: false } } } }
  });
}

function loadMoodCharts() {
  loadMoodHistory();
}

// ---- STREAK ----
function updateStreak() {
  const key = 'ms_streak_' + (currentUser?.id || 'demo');
  const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"last":""}');
  const today = new Date().toDateString();
  if (stored.last === today) { document.getElementById('streak-count').textContent = stored.count; return; }
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const newCount = (stored.last === yesterday.toDateString()) ? stored.count + 1 : 1;
  localStorage.setItem(key, JSON.stringify({ count: newCount, last: today }));
  document.getElementById('streak-count').textContent = newCount;
}

// ---- JOURNAL ----
async function saveJournal() {
  const title = document.getElementById('journal-title').value.trim() || 'Untitled Entry';
  const body = document.getElementById('journal-body').value.trim();
  const mood = document.getElementById('journal-mood-tag').value;
  const msg = document.getElementById('journal-msg');

  if (!body) { msg.textContent = '⚠️ Write something first.'; return; }
  const entry = { title, body, mood, time: new Date().toISOString() };

  if (supabaseClient && currentUser && !isDemoMode) {
    const { error } = await supabaseClient.from('journal_entries').insert({
      user_id: currentUser.id, title, body, mood_tag: mood, created_at: entry.time
    });
    if (error) { msg.textContent = 'Error saving: ' + error.message; return; }
  } else {
    demoData.journals.unshift(entry);
    saveDemoData();
  }

  msg.textContent = '✅ Entry saved!';
  clearJournal();
  loadJournalEntries();
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

function clearJournal() {
  document.getElementById('journal-title').value = '';
  document.getElementById('journal-body').value = '';
  document.getElementById('journal-mood-tag').value = '';
}

async function loadJournalEntries() {
  let entries = [];
  if (supabaseClient && currentUser && !isDemoMode) {
    const { data } = await supabaseClient.from('journal_entries')
      .select('*').eq('user_id', currentUser.id)
      .order('created_at', { ascending: false }).limit(15);
    entries = data || [];
  } else {
    entries = demoData.journals || [];
  }
  renderJournalList(entries);
}

function renderJournalList(entries) {
  const list = document.getElementById('journal-list');
  if (!list) return;
  if (entries.length === 0) { list.innerHTML = '<p class="no-data">No journal entries yet. Start writing! ✍️</p>'; return; }
  list.innerHTML = entries.map(e => {
    const date = new Date(e.time || e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const preview = (e.body || '').substring(0, 120) + (e.body?.length > 120 ? '...' : '');
    return `<div class="journal-entry" onclick="openEntry(${JSON.stringify(e).replace(/"/g, '&quot;')})">
      <div class="je-header">
        <span class="je-title">${e.title || 'Untitled'}</span>
        <span class="je-meta">${date} ${e.mood || e.mood_tag ? `· ${e.mood || e.mood_tag}` : ''}</span>
      </div>
      <p class="je-preview">${preview}</p>
    </div>`;
  }).join('');
}

function openEntry(entry) {
  document.getElementById('journal-title').value = entry.title || '';
  document.getElementById('journal-body').value = entry.body || '';
  document.getElementById('journal-mood-tag').value = entry.mood || entry.mood_tag || '';
  document.querySelector('.journal-editor').scrollIntoView({ behavior: 'smooth' });
}

// ---- AI CHAT ----
const SYSTEM_PROMPT = `You are Sage, a compassionate, empathetic, and non-judgmental AI mental wellness companion on MindSpace. 
Your role is to provide emotional support, active listening, and gentle guidance. 
- Always validate feelings before offering advice
- Ask thoughtful follow-up questions
- Suggest evidence-based coping strategies when appropriate (CBT, mindfulness, breathing, journaling)
- If someone seems in crisis, gently encourage professional help and provide hotlines
- Keep responses warm, concise (2-4 sentences typically), and conversational
- Never diagnose or prescribe; you are a supportive companion, not a therapist
- Use gentle, nurturing language that feels human and caring`;

let chatHistory = [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, { role: 'model', parts: [{ text: 'Understood. I am Sage, ready to listen and support.' }] }];

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  appendMsg('user', text);
  input.value = '';
  const typingId = appendTyping();

  const geminiKey = CONFIG.geminiKey || localStorage.getItem('ms_gemini_key') || '';

  if (!geminiKey) {
    removeTyping(typingId);
    appendMsg('ai', "I'd love to help, but I need a Gemini API key to respond. Please go to ⚙️ Settings to add your key. In the meantime, know that reaching out shows real courage. 💚");
    return;
  }

  chatHistory.push({ role: 'user', parts: [{ text }] });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatHistory,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Gemini API Error:', errData);
      throw new Error(errData?.error?.message || 'API request failed');
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here and I hear you. Could you tell me more about what you're experiencing?";
    removeTyping(typingId);
    appendMsg('ai', reply);
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(0, 2).concat(chatHistory.slice(-18));
  } catch (e) {
    console.error('Chat error:', e);
    removeTyping(typingId);
    appendMsg('ai', `I'm having a bit of trouble: ${e.message}. Please try again or check your settings. 🌿`);
  }
}

function appendMsg(role, text) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div.id = 'msg-' + Date.now();
}

function appendTyping() {
  const msgs = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg ai typing'; div.id = id;
  div.innerHTML = `<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function clearChat() {
  document.getElementById('chat-messages').innerHTML = `<div class="msg ai"><div class="msg-bubble">Hi, I'm Sage 🌿 I'm here to listen without judgment. What's on your mind today?</div></div>`;
  chatHistory = chatHistory.slice(0, 2);
}

// ---- COMMUNITY ----
let posts = [];

async function loadCommunityPosts() {
  if (supabaseClient && currentUser && !isDemoMode) {
    const { data } = await supabaseClient.from('community_posts')
      .select('*').order('created_at', { ascending: false }).limit(30);
    posts = (data || []).map(p => ({ ...p, liked: false }));
  } else {
    posts = demoData.posts || getDefaultPosts();
  }
  renderPosts();
}

async function submitPost() {
  const text = document.getElementById('post-text').value.trim();
  const tag = document.getElementById('post-tag').value;
  if (!text) { showToast('Please write something first.'); return; }

  const ANON_ICONS = ['🌸', '🌊', '☀️', '🍃', '🌙', '🦋', '🌺', '🍀', '⭐', '🌸'];
  const anon = ANON_ICONS[Math.floor(Math.random() * ANON_ICONS.length)];

  if (supabaseClient && currentUser && !isDemoMode) {
    const { data, error } = await supabaseClient.from('community_posts').insert({
      text, tag, anon_icon: anon, likes: 0, user_id: currentUser.id, created_at: new Date().toISOString()
    }).select().single();
    if (error) { showToast('Error posting: ' + error.message); return; }
    posts.unshift({ ...data, liked: false });
  } else {
    const post = { id: Date.now(), text, tag, anon, time: 'Just now', likes: 0, liked: false };
    posts.unshift(post);
    demoData.posts = posts;
    saveDemoData();
  }

  document.getElementById('post-text').value = '';
  renderPosts();
  showToast('Posted anonymously 🌿');
}

function renderPosts() {
  const feed = document.getElementById('community-feed');
  if (!feed) return;
  if (posts.length === 0) { feed.innerHTML = '<p class="no-data">No posts yet. Be the first to share! 🌱</p>'; return; }
  feed.innerHTML = posts.map((p, i) => {
    const time = p.time || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent');
    const tag = p.tag || 'general';
    const tagLabels = { general: '💬 General', anxiety: '😰 Anxiety', gratitude: '🥹 Gratitude', progress: '💪 Progress', vent: '😤 Vent', support: '🤝 Support' };
    return `<div class="community-post" id="post-${i}">
      <div class="cp-header">
        <div class="cp-anon">${p.anon || p.anon_icon || '🌸'}</div>
        <div><strong>Anonymous</strong><div class="cp-meta">${time}</div></div>
        <span class="cp-tag">${tagLabels[tag] || tag}</span>
      </div>
      <p class="cp-text">${p.text}</p>
      <div class="cp-actions">
        <button class="cp-btn ${p.liked ? 'liked' : ''}" onclick="likePost(${i})">
          ${p.liked ? '💚' : '🤍'} ${p.likes || 0}
        </button>
        <button class="cp-btn" onclick="replyTo(${i})">💬 Reply</button>
        <button class="cp-btn" onclick="sendSupport(${i})">🤝 Send Support</button>
      </div>
    </div>`;
  }).join('');
}

async function likePost(i) {
  posts[i].liked = !posts[i].liked;
  posts[i].likes = (posts[i].likes || 0) + (posts[i].liked ? 1 : -1);
  if (!isDemoMode && supabaseClient && posts[i].id) {
    await supabaseClient.from('community_posts').update({ likes: posts[i].likes }).eq('id', posts[i].id);
  } else {
    demoData.posts = posts; saveDemoData();
  }
  renderPosts();
}

function replyTo(i) {
  const post = posts[i];
  document.getElementById('post-text').value = `Replying to: "${post.text.substring(0, 40)}..."\n\n`;
  document.getElementById('post-text').focus();
}

function sendSupport(i) {
  showToast('Support sent 💚 They\'ll know someone cares!');
}

// ---- RESOURCES ----
const RESOURCES = [
  { icon: '🧠', tag: 'Understanding', title: 'What is Mental Health?', desc: 'A beginner\'s guide to understanding mental health, its components, and why it matters as much as physical health.' },
  { icon: '😰', tag: 'Anxiety', title: 'Managing Anxiety Daily', desc: 'Evidence-based techniques including CBT, grounding exercises, and lifestyle changes that help reduce anxiety.' },
  { icon: '💙', tag: 'Depression', title: 'Understanding Depression', desc: 'Learn the signs, causes, and treatment options for depression — and how to support yourself or a loved one.' },
  { icon: '😴', tag: 'Sleep', title: 'Sleep & Mental Health', desc: 'How sleep quality directly impacts mood, anxiety, and cognitive function — and habits to improve it.' },
  { icon: '🧘', tag: 'Mindfulness', title: 'Mindfulness for Beginners', desc: 'A practical introduction to mindfulness meditation and how it changes your relationship with difficult thoughts.' },
  { icon: '🫂', tag: 'Relationships', title: 'Setting Healthy Boundaries', desc: 'Why boundaries aren\'t selfish, and how to communicate them clearly in personal and professional relationships.' },
  { icon: '🌱', tag: 'Self-Care', title: 'Building a Self-Care Routine', desc: 'Creating sustainable daily habits that support your emotional, physical, and mental well-being.' },
  { icon: '🆘', tag: 'Crisis', title: 'When to Seek Professional Help', desc: 'Signs that it might be time to talk to a therapist or counselor — and how to find the right support for you.' },
  { icon: '💪', tag: 'Resilience', title: 'Building Emotional Resilience', desc: 'Practical strategies to bounce back from adversity, manage stress, and grow through challenges.' },
  { icon: '🤝', tag: 'Support', title: 'Supporting a Loved One', desc: 'How to help someone struggling with mental health while also taking care of yourself.' },
  { icon: '🍃', tag: 'Stress', title: 'Stress Management Techniques', desc: 'From breathing exercises to time management — proven ways to reduce and cope with everyday stress.' },
  { icon: '🌈', tag: 'Recovery', title: 'The Recovery Journey', desc: 'What recovery from mental health challenges actually looks like — non-linear, personal, and possible.' }
];

function initResources() {
  renderResources(RESOURCES);
}

function filterResources() {
  const q = document.getElementById('resource-search').value.toLowerCase();
  const filtered = RESOURCES.filter(r => r.title.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
  renderResources(filtered);
}

function renderResources(list) {
  const grid = document.getElementById('resources-grid');
  if (!grid) return;
  if (list.length === 0) { grid.innerHTML = '<p class="no-data">No resources found.</p>'; return; }
  grid.innerHTML = list.map(r => `<div class="resource-card" onclick="expandResource(this)">
    <div class="rc-icon">${r.icon}</div>
    <div class="rc-tag">${r.tag}</div>
    <div class="rc-title">${r.title}</div>
    <p class="rc-desc">${r.desc}</p>
  </div>`).join('');
}

function expandResource(el) {
  showToast('Opening resource... 📚');
}

// ---- BREATHING ----
const TECHNIQUES = {
  box: { name: 'Box Breathing', desc: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Used by Navy SEALs to calm stress.', phases: [{ l: 'Inhale', d: 4, c: 'inhale' }, { l: 'Hold', d: 4, c: 'hold' }, { l: 'Exhale', d: 4, c: 'exhale' }, { l: 'Hold', d: 4, c: 'hold' }] },
  '478': { name: '4-7-8 Breathing', desc: 'Inhale 4s → Hold 7s → Exhale 8s. Helps activate the relaxation response quickly.', phases: [{ l: 'Inhale', d: 4, c: 'inhale' }, { l: 'Hold', d: 7, c: 'hold' }, { l: 'Exhale', d: 8, c: 'exhale' }] },
  calm: { name: 'Calm Down', desc: 'Inhale 4s → Exhale 6s. Extended exhale activates the parasympathetic nervous system.', phases: [{ l: 'Inhale', d: 4, c: 'inhale' }, { l: 'Exhale', d: 6, c: 'exhale' }] }
};

let breatheState = { running: false, tech: 'box', phase: 0, count: 0, cycles: 0, interval: null };

function initBreathing() { selectTech(document.querySelector('.tech-btn.active'), 'box'); }

function selectTech(btn, tech) {
  stopBreathe();
  document.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  breatheState.tech = tech;
  document.getElementById('breathe-desc').textContent = TECHNIQUES[tech].desc;
  document.getElementById('breath-instruction').textContent = 'Press Start';
  document.getElementById('breath-count').textContent = '';
  document.getElementById('breathe-btn').textContent = '▶ Start';
  document.getElementById('breathe-cycle').textContent = '';
  document.getElementById('breath-ring').className = 'breath-ring';
}

function toggleBreathe() {
  if (breatheState.running) { stopBreathe(); } else { startBreathe(); }
}

function startBreathe() {
  breatheState.running = true;
  breatheState.phase = 0;
  breatheState.count = 0;
  breatheState.cycles = 0;
  document.getElementById('breathe-btn').textContent = '⏹ Stop';
  runPhase();
}

function stopBreathe() {
  breatheState.running = false;
  clearInterval(breatheState.interval);
  clearTimeout(breatheState.timeout);
  document.getElementById('breath-instruction').textContent = 'Press Start';
  document.getElementById('breath-count').textContent = '';
  document.getElementById('breathe-btn').textContent = '▶ Start';
  document.getElementById('breathe-cycle').textContent = '';
  document.getElementById('breath-ring').className = 'breath-ring';
}

function runPhase() {
  if (!breatheState.running) return;
  const tech = TECHNIQUES[breatheState.tech];
  const phase = tech.phases[breatheState.phase];
  const ring = document.getElementById('breath-ring');
  ring.className = 'breath-ring ' + phase.c;
  document.getElementById('breath-instruction').textContent = phase.l;

  let remaining = phase.d;
  document.getElementById('breath-count').textContent = remaining;

  breatheState.interval = setInterval(() => {
    remaining--;
    document.getElementById('breath-count').textContent = remaining > 0 ? remaining : '';
    if (remaining <= 0) {
      clearInterval(breatheState.interval);
      breatheState.phase = (breatheState.phase + 1) % tech.phases.length;
      if (breatheState.phase === 0) {
        breatheState.cycles++;
        document.getElementById('breathe-cycle').textContent = `Cycle ${breatheState.cycles} complete 🌿`;
      }
      breatheState.timeout = setTimeout(runPhase, 300);
    }
  }, 1000);
}

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ---- SUPABASE TABLE SETUP HELPER ----
// Run in Supabase SQL editor to create necessary tables:

