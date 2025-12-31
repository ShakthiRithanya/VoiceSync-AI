document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('micBtn');
    const statusText = document.getElementById('statusText');
    const transcriptText = document.getElementById('transcriptText');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const testNotifyBtn = document.getElementById('testNotifyBtn');
    const simulateBtn = document.getElementById('simulateBtn');

    let isListening = false;
    let recognition;
    let tasks = JSON.parse(localStorage.getItem('antiGravityTasks') || '[]');

    // Initialize
    renderAllTasks();

    // Register Service Worker for Background Notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered', reg))
            .catch(err => console.error('Service Worker Registration Failed', err));
    }

    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // 1. Digital Clock & PROACTIVE Reminder Loop
    setInterval(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;

        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');

        const currentTime = `${h}:${m}:${s}`;
        currentTimeDisplay.textContent = currentTime; // Explicitly set textContent

        let updated = false;

        tasks.forEach(task => {
            if (!task.reminded && task.due_date === currentDate) {
                // If no time is specified, it triggers immediately on that day
                let taskTime = "00:00:00";
                if (task.due_time) {
                    taskTime = task.due_time.split(':').length === 2 ? task.due_time + ':00' : task.due_time;
                }

                // If current time is AT or PAST the task time, trigger it
                if (currentTime >= taskTime) {
                    console.log(`%c[REMINDER TRIGGERED] ${task.title} at ${currentTime} (Due: ${taskTime})`, "background: #222; color: #bada55; padding: 2px 5px;");
                    showNotification(task);
                    task.reminded = true;
                    updated = true;
                }
            }
        });

        if (updated) {
            saveTasks();
            renderAllTasks();
        }
    }, 1000);

    // 2. Test Notification Button
    testNotifyBtn.addEventListener('click', () => {
        showNotification({ title: "System Check: Notifications Active!", priority: "low" });
    });

    // 3. Simulate Task (Add a task for 5 SECONDS FROM NOW)
    simulateBtn.addEventListener('click', () => {
        const future = new Date(Date.now() + 5000); // 5 seconds in future
        const year = future.getFullYear();
        const month = String(future.getMonth() + 1).padStart(2, '0');
        const day = String(future.getDate()).padStart(2, '0');
        const h = String(future.getHours()).padStart(2, '0');
        const m = String(future.getMinutes()).padStart(2, '0');
        const s = String(future.getSeconds()).padStart(2, '0');

        const testTask = {
            id: 'sim-' + Date.now(),
            title: "Simulated Low Priority Task",
            due_date: `${year}-${month}-${day}`,
            due_time: `${h}:${m}:${s}`,
            priority: 'low',
            tags: ['test', 'low-priority'],
            notes: 'Testing low priority notification',
            reminded: false
        };

        tasks.unshift(testTask);
        saveTasks();
        renderAllTasks();
        statusText.innerText = "Task added! It will trigger in 10 seconds.";
    });

    // 4. Notification Engine (With Fallback Alert)
    async function showNotification(task) {
        // 1. Browser Notification (Service Worker Based for Background Support)
        if (Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    registration.showNotification('VoiceSync AI Task', {
                        body: `${task.title} (Priority: ${task.priority})`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
                        badge: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png', // Small icon for status bar
                        tag: task.id,
                        requireInteraction: true,
                        vibrate: [200, 100, 200, 100, 200], // Mobile vibration pattern
                        silent: false
                    });
                } else {
                    new Notification('VoiceSync AI Task', {
                        body: `${task.title} (${task.priority})`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png'
                    });
                }
            } catch (e) {
                console.error("Notification failed", e);
            }
        }

        // 2. Audio Alert (With retry)
        const playSound = () => {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => {
                console.warn("Sound play failed, retrying on next interaction:", e);
            });
        };
        playSound();

        // 3. Visual Fullscreen Overlay (The ultimate fallback)
        // Remove any existing ones first to avoid stacking
        const existing = document.querySelector('.visual-reminder-overlay');
        if (existing) existing.remove();

        const alertBox = document.createElement('div');
        alertBox.className = 'visual-reminder-overlay';
        alertBox.innerHTML = `
            <div class="reminder-content">
                <i class="fas fa-bell"></i>
                <div class="priority-badge">${task.priority.toUpperCase()}</div>
                <h3>TASK REMINDER</h3>
                <p>${task.title}</p>
                <div class="reminder-time">Scheduled for: ${task.due_time}</div>
                <button id="dismissBtn">Dismiss Reminder</button>
            </div>
        `;
        document.body.appendChild(alertBox);

        // Add dismiss listener
        alertBox.querySelector('#dismissBtn').onclick = () => {
            alertBox.remove();
            window.deleteTask(task.id);
        };
    }

    // 5. Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            statusText.innerText = 'Listening...';
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            transcriptText.innerText = final || interim;
        };

        recognition.onend = () => {
            const endTime = new Date(); // Precise time when user stopped speaking
            stopListening();
            const text = transcriptText.innerText;
            if (text && text.length > 5) processTranscript(text, endTime);
        };
    }

    micBtn.addEventListener('click', () => {
        // Essential: First click 'unlocks' audio for the browser
        notificationSound.play().then(() => {
            notificationSound.pause();
            notificationSound.currentTime = 0;
        }).catch(() => { });

        if (!isListening) {
            if (Notification.permission !== 'granted') Notification.requestPermission();
            startListening();
        } else {
            stopListening();
        }
    });

    function startListening() { transcriptText.innerText = ''; recognition.start(); }
    function stopListening() { isListening = false; micBtn.classList.remove('listening'); statusText.innerText = 'Tap to Speak'; if (recognition) recognition.stop(); }

    async function processTranscript(transcript, endTime) {
        statusText.innerText = 'Extracting tasks...';
        try {
            const body = {
                transcript,
                current_time: endTime ? {
                    date: endTime.toLocaleDateString('en-CA'),
                    time: endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    day: endTime.toLocaleDateString('en-US', { weekday: 'long' })
                } : null
            };
            const response = await fetch('/api/extract-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            console.log("Extracted Tasks:", data.tasks);
            if (data.tasks) {
                const newTasks = data.tasks.map(t => ({
                    ...t,
                    id: Date.now() + Math.random().toString(36).substr(2, 5),
                    reminded: false
                }));
                tasks = [...newTasks, ...tasks];
                saveTasks();
                renderAllTasks();
                statusText.innerText = `Added ${newTasks.length} tasks!`;
            }
        } catch (e) {
            statusText.innerText = "Error extracting tasks.";
        }
    }

    function saveTasks() { localStorage.setItem('antiGravityTasks', JSON.stringify(tasks)); }

    function renderAllTasks() {
        taskList.innerHTML = '';
        const activeTasks = tasks.filter(t => !t.reminded);

        // Sort tasks: Soonest first (Ascending)
        activeTasks.sort((a, b) => {
            // Compare dates first
            const dateA = a.due_date || '9999-99-99';
            const dateB = b.due_date || '9999-99-99';
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            // If dates are equal, compare times
            const timeA = a.due_time || '23:59:59';
            const timeB = b.due_time || '23:59:59';
            return timeA.localeCompare(timeB);
        });

        taskCount.innerText = activeTasks.length;

        if (activeTasks.length === 0) {
            taskList.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><p>No active tasks.</p></div>';
            return;
        }

        activeTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card priority-${task.priority}`;
            card.innerHTML = `
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <div><i class="far fa-calendar-alt"></i> ${task.due_date || 'N/A'} ${task.due_time || ''}</div>
                    <div><i class="fas fa-flag"></i> ${task.priority}</div>
                </div>
                <div class="task-tags">${(task.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                <button class="delete-btn" onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
            `;
            taskList.appendChild(card);
        });
    }

    window.deleteTask = (id) => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderAllTasks();
    };
});
