const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files from root

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : undefined,
});

const SYSTEM_PROMPT = `You are a task extraction engine for a voice‑controlled task board.  
The user speaks naturally about things they need to do, possibly mixing multiple tasks in one sentence.  
Your job is to convert that text into a clean list of structured tasks.

Always follow these rules:
1. Output ONLY valid JSON. No explanations, no markdown, no extra text.  
2. Use this exact schema:

{
  "tasks": [
    {
      "title": "string",
      "due_date": "YYYY-MM-DD or null",
      "due_time": "HH:mm:ss or null",
      "relative_seconds": "number or null (use this for 'in X seconds/minutes')",
      "priority": "low" | "medium" | "high" | "urgent",
      "tags": ["string"],
      "notes": "string"
    }
  ]
}

3. Split the input into multiple tasks if it contains more than one thing to do.  
4. Relative Time:
   - If the user says "in 80 seconds", "in 2 minutes", etc., capture the TOTAL number of seconds in "relative_seconds".
   - You do NOT need to calculate the final HH:mm:ss yourself anymore. Just provide the raw "relative_seconds" and the server will do the precise math.
5. Infer reasonable dates:
   - “today” → today’s date  
   - “tomorrow” → tomorrow’s date  
   - If the date is unclear, set "due_date": null.  
6. Infer priority:
   - Deadlines, exams → high/urgent. Routine → medium/low.
7. Tags: 1-4 short tags.
8. Notes: Original sentence fragment.

If the user text does not contain any actionable task, return:
{ "tasks": [] }`;

app.post('/api/extract-tasks', async (req, res) => {
    const { transcript, current_time } = req.body;

    if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
    }

    // Use time from frontend if available, otherwise server time
    const referenceTime = current_time || {
        date: new Date().toLocaleDateString('en-CA'),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' })
    };

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT + `\n\nContext for date/time calculation:
Current Local Date: ${referenceTime.date} (YYYY-MM-DD)
Current Local Time: ${referenceTime.time} (HH:mm:ss)
Current Day of Week: ${referenceTime.day}`,
                },
                {
                    role: 'user',
                    content: transcript,
                },
            ],
            model: 'llama-3.1-8b-instant', // Updated from decommissioned model
            temperature: 0,
            stream: false,
            response_format: { type: 'json_object' },
        });

        const responseContent = chatCompletion.choices[0].message.content;
        const data = JSON.parse(responseContent);

        // Precise Math Enhancement in Code
        if (data.tasks) {
            data.tasks = data.tasks.map(task => {
                if (task.relative_seconds) {
                    // Use the reference time from the frontend to start the clock
                    const start = current_time ? new Date(`${current_time.date}T${current_time.time}`) : new Date();
                    const future = new Date(start.getTime() + (task.relative_seconds * 1000));

                    task.due_date = future.toISOString().split('T')[0];
                    task.due_time = future.toTimeString().split(' ')[0];
                }
                return task;
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Error calling Groq:', error);
        let message = 'Failed to extract tasks';
        if (error.status === 401 || error.message?.includes('Invalid API Key')) {
            message = 'Invalid or missing GROQ_API_KEY in .env file. Please check your API key.';
        } else if (error.message) {
            message = error.message;
        }
        res.status(error.status || 500).json({ error: message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
