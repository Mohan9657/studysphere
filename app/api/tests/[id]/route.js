// app/api/tests/[id]/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Test from "@/models/Test";

export async function GET(req, { params }) {
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
    const { id } = params;

    const test = await Test.findOne({ _id: id, user: userId }).lean();

    if (!test) {
      return NextResponse.json(
        { success: false, message: "Test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, test }, { status: 200 });
  } catch (err) {
    console.error("GET /api/tests/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load test" },
      { status: 500 }
    );
  }
}
