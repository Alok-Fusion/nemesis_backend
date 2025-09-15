const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Use node-fetch for API calls
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Initial system prompt
let conversationHistory = [
  {
    role: "system",
    content: "You are NemesisAI 💀 — a ruthless debate expert. Always reply in 2-3 short, punchy, aggressive bullet points."
  }
];

// ✅ Health check route
app.get('/', (req, res) => {
  res.send("NemesisAI backend is running 🚀");
});

app.post('/debate', async (req, res) => {
  console.log("📥 Incoming body:", req.body);  // Debug log

  const { belief, category } = req.body;

  // Push user belief into history
  conversationHistory.push({
    role: "user",
    content: `Category: ${category || 'Random'}\nUser belief: ${belief}`
  });

  // ✅ Limit conversation history (avoid very large payloads)
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
    conversationHistory.unshift({
      role: "system",
      content: "You are NemesisAI 💀 — a ruthless debate expert. Always reply in 2-3 short, punchy, aggressive bullet points."
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // API key from Render env
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model:"llama-3.1-8b-instant", // "llama3-8b-8192", // Or try "mixtral-8x7b-32768"
        messages: conversationHistory,
        temperature: 0.8,
        max_tokens: 300
      }),
    });

    const data = await response.json();
    console.log("📡 Groq raw response:", data); // Debug log

    if (!data || !data.choices || !data.choices[0].message) {
      return res.status(500).json({
        reply: ['Nemesis is confused. Try again.'],
        error: data
      });
    }

    const rawResponse = data.choices[0].message.content;

    // Clean into bullet points
    const formatted = rawResponse
      .split(/\n|•|[-–—]/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Push Nemesis reply back into history
    conversationHistory.push({
      role: "assistant",
      content: formatted.join("\n")
    });

    console.log('🎯 Nemesis reply:', formatted);
    res.json({ reply: formatted });

  } catch (err) {
    console.error('🔥 Error from Groq:', err);
    res.status(500).json({
      reply: ['Nemesis crashed. Try again later.'],
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`NemesisAI backend running on http://localhost:${PORT}`);
});
