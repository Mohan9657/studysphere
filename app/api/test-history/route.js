// app/api/test-history/route.js
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

    // All tests for this user (oldest first so graphs work nicely)
    const tests = await Test.find({ user: userId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, tests }, { status: 200 });
  } catch (err) {
    console.error("GET /api/test-history error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load test history" },
      { status: 500 }
    );
  }
}
