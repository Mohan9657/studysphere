// app/api/notes/route.js
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
    console.error("JWT verify failed in /api/notes:", err);
    return { error: "Invalid token" };
  }
}

// GET  -> list notes
export async function GET(req) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    const notes = await Note.find({ userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      { success: true, notes },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/notes error:", err);
    return NextResponse.json(
      { success: false, message: "Server error loading notes" },
      { status: 500 }
    );
  }
}

// POST -> create note
export async function POST(req) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    const note = await Note.create({
      userId,
      title,
      content,
    });

    return NextResponse.json(
      { success: true, note },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/notes error:", err);
    return NextResponse.json(
      { success: false, message: "Server error creating note" },
      { status: 500 }
    );
  }
}

// PUT -> update note
export async function PUT(req) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    const { id, title, content } = await req.json();

    if (!id || !title || !content) {
      return NextResponse.json(
        { success: false, message: "Id, title and content are required" },
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
        { success: false, message: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, note },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/notes error:", err);
    return NextResponse.json(
      { success: false, message: "Server error updating note" },
      { status: 500 }
    );
  }
}

// DELETE -> delete note (body: { id })
export async function DELETE(req) {
  try {
    await connectDB();

    const { userId, error } = getUserFromRequest(req);
    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 401 }
      );
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Id is required" },
        { status: 400 }
      );
    }

    const note = await Note.findOneAndDelete({ _id: id, userId });

    if (!note) {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Note deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/notes error:", err);
    return NextResponse.json(
      { success: false, message: "Server error deleting note" },
      { status: 500 }
    );
  }
}
