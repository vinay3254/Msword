const router = require('express').Router();
const auth = require('../middleware/auth');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:397b-cloud';

const ai = async (systemPrompt, userPrompt) => {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await response.json();
  return data.message?.content || '';
};

// Autocomplete
router.post('/autocomplete', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'You are a writing assistant. Continue the text naturally. Return ONLY the continuation, no explanation, no quotes. Keep it concise (1-2 sentences max).',
      `Continue this text: ${text}`
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rewrite
router.post('/rewrite', auth, async (req, res) => {
  try {
    const { text, tone } = req.body;
    const result = await ai(
      `You are a writing assistant. Rewrite the given text in a ${tone || 'professional'} tone. Return ONLY the rewritten text, no explanation.`,
      text
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Summarize
router.post('/summarize', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'You are a writing assistant. Summarize the given text concisely. Return ONLY the summary.',
      text
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Expand
router.post('/expand', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'You are a writing assistant. Expand the given text or bullet points into full paragraphs. Return ONLY the expanded text.',
      text
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fix grammar
router.post('/fix-grammar', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'You are a grammar expert. Fix all grammar, spelling, and punctuation errors. Return ONLY the corrected text, preserve formatting.',
      text
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Translate
router.post('/translate', auth, async (req, res) => {
  try {
    const { text, language } = req.body;
    const result = await ai(
      `You are a translator. Translate the given text to ${language}. Return ONLY the translated text.`,
      text
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, type } = req.body;
    const result = await ai(
      `You are a document writing assistant. Generate a complete ${type || 'document'} based on the given prompt. Return well-formatted HTML with proper headings, paragraphs, and lists. Return ONLY the HTML, no markdown fences.`,
      prompt
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { question, documentContent, history } = req.body;

    const messages = [
      {
        role: 'system',
        content: `You are a helpful writing assistant. The user is working on a document. Here is the document content (first 3000 chars): ${(documentContent || '').slice(0, 3000)}`
      },
      ...(history || []).slice(-10),
      { role: 'user', content: question }
    ];

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages,
      }),
    });

    if (!response.ok) throw new Error('Ollama request failed');
    const data = await response.json();
    res.json({ result: data.message?.content || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Proofread
router.post('/proofread', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'You are a proofreader. Analyze the text and return a JSON array of suggestions. Each item must have: { type: "grammar"|"style"|"clarity", original: "...", suggestion: "...", explanation: "..." }. Return ONLY a valid JSON array. No markdown, no backticks, no explanation.',
      text
    );
    let suggestions = [];
    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = [];
    }
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Readability
router.post('/readability', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await ai(
      'Analyze the readability of the given text. Return ONLY a JSON object with these exact fields: { "score": 0-100, "level": "Elementary|Middle School|High School|College|Expert", "avgSentenceLength": number, "avgWordLength": number, "suggestions": ["..."] }. No markdown, no backticks, just raw JSON.',
      text
    );
    let data = { score: 0, level: 'Unknown', avgSentenceLength: 0, avgWordLength: 0, suggestions: [] };
    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      // use defaults
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
