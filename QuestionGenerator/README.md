# Question Paper Generator (Gemini + Bloom’s Taxonomy)

Generate complete, structured question papers (with answers and Bloom’s Taxonomy tagging) using Google’s Gemini models. The project provides a React UI for configuring exam parameters and a Node/Express backend that calls the Generative Language API to produce a JSON question paper, which can then be previewed, saved to a question bank, and exported to PDF.

## Abstract

This project automates the creation of academic question papers based on user-defined parameters such as subject, syllabus coverage, difficulty, exam type, section structure, and a required distribution across Bloom’s Taxonomy levels. A web interface collects the criteria and sends them to a backend service that prompts Google Gemini to return a strictly formatted JSON paper including questions, options (for MCQs), answers, and a short justification for each question’s Bloom’s level classification. The generated paper can be previewed and exported as PDF, improving speed, consistency, and cognitive-level coverage compared to manual paper setting.

## Problem Statement

Creating balanced examination papers is time-consuming and requires:

- **Consistent difficulty and coverage**
- **A deliberate distribution across cognitive levels (Bloom’s Taxonomy)**
- **Answer keys and clear marking schemes**

Manual paper creation often results in uneven coverage and significant effort.

## Objectives

- **Automate paper generation** from structured inputs.
- **Enforce Bloom’s Taxonomy distribution** across the overall paper.
- Produce **machine-readable JSON** output containing:
  - `questionText`
  - `options` (for MCQ)
  - `answer`
  - `difficulty`
  - `cognitiveCategory` and `categoryReasoning`
- Provide a UI to:
  - Configure exam parameters and sections
  - Save papers to a question bank
  - Export question paper and answer key as PDFs

## Key Features

- **Criteria-driven generation**
  - Subject, topic/chapter, syllabus, exam type, difficulty, duration, institution name
- **Section-based paper design**
  - Multiple sections with question type, number of questions, and marks per question
- **Bloom’s Taxonomy control**
  - Slider-based percentage distribution that must sum to 100%
- **Answer key generation**
  - Every question includes an `answer`
- **Bloom’s reasoning**
  - Every question includes `categoryReasoning`
- **PDF export**
  - Exports question paper PDF and answer key PDF
- **Question bank support**
  - Save and retrieve generated papers (MongoDB if configured; backend can fall back to in-memory mode)

## Tech Stack

### Frontend

- React (Vite)
- React Router
- Fetch API
- jsPDF + jspdf-autotable (PDF export)

### Backend

- Node.js
- Express
- Google Generative Language API (Gemini) via REST `v1` endpoint
- Mongoose (optional persistence)

### Database

- MongoDB Atlas (optional)

## Tools Used

- VS Code / IDE
- Node.js runtime
- npm
- Google AI Studio (Gemini API key)
- MongoDB Atlas (optional)

## System Design (High Level)

1. User configures paper criteria in the UI.
2. Frontend sends a POST request to the backend `/api/generate`.
3. Backend constructs a strict prompt that mandates JSON output.
4. Backend calls Gemini (`generateContent`).
5. Backend parses the model output into JSON.
6. Frontend previews the paper and provides save/export actions.

## API Endpoints

- **`GET /api/health`**
  - Health check.
- **`GET /api/generate/test`**
  - Verifies Gemini connectivity.
- **`POST /api/generate`**
  - Generates a paper (JSON response).
- **`GET /api/generate/models`**
  - Lists available Gemini models for the configured API key.
- **`GET /api/papers`, `POST /api/papers`, `DELETE /api/papers/:id`**
  - Question bank operations.
- **`GET /api/criteria`, `POST /api/criteria`, `DELETE /api/criteria/:id`**
  - Criteria templates (Bloom’s + section presets).

## Setup & Run (From Scratch)

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Gemini API key (Google AI Studio)
- (Optional) MongoDB Atlas connection string

### Backend Setup

In one terminal:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Use any model returned by: GET /api/generate/models
# Recommended default:
GEMINI_MODEL=gemini-2.5-flash

PORT=5000

# Optional (if omitted or connection fails, backend may fall back to in-memory mode)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

Run backend:

```bash
npm start
```

Backend runs at:

- `http://localhost:5000`

Test Gemini:

- `http://localhost:5000/api/generate/test`

List available models:

- `http://localhost:5000/api/generate/models`

### Frontend Setup

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

- `http://localhost:5173`

Vite is configured to proxy `/api` to the backend at `http://localhost:5000`.

## Usage

1. Open the app in the browser.
2. Fill exam details (subject is required).
3. Configure sections (MCQ/Short/Long/True-False/Fill-in-the-blanks).
4. Adjust Bloom’s distribution (must total 100%).
5. Click **Generate Question Paper**.
6. Preview the paper, then:
   - Save to bank
   - Download Question Paper PDF
   - Download Answer Key PDF

## Methodology / Implementation Notes

- A strict prompt is used to force **JSON-only** output.
- The backend strips code fences if the model returns them.
- The backend validates the response by attempting `JSON.parse`.
- The frontend includes robust handling of non-JSON/empty responses to surface backend errors.

## Results

- Successfully generates a structured paper with:
  - Multiple sections
  - Correct marking breakdown
  - Answers for every question
  - Bloom’s Taxonomy tag + brief reasoning for every question
- Produces PDF exports suitable for printing.

## Conclusion

The Question Paper Generator demonstrates how LLMs can assist educators by producing complete examination papers quickly while maintaining pedagogical structure through Bloom’s Taxonomy. It reduces manual effort, improves consistency, and supports rapid iteration on paper designs.

## Future Enhancements

- Add rubric/marking scheme generation for descriptive answers
- Add difficulty calibration via item analysis and historical performance
- Add user authentication and multi-user paper banks
- Add streaming generation and partial previews
- Add server-side schema validation for stronger guarantees

## Security Notes (Important)

- Never commit `.env` files.
- If an API key is exposed, rotate it immediately.
- Avoid pasting keys in screenshots/logs.
