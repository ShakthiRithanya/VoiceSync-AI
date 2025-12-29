# 🎙️ VoiceSync AI - Intelligent Task Assistant

VoiceSync AI is a cutting-edge, voice-controlled task management system that leverages Advanced AI to turn natural speech into structured, actionable items. Built with a focus on high-precision timing and high-end aesthetics.

## Features

- Natural Language Extraction: Speak naturally and let the AI handle the structure.
- Mathematical Precision: Custom server-side engine for second-accurate relative time calculation handles 70s, 90s, 120s+ conversions perfectly.
- Smart Sorting: Tasks are automatically prioritized in ascending order—your next immediate task is always at the top.
- Multi-Layer Notifications: 
  - Desktop push notifications.
  - High-fidelity audio alerts.
  - Full-screen Visual Overdraw overlay fallbacks.
- Glassmorphism UI: A premium, dark-mode focused interface with smooth animations and dynamic pulses.
- Persistence: Your tasks stay saved in LocalStorage, so you never lose your progress even after a refresh.

## Tech Stack

- Frontend: Vanilla JS (ES6+), CSS3 (Custom Variables/Animations), HTML5.
- Backend: Node.js, Express.js.
- AI Brain: Groq SDK using llama-3.1-8b-instant.
- Speech Integration: Native Web Speech API.

## Installation

1. Clone the repository:
   bash
   git clone https://github.com/ShakthiRithanya/VoiceSync-AI.git
   
2. Install dependencies:
   bash
   npm install
   
3. Create a .env file in the root and add your Groq API Key:
   env
   GROQ_API_KEY=your_actual_api_key_here
   PORT=3001
   
4. Run the app:
   bash
   npm start
   

## How to Use
1. Tap the Microphone: Grant permission and speak your task.
2. Precision Commands: Remind me to [Task] in [X] seconds/minutes/hours.
3. Manage: Use the Magic Wand icon for a quick 5-second stress test or the Bell icon to test your notification system.
4. Dismiss: Click "Dismiss Reminder" when an alert rings to automatically wipe the task from your board.

Created with ❤️ by VoiceSync AI - 2025
