// models/Test.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PerQuestionResultSchema = new Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true },
    userOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    aiExplanation: { type: String, default: null }, // ⬅️ AI text
  },
  { _id: false }
);

const TestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    // Overall stats (your dashboard already uses these)
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    wrongCount: { type: Number, required: true },
    score: { type: Number, required: true },
    accuracy: { type: Number, required: true }, // 0–100 %

    // Optional extras
    xpEarned: { type: Number, default: 0 },
    timeUsedSeconds: { type: Number, default: null },
    noteIds: [{ type: Schema.Types.ObjectId, ref: "Note" }],

    // NEW: per-question breakdown with AI explanation
    perQuestionResults: [PerQuestionResultSchema],
  },
  { timestamps: true }
);

const Test =
  mongoose.models.Test || mongoose.model("Test", TestSchema);

export default Test;
