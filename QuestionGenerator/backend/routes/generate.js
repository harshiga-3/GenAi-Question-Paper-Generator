const express = require('express');
const router = express.Router();
const https = require('https');
const { URL } = require('url');

console.log('✅ Loaded generate routes (rest-v1)');

// Default Bloom's taxonomy distribution (percentages)
const DEFAULT_BLOOMS = {
  Knowledge: 20,
  Understanding: 25,
  Application: 25,
  Analysis: 15,
  Evaluation: 10,
  Creation: 5
};

function postJson(urlString, bodyObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = JSON.stringify(bodyObj);

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getText(urlString) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function generateContentViaRest({ apiKey, modelName, prompt }) {
  const normalizedModel = (modelName || '').trim().replace(/^models\//i, '');
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(normalizedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  const { status, body } = await postJson(endpoint, payload);
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    const snippet = body && body.length > 500 ? `${body.slice(0, 500)}...` : body;
    const err = new Error(`Gemini returned non-JSON response (HTTP ${status}). ${snippet || ''}`.trim());
    err.status = status;
    throw err;
  }

  if (status < 200 || status >= 300) {
    const msg = parsed?.error?.message || `Gemini request failed (HTTP ${status})`;
    const err = new Error(msg);
    err.status = status;
    throw err;
  }

  const text =
    parsed?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join('') ||
    '';

  return { text, raw: parsed };
}

// Build the structured prompt for Gemini
function buildPrompt({ subject, topic, syllabus, difficulty, examType, sections, bloomsDistribution }) {
  const blooms = bloomsDistribution || DEFAULT_BLOOMS;

  const bloomsInstructions = Object.entries(blooms)
    .filter(([, pct]) => pct > 0)
    .map(([cat, pct]) => `  - ${cat}: approximately ${pct}% of total marks`)
    .join('\n');

  const sectionInstructions = sections.map(sec => {
    const typeLabel = {
      mcq: 'Multiple Choice Questions (MCQ)',
      short: 'Short Answer Questions',
      long: 'Long Answer Questions',
      truefalse: 'True or False',
      fillblank: 'Fill in the Blanks'
    }[sec.questionType] || sec.questionType;
    return `  - Section "${sec.name}": ${sec.count} ${typeLabel}, ${sec.marksEach} mark(s) each`;
  }).join('\n');

  return `
You are an expert academic examination paper creator with deep knowledge of educational assessment and Bloom's Taxonomy.

Generate a complete question paper for the following:
- Subject: ${subject}
- Topic/Chapter: ${topic || 'All Topics'}
- Syllabus Coverage: ${syllabus || 'Standard curriculum'}
- Exam Type: ${examType || 'Unit Test'}
- Difficulty: ${difficulty || 'Medium'}

Cognitive Level Distribution (Bloom's Taxonomy) — ensure questions across sections collectively follow these proportions:
${bloomsInstructions}

Sections required:
${sectionInstructions}

CRITICAL RULES:
1. For EVERY question, you MUST assign a "cognitiveCategory" from exactly one of: Knowledge, Understanding, Application, Analysis, Evaluation, Creation
2. For EVERY question, you MUST provide "categoryReasoning" — a 1-2 sentence explanation of WHY this question belongs to that Bloom's level.
3. For EVERY question, you MUST provide a complete "answer" (the answer key).
4. MCQ options must be an array of exactly 4 strings labeled A, B, C, D. The answer field should be the correct option letter + text, e.g. "A) Photosynthesis".
5. For True/False, options should be ["True", "False"].
6. For Fill in the Blanks, the question must contain "______" as the blank.
7. Questions must be unique, educationally sound, and appropriate for the subject and difficulty.
8. Do NOT repeat questions.

Return ONLY a valid JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "paperTitle": "string — formatted paper title",
  "sections": [
    {
      "name": "Section A",
      "description": "MCQ (10 × 1 = 10 Marks)",
      "questionType": "mcq",
      "marksPerQuestion": 1,
      "totalQuestions": 10,
      "totalMarks": 10,
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "string",
          "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
          "answer": "A) correct option",
          "marks": 1,
          "difficulty": "Easy|Medium|Hard",
          "cognitiveCategory": "Knowledge",
          "categoryReasoning": "This question requires the student to recall..."
        }
      ]
    }
  ]
}
`;
}

// GET /api/generate/test — verify API key is working
router.get('/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in .env' });
  }

  try {
    const result = await generateContentViaRest({
      apiKey,
      modelName,
      prompt: 'Say "API OK" and nothing else.',
    });
    const text = result.text;
    res.json({ success: true, response: text.trim(), keyPrefix: apiKey.substring(0, 8) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/generate/models — list available models for this API key
router.get('/models', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in .env' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
    const { status, body } = await getText(endpoint);
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      const snippet = body && body.length > 500 ? `${body.slice(0, 500)}...` : body;
      return res.status(500).json({ error: `Models list returned non-JSON (HTTP ${status}). ${snippet || ''}`.trim() });
    }

    if (status < 200 || status >= 300) {
      return res.status(status).json({ error: parsed?.error?.message || `List models failed (HTTP ${status})` });
    }

    const models = (parsed?.models || []).map((m) => ({
      name: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods,
    }));

    res.json({ success: true, models });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list models' });
  }
});

// POST /api/generate
router.post('/', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in backend/.env' });
  }

  try {
    const {
      subject,
      topic,
      syllabus,
      difficulty,
      examType,
      institution,
      duration,
      sections,
      bloomsDistribution
    } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!sections || sections.length === 0) {
      return res.status(400).json({ error: 'At least one section must be defined.' });
    }

    const prompt = buildPrompt({ subject, topic, syllabus, difficulty, examType, sections, bloomsDistribution });

    const result = await generateContentViaRest({ apiKey, modelName, prompt });
    const rawText = result.text;

    // Strip markdown code fences if present
    const jsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let paperData;
    try {
      paperData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:', rawText.substring(0, 500));
      return res.status(500).json({
        error: 'AI returned invalid JSON. Please try again.',
        rawResponse: rawText.substring(0, 500)
      });
    }

    // Calculate total marks
    const totalMarks = (paperData.sections || []).reduce((sum, sec) => sum + (sec.totalMarks || 0), 0);

    // Attach meta
    const finalPaper = {
      ...paperData,
      subject,
      topic,
      syllabus,
      examType,
      difficulty,
      institution: institution || '',
      duration: duration || '3 Hours',
      totalMarks,
      bloomsDistribution: bloomsDistribution || DEFAULT_BLOOMS,
      createdAt: new Date().toISOString()
    };

    res.json({ success: true, paper: finalPaper });
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed. Check your API key.' });
  }
});

module.exports = router;
