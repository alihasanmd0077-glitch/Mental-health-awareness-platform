# Mental-health-awareness-platform
The platform provides features such as a daily mood tracker, AI mental health assistant, meditation and breathing exercises, and educational articles about mental health conditions such as stress, anxiety, and depression.
# 🌿 MindSpace — Mental Health & Wellness Platform

A full-stack mental health awareness and well-being platform. **Works fully in demo mode (no backend needed).** Add Supabase + Gemini keys to unlock all features.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏡 **Dashboard** | Daily affirmations, mood quick-check, streak tracker, wellness tips |
| 💚 **Mood Tracker** | 1-10 scale slider, emotion tags, mood history, weekly chart |
| 📓 **Journal** | Guided prompts, rich text entries, mood tagging, browsable history |
| 🤖 **AI Support (Sage)** | Compassionate AI powered by Gemini 1.5 Flash |
| 🌐 **Community** | Anonymous posts, reactions, tags (anxiety/gratitude/vent/etc.) |
| 📚 **Learn** | 12 searchable evidence-based mental health resource cards |
| 🌬️ **Breathe** | Box Breathing, 4-7-8, and Calm Down animated guides |

---

## 🚀 Getting Started

### Option A: Demo Mode (No setup needed)
1. Open `index.html` in a browser
2. Click **"Continue as Guest (Demo)"**
3. All features work with local storage

### Option B: Full Stack (Supabase + Gemini)

#### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the SQL from the bottom of `app.js` (the comment block)
3. Get your **Project URL** and **Anon Key** from Settings → API

#### 2. Gemini API Key
1. Visit [aistudio.google.com](https://aistudio.google.com)
2. Create an API key for **Gemini 3 Flash**

#### 3. Configure in App
1. Open `index.html` in browser
2. Sign in or register, then click ⚙️ **Settings**
3. Enter your Supabase URL, Anon Key, and Gemini API key
4. Click **Save & Continue**

---

## 📁 File Structure

```
mindspace/
├── index.html      # Main HTML (all pages)
├── style.css       # Full CSS (calm green theme)
├── app.js          # All JavaScript logic
└── README.md       # This file
```

---

## 🗄️ Database Schema (Supabase)

```sql
profiles          — user display names
mood_logs         — score, emotions[], note, timestamp
journal_entries   — title, body, mood_tag, timestamp  
community_posts   — text, tag, anon_icon, likes
```

---

## 🎨 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Charts**: Chart.js
- **Backend**: Supabase (Auth + PostgreSQL + RLS)
- **AI**: Google Gemini 3 Flash (via REST API)
- **Fonts**: DM Serif Display + DM Sans (Google Fonts)
- **Theme**: Calm Green & White palette

---

## 🆘 Crisis Resources

The platform includes built-in crisis resources:
- **iCall (India)**: 9152987821
- **Vandrevala Foundation**: 1860-2662-345  
- **International**: [findahelpline.com](https://findahelpline.com)

---

> ⚠️ MindSpace and Sage (AI) are wellness tools, not medical devices or therapy substitutes. If you're in crisis, please reach out to a professional.
