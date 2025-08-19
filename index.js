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

// ✅ Store full conversation as an array
let conversationHistory = [
  {
    role: "system",
    content: "You are NemesisAI 💀 — a ruthless debate expert. Always reply in 2-3 short, punchy, aggressive bullet points."
  }
];

app.get('/', (req, res) => {
  res.send("NemesisAI backend is running 🚀");
});


app.post('/debate', async (req, res) => {
  const { belief, category } = req.body;

  // Push user belief into history
  conversationHistory.push({
    role: "user",
    content: `Category: ${category || 'Random'}\nUser belief: ${belief}`
  });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // API key from .env
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Or try "mixtral-8x7b-32768"
        messages: conversationHistory,
        temperature: 0.8,
        max_tokens: 300
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0].message) {
      console.log('❌ Missing response from Groq');
      return res.status(500).json({ reply: ['Nemesis is confused. Try again.'] });
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
    res.status(500).json({ reply: ['Nemesis crashed. Try again later.'] });
  }
});

app.listen(PORT, () => {
  console.log(`NemesisAI backend running on http://localhost:${PORT}`);
});
