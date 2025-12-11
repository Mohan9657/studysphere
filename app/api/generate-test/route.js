// app/api/generate-test/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Note from "@/models/Note";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    await connectDB();

    // -------- AUTH --------
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
      console.error("JWT verify failed in generate-test:", err);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      noteIds = [],
      difficulty = "easy",
      questionCount = 5, // from frontend
    } = body;

    // clamp / validate questionCount
    const numQuestions = Math.max(
      1,
      Math.min(20, Number(questionCount) || 5)
    );

    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one note." },
        { status: 400 }
      );
    }

    // -------- LOAD NOTES --------
    const notes = await Note.find({
      _id: { $in: noteIds },
      userId: decoded.userId,
    }).lean();

    if (!notes || notes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected notes not found for this user. Try refreshing notes and selecting again.",
        },
        { status: 400 }
      );
    }

    const combinedText = notes
      .map((n) => `${n.title}\n\n${n.content || ""}`)
      .join("\n\n-----\n\n");

    // ----------------- GROQ PROMPT -----------------
    const prompt = `
You are a quiz generator.

Read the following study notes and create exactly ${numQuestions} multiple-choice questions.

RULES:
- Each item must be a **clear question sentence**, not just a word.
  Example: "What does DBMS stand for?" ✅
           "DBMS" ❌
- DO NOT write "Q1", "Question 1" etc. Just the question text.
- For each question:
    - Provide **exactly 4 options**.
    - Options must be realistic answers.
      DO NOT use options like "Not given", "I don't know", "All of the above".
- Mark the index of the correct option in "correctIndex" (0-based).
- Make questions suitable for difficulty: ${difficulty.toUpperCase()}.

Return ONLY valid JSON, no Markdown, in this format:

[
  {
    "question": "What does DBMS stand for?",
    "options": [
      "Database Management System",
      "Data Backup Management System",
      "Dynamic Buffer Management Service",
      "Disk Based Management Software"
    ],
    "correctIndex": 0
  }
]

Notes:
${combinedText}
`;

    let rawQuestions = [];

    // -------- CALL GROQ --------
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = completion.choices?.[0]?.message?.content || "[]";
      rawQuestions = JSON.parse(content);
    } catch (err) {
      console.error("Groq generation failed:", err);
      // fallback: 1 simple dummy question so UI still works
      rawQuestions = [
        {
          question: "What does DBMS stand for?",
          options: [
            "Database Management System",
            "Data Backup Management System",
            "Dynamic Buffer Management Service",
            "Disk Based Management Software",
          ],
          correctIndex: 0,
        },
      ];
    }

    // -------- NORMALIZE QUESTIONS --------
    const normalizedQuestions = rawQuestions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length >= 2
      )
      .slice(0, numQuestions)
      .map((q) => {
        // remove any "Q1.", "Question 1:" etc at start
        const questionText = (q.question || "")
          .replace(/^\s*(Q(uestion)?\s*\d+\.?\s*:?\s*)/i, "")
          .trim();

        // keep max 4 options
        const options = q.options.slice(0, 4);

        // validate correctIndex
        let correctIndex =
          typeof q.correctIndex === "number" ? q.correctIndex : 0;
        if (correctIndex < 0 || correctIndex >= options.length) {
          correctIndex = 0;
        }

        return {
          question: questionText,
          options,
          correctOptionIndex: correctIndex,
        };
      });

    if (normalizedQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "AI did not return any valid questions. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        difficulty,
        questionCount: numQuestions,
        questions: normalizedQuestions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/generate-test error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to generate test" },
      { status: 500 }
    );
  }
}
