// app/api/ask-ai/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { question } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, message: "Question is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "GROQ_API_KEY is not set in .env.local",
        },
        { status: 500 }
      );
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful study assistant. Explain concepts simply and clearly for students.",
            },
            {
              role: "user",
              content: question,
            },
          ],
          temperature: 0.4,
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", errText);
      return NextResponse.json(
        {
          success: false,
          message: "AI service error. Please check API key or usage.",
        },
        { status: 500 }
      );
    }

    const data = await groqRes.json();
    const answer =
      data.choices?.[0]?.message?.content ||
      "I could not generate an answer. Please try again.";

    return NextResponse.json(
      {
        success: true,
        answer,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ASK-AI ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}


