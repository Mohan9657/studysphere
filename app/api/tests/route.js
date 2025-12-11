import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Test from "@/models/Test";

export async function GET(req) {
  try {
    await connectDB();

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
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    const tests = await Test.find({ user: userId })
      .sort({ createdAt: 1 })
      .lean();

    if (!tests.length) {
      return NextResponse.json(
        {
          success: true,
          totalTests: 0,
          totalQuestionsAttempted: 0,
          totalCorrect: 0,
          totalWrong: 0,
          overallAccuracy: 0,
          xpPoints: 0,
          scoreHistory: [],
          difficultyStats: [],
        },
        { status: 200 }
      );
    }

    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;

    const scoreHistory = tests.map((t, index) => {
      const totalQ =
        typeof t.totalQuestions === "number"
          ? t.totalQuestions
          : Array.isArray(t.perQuestionResults)
          ? t.perQuestionResults.length
          : 0;

      const correct =
        typeof t.correctCount === "number"
          ? t.correctCount
          : Array.isArray(t.perQuestionResults)
          ? t.perQuestionResults.filter((q) => q.isCorrect).length
          : 0;

      totalQuestionsAttempted += totalQ;
      totalCorrect += correct;

      const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

      return {
        name: `T${index + 1}`,
        accuracy,
      };
    });

    const totalWrong = totalQuestionsAttempted - totalCorrect;
    const overallAccuracy =
      totalQuestionsAttempted > 0
        ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
        : 0;

    const xpPoints = totalCorrect * 10;

    const diffMap = {};

    tests.forEach((t) => {
      const diff = t.difficulty || "unknown";

      const totalQ =
        typeof t.totalQuestions === "number"
          ? t.totalQuestions
          : Array.isArray(t.perQuestionResults)
          ? t.perQuestionResults.length
          : 0;

      const correct =
        typeof t.correctCount === "number"
          ? t.correctCount
          : Array.isArray(t.perQuestionResults)
          ? t.perQuestionResults.filter((q) => q.isCorrect).length
          : 0;

      if (!diffMap[diff]) {
        diffMap[diff] = { totalQuestions: 0, correct: 0 };
      }

      diffMap[diff].totalQuestions += totalQ;
      diffMap[diff].correct += correct;
    });

    const difficultyStats = Object.entries(diffMap).map(
      ([difficulty, { totalQuestions, correct }]) => ({
        difficulty,
        accuracy:
          totalQuestions > 0
            ? Math.round((correct / totalQuestions) * 100)
            : 0,
      })
    );

    return NextResponse.json(
      {
        success: true,
        totalTests: tests.length,
        totalQuestionsAttempted,
        totalCorrect,
        totalWrong,
        overallAccuracy,
        xpPoints,
        scoreHistory,
        difficultyStats,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/tests error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load tests" },
      { status: 500 }
    );
  }
}


