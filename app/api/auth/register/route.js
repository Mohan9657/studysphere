// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const name = body?.name;
    const email = body?.email;
    const password = body?.password;

    // 1) Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // 2) Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // 3) Hash password (force string)
    const hashed = await bcrypt.hash(String(password), 10);

    // 4) Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
    });

    // 5) Create token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      success: true,
      message: "Registration successful",
      token,
    });
  } catch (err) {
    console.error("Register error:", err);

    // Try to show a more helpful message
    let message = "Server error";
    // Duplicate email error from MongoDB
    if (err.code === 11000) {
      message = "Email already registered";
    } else if (err.message) {
      message = err.message;
    }

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
