// app/api/evaluate-test/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Test from "@/models/Test";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

// use any Groq chat model you like
const GROQ_MODEL = "llama-3.1-8b-instant";

/**
 * Ask Groq for an explanation of the correct answer.
 * Returns a short text or null if anything fails.
 */
async function getAiExplanation(question, options, correctText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // No key configured -> just skip explanations
    return null;
  }

  const prompt = `
You are a helpful exam tutor.

Question:
${question}

Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}

The correct answer is:
${correctText}

Explain in 2–3 simple sentences why this answer is correct.
If useful, briefly mention why the other options are not correct.
Use very simple English for students.
`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Groq error:", await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error("Groq fetch failed:", err);
    return null;
  }
}

/**
 * POST /api/evaluate-test
 *
 * Body shape we expect:
 * {
 *   questions: [{ question, options, correctOptionIndex }],
 *   userAnswers: [number],           // index per question
 *   difficulty: "easy" | "medium" | "hard",
 *   timeUsedSeconds: number | null,
 *   selectedNoteIds: [noteId]        // optional
 * }
 */
export async function POST(req) {
  try {
    await connectDB();

    // 1) Auth – Bearer token from localStorage ("studysphere_token")
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("JWT verify failed in evaluate-test:", err);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // 2) Parse body
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      questions = [],
      userAnswers = [],
      difficulty = "easy",
      timeUsedSeconds = null,
      selectedNoteIds = [],
    } = body;

    if (
      !Array.isArray(questions) ||
      !Array.isArray(userAnswers) ||
      questions.length === 0 ||
      questions.length !== userAnswers.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid questions / answers payload",
        },
        { status: 400 }
      );
    }

    // 3) Build per-question results with AI explanations
    const perQuestionResults = await Promise.all(
      questions.map(async (q, idx) => {
        const options = Array.isArray(q.options) ? q.options : [];
        const questionText = q.question || "";
        const userIndex =
          typeof userAnswers[idx] === "number"
            ? userAnswers[idx]
            : -1;
        const correctIndex =
          typeof q.correctOptionIndex === "number"
            ? q.correctOptionIndex
            : 0;

        const isCorrect = userIndex === correctIndex;
        const correctText = options[correctIndex] || "";

        let aiExplanation = null;
        try {
          aiExplanation = await getAiExplanation(
            questionText,
            options,
            correctText
          );
        } catch (err) {
          console.error("AI explanation failed:", err);
        }

        return {
          question: questionText,
          options,
          correctOptionIndex: correctIndex,
          userOptionIndex: userIndex,
          isCorrect,
          aiExplanation,
        };
      })
    );

    // 4) Overall stats
    const totalQuestions = perQuestionResults.length;
    const correctCount = perQuestionResults.filter(
      (p) => p.isCorrect
    ).length;
    const wrongCount = totalQuestions - correctCount;
    const score = correctCount; // 1 point per correct
    const accuracy =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const xpEarned = correctCount * 10;

    // 5) Save Test document (dashboard will continue to work)
    const testDoc = await Test.create({
      user: userId,
      difficulty,
      totalQuestions,
      correctCount,
      wrongCount,
      score,
      accuracy,
      xpEarned,
      timeUsedSeconds,
      noteIds: selectedNoteIds,
      perQuestionResults,
    });

    // 6) Return stats + per-question breakdown to frontend
    return NextResponse.json(
      {
        success: true,
        testId: testDoc._id.toString(),
        score,
        totalQuestions,
        correctCount,
        wrongCount,
        accuracy,
        xpEarned,
        perQuestionResults,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("evaluate-test error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to evaluate test" },
      { status: 500 }
    );
  }
}
