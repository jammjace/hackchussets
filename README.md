# Na(h) — AI-Powered Sodium Tracking
**Live Demo:** [Open Na(h)](https://nah-web.vercel.app/)
**See what goes into your food. Know how much sodium goes into your body.**

Na(h) is an AI-powered cooking assistant that helps users understand their sodium intake through cooking videos. By combining computer vision, multimodal AI, and nutritional analysis, Na(h) makes it easier to track ingredients without manually recording every addition.

**Hackachusetts 2026 | Healthcare & Biotech**

## The Problem

Tracking sodium intake is difficult, especially when preparing meals at home.

Traditional nutrition apps require users to manually enter ingredients and estimate quantities. During cooking, ingredients such as salt, oil, and seasonings are often added without precise measurements.

This makes it difficult to understand how much sodium a home-cooked meal contains.

## Our Solution

Na(h) uses AI to analyze cooking footage, identify ingredients, estimate quantities, and calculate their potential sodium contributions.

Our system combines three components:

1. **Computer Vision:** OpenCV extracts video frames and identifies relevant cooking intervals.
2. **AI Ingredient Analysis:** Qwen3-VL identifies ingredient additions and estimates their quantities.
3. **Sodium Analytics:** A Python calculation engine converts ingredient quantities into estimated sodium contributions.

The results are presented through an interactive dashboard that helps users understand their cooking habits.

## Key Features

### AI-Powered Ingredient Detection

Uses Qwen3-VL-2B-Instruct to identify ingredients being added during cooking.

### Quantity Estimation

Analyzes sequential video frames to estimate ingredient quantities and identify when additions occur.

### Sodium Tracking

Calculates estimated sodium contributions using an ingredient database and unit conversions.

### Interactive Cooking Timeline

Displays ingredient additions chronologically, allowing users to explore what was added and when.

### Nutritional Dashboard

Visualizes estimated sodium intake, ingredient contributions, and potential dietary concerns.

### Uncertainty Awareness

Flags ingredients with unknown quantities or incomplete sodium calculations instead of presenting misleading totals.

## Try Na(h)

Experience our interactive web application without needing to install anything.

### Try Our Demo 

1. Open the application.
2. Click **Start cooking**.
3. Navigate to **Upload**.
4. Select **"I have no video, try demo"**.
5. Explore the ingredient timeline and sodium dashboard.

You can review detected ingredients, estimated quantities, sodium contributions, and cooking events.

**Demo note:** The hosted prototype uses previously generated Qwen3-VL analysis to demonstrate the product experience. Uploaded videos in this deployment do not undergo new AI inference, and the displayed analysis does not depend on the uploaded video's contents.

### What to Explore

- Ingredient identification and quantity estimates
- Timestamped cooking events
- Estimated sodium contributions
- Cumulative sodium visualizations
- Warnings for incomplete nutritional information

## How It Works

```text
Cooking Video
     |
     v
OpenCV Frame Extraction
     |
     v
Qwen3-VL Ingredient Detection
     |
     v
Ingredient Quantity Estimation
     |
     v
Structured Ingredient Events
     |
     v
Python Sodium Calculation Engine
     |
     v
Interactive Na(h) Dashboard
```

### AI Processing

Our ingredient-analysis pipeline uses Qwen3-VL-2B-Instruct to identify ingredient additions from video frames.

The system examines chronological frames, estimates quantities over individual intervals, and aggregates predictions into timestamped ingredient events.

We tested this pipeline using GPU inference on Kaggle, including processing a 40-second cooking video in four 10-second segments.

The resulting ingredient predictions are converted into structured data for nutritional analysis.

### Sodium Analysis

The sodium engine matches identified ingredients to a pantry database, performs supported unit conversions, and calculates estimated sodium contributions.

Unknown ingredients or uncertain quantities are flagged to avoid presenting incomplete information as definitive nutritional measurements.

## Technology Stack

| Component | Technology |
|---|---|
| AI Model | Qwen3-VL-2B-Instruct |
| Computer Vision | OpenCV |
| Machine Learning | PyTorch, Hugging Face Transformers |
| Backend | Python, FastAPI |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Nutritional Processing | Python sodium calculation engine |
| Model Experimentation | Kaggle GPU |
| Development | Kiro, VS Code, GitHub |
| Web Deployment | Vercel |

## Project Architecture

The application consists of three integrated modules.

**Module A — Ingredient Detection**

Processes cooking footage and generates timestamped ingredient predictions using computer vision and multimodal AI.

**Module B — Sodium Calculation**

Converts ingredient predictions into estimated sodium contributions using ingredient reference data and quantity conversions.

**Module C — Web Application**

Provides video upload functionality, cooking-session navigation, ingredient timelines, and nutritional visualizations.

The modules communicate through structured JSON data and FastAPI endpoints.

## Running Locally

### Prerequisites

- Python
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/jammjace/hackchussets.git
cd hackchussets
git switch demo
```

### 2. Start the backend

```bash
cd backend
python -m pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
$env:SERVERLESS_DEMO = "true"
python -m uvicorn app:app --reload --port 8000
```

The backend should be available at:

`http://localhost:8000/api/health`

### 3. Start the frontend

Open another terminal:

```bash
cd web
npm install
npm run dev
```

For local development, configure the frontend API base URL as:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_DEPLOYMENT_MODE=public_demo
```

Restart the frontend after changing environment variables.

Open:

`http://localhost:3000`

### 4. Explore the Demo

Select **Start cooking → Upload → I have no video, try demo** to explore the application.

## Development With Kiro

We used Kiro as part of our development workflow to support codebase exploration, implementation, and integration.

Kiro helped us work across the Python backend and Next.js frontend, refine implementation details, and prepare the application for demonstration.

The repository includes project development artifacts documenting our implementation.

## Testing

Our development workflow included automated testing for ingredient detection, JSON processing, backend APIs, sodium calculations, and frontend behavior.

The application was also tested through local end-to-end interactions and production build validation.

For development and testing instructions, see the documentation within the `backend/`, `web/`, and project test directories.

## Limitations and Future Improvements

Na(h) is a hackathon prototype designed to demonstrate the potential of AI-assisted nutritional tracking.

Current limitations include:

- Ingredient quantities are visually estimated rather than physically measured.
- Some ingredients cannot be identified reliably from footage alone.
- Unknown quantities can result in incomplete sodium totals.
- The public demonstration uses prerecorded AI analysis.
- Video-based nutrition estimates should not be treated as clinical measurements.

Future improvements include scalable video inference, better ingredient quantity calibration, expanded nutritional reference data, and broader cooking-video evaluation.

## Repository

**GitHub:** https://github.com/jammjace/hackchussets

## Acknowledgments

- **Qwen3-VL** — Multimodal ingredient analysis
- **OpenCV** — Video processing
- **Hugging Face** — Model tooling
- **Kaggle** — GPU experimentation
- **Kiro** — AI-assisted development
- **Hackachusetts** — Hackathon

---

**Disclaimer:** Na(h) provides estimated nutritional information for educational and demonstration purposes. It is not a medical device or a substitute for professional nutritional or medical advice.
