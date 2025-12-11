// app/api/streak/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Test from "@/models/Test";

export async function GET(req) {
  try {
    await connectDB();

    // 🔹 Read token from Authorization header
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
      console.error("JWT verify error in /api/streak:", err);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // 🔹 Fetch all tests for this user (only need createdAt)
    const tests = await Test.find({ user: userId })
      .select("createdAt")
      .sort({ createdAt: 1 })
      .lean();

    if (!tests.length) {
      return NextResponse.json(
        {
          success: true,
          currentStreakDays: 0,
          longestStreakDays: 0,
        },
        { status: 200 }
      );
    }

    // Convert dates to "YYYY-MM-DD" strings
    const daySet = new Set(
      tests.map((t) =>
        new Date(t.createdAt).toISOString().slice(0, 10)
      )
    );

    const days = Array.from(daySet).sort(); // ascending

    const toDate = (str) => new Date(str + "T00:00:00Z");
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // 🔹 Longest streak (anywhere in history)
    let longest = 1;
    let currentRun = 1;

    for (let i = 1; i < days.length; i++) {
      const prev = toDate(days[i - 1]).getTime();
      const cur = toDate(days[i]).getTime();

      if (cur - prev === ONE_DAY) {
        currentRun++;
      } else {
        longest = Math.max(longest, currentRun);
        currentRun = 1;
      }
    }
    longest = Math.max(longest, currentRun);

    // 🔹 Current streak (consecutive days ending today)
    const todayStr = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    let cursor = new Date(todayStr + "T00:00:00Z").getTime();

    while (
      daySet.has(new Date(cursor).toISOString().slice(0, 10))
    ) {
      currentStreak++;
      cursor -= ONE_DAY;
    }

    return NextResponse.json(
      {
        success: true,
        currentStreakDays: currentStreak,
        longestStreakDays: longest,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/streak error:", err);
    return NextResponse.json(
      { success: false, message: "Server error loading streak" },
      { status: 500 }
    );
  }
}
