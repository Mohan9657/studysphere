// app/api/notes/[id]/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Note from "@/models/Note";

function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "No token provided" };
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId };
  } catch (err) {
    console.error("JWT verify failed in /api/notes/[id]:", err);
    return { error: "Invalid token" };
  }
}

// 🔹 UPDATE note: PUT /api/notes/:id
export async function PUT(req, ctx) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    // ⚠️ params is a Promise in this Next.js version → await it
    const { id } = await ctx.params;

    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, userId },
      { title, content },
      { new: true }
    );

    if (!note) {
      return NextResponse.json(
        { success: false, message: "Note not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, note },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/notes/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Server error updating note" },
      { status: 500 }
    );
  }
}

// 🔹 DELETE note: DELETE /api/notes/:id
export async function DELETE(req, ctx) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    // ⚠️ params is a Promise → await it
    const { id } = await ctx.params;

    const deleted = await Note.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Note not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Note deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/notes/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Server error deleting note" },
      { status: 500 }
    );
  }
}
