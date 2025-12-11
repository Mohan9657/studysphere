// app/api/generate-test-from-text/route.js
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      text = "",
      difficulty = "easy",
      numQuestions = 5,
    } = body || {};

    const cleanedText = text.trim();

    if (!cleanedText || cleanedText.length < 30) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Not enough text from PDF to generate questions. Please upload a clearer / longer PDF.",
        },
        { status: 400 }
      );
    }

    // 🔹 MCQ PROMPT (no more 'Based on your notes...')
    const prompt = `
You are an expert exam generator.

Generate ${numQuestions} multiple-choice questions (MCQs) ONLY from this study text:

"${cleanedText}"

Rules:
- Difficulty: ${difficulty.toUpperCase()}.
- Each question must be normal exam style, not meta, not referencing the text.
- Do NOT say "Based on your notes" or "the given text".
- Each question must have 1 correct answer and 3 wrong but logical options.
- Questions must be clear and short (max 1–2 lines).
- Options must also be short (max 1 line).
- Use simple English for students.

Return ONLY valid JSON in this exact format (no extra text):

[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "answerIndex": 0
  }
]
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "[]";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse JSON from Groq:", err, "raw:", raw);
      return NextResponse.json(
        {
          success: false,
          message: "AI response could not be parsed into questions.",
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "AI did not return any questions.",
        },
        { status: 500 }
      );
    }

    // 🔹 Normalize questions for frontend + /api/evaluate-test
    const limited = parsed.slice(0, numQuestions);

    const questions = limited.map((q, idx) => {
      const questionText =
        typeof q.question === "string" && q.question.trim().length > 0
          ? q.question.trim()
          : `Question ${idx + 1}`;

      const options = Array.isArray(q.options) ? q.options : [];
      let safeOptions =
        options.length >= 2
          ? options.map((o) => String(o))
          : ["Option A", "Option B", "Option C", "Option D"];

      let answerIndex =
        typeof q.answerIndex === "number" ? q.answerIndex : 0;
      if (
        answerIndex < 0 ||
        answerIndex >= safeOptions.length ||
        Number.isNaN(answerIndex)
      ) {
        answerIndex = 0;
      }

      return {
        question: questionText,
        options: safeOptions,
        // 👇 this is what /api/evaluate-test uses
        correctOptionIndex: answerIndex,
      };
    });

    return NextResponse.json(
      {
        success: true,
        totalQuestions: questions.length,
        questions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("generate-test-from-text error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while generating test.",
      },
      { status: 500 }
    );
  }
}
