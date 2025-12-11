📘 StudySphere — AI Powered Study Assistant

StudySphere is an AI-powered learning platform that helps students generate notes, create quizzes, take tests, and analyze performance — all from their own study material or uploaded PDFs.
It combines OCR + AI + full-stack development to deliver a complete digital study assistant.

🌍 Live Demo

🔗 https://studysphere-nzsb.vercel.app/

🚀 Features
✨ 1. AI Notes Generator

Upload any PDF (class notes, textbooks, PPTs, handwritten notes)

OCR automatically extracts text

Clean & editable notes are generated instantly

Supports scanned PDFs using OCR technology

✨ 2. AI Quiz/Test Generator

Generate quizzes from:

✔ Saved notes
✔ Uploaded PDFs (without saving notes)

You can choose:

Difficulty: Easy / Medium / Hard

Number of questions: 1–100

AI automatically generates:

MCQs

Options

Correct answer

Explanation

✨ 3. Timer-Based Quiz Mode

Custom timer (1–180 minutes)

Alerts:

⚠️ Half-time warning

⏰ Last 10 seconds

Auto-submit when time ends

Saves results automatically

✨ 4. Test Review Panel

After finishing a test, users can view:

Score

Accuracy

XP earned

User answer vs correct answer

AI explanation for each question

Download result as PDF

✨ 5. Notes Management

View all notes

Edit / rename notes

Delete notes

Download notes

Merge multiple notes

Share notes

✨ 6. PDF Upload Modes

Generate Notes → OCR + Store in Database

Generate Quiz → Directly generate questions from PDF

✨ 7. Secure Authentication

JWT-based login / signup

Notes and tests stored per user

All sensitive routes protected

🧠 Tech Stack
Frontend

Next.js (App Router)

React

Tailwind CSS

Client-side rendering + server actions

Backend

Next.js API Routes

Node.js

JWT Authentication

OCR Integration (OCR.Space)

Groq AI (LLaMA / Mixtral models)

Database

MongoDB + Mongoose

Tools & APIs

OCR.Space API (PDF text extraction)

Groq AI API (MCQs, answers, explanations)

JSPDF / PDFKit (Download results)


How It Works (Architecture)
1️⃣ PDF → OCR

User uploads PDF

OCR.Space converts it to clean text

2️⃣ Notes Generator

Text is processed

Stored in MongoDB as a note document

3️⃣ Quiz Generator

Test questions created using Groq AI:

LLaMA / Mixtral models

Consistent structured JSON

Correct option & explanation

4️⃣ Test Evaluation

Answers are compared

Score calculated

Explanation shown

Result exported to PDF


