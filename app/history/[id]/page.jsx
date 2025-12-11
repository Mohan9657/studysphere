"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showExplanations, setShowExplanations] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTest = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("studysphere_token")
            : null;

        if (!token) {
          setError("No token – please login again.");
          return;
        }

        const res = await fetch(`/api/tests/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load test.");
          return;
        }

        setTest(data.test);
      } catch (err) {
        console.error(err);
        setError("Failed to load test.");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-sm text-slate-300">Loading test...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <button
          onClick={() => router.push("/history")}
          className="mb-4 text-sm px-3 py-1 border border-slate-600 rounded-lg"
        >
          ← Back to history
        </button>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <button
          onClick={() => router.push("/history")}
          className="mb-4 text-sm px-3 py-1 border border-slate-600 rounded-lg"
        >
          ← Back to history
        </button>
        <p className="text-sm text-slate-300">Test not found.</p>
      </div>
    );
  }

  const accuracy =
    test.totalQuestions && test.correctCount != null
      ? Math.round((test.correctCount / test.totalQuestions) * 100)
      : test.accuracy ?? 0;

  const questions = test.questions || test.perQuestionResults || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/history")}
          className="mb-4 text-sm px-3 py-1 border border-slate-600 rounded-lg"
        >
          ← Back to history
        </button>

        <h1 className="text-2xl font-bold mb-1">Test Review</h1>
        <p className="text-sm text-slate-300 mb-4">
          Taken on {formatDate(test.createdAt)} · Difficulty{" "}
          {test.difficulty || "—"}
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Score</p>
            <p className="text-2xl font-bold">
              {test.score ?? test.correctCount ?? 0}/
              {test.totalQuestions ?? "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Accuracy {accuracy}%.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Time Used</p>
            <p className="text-xl font-semibold">
              {test.timeUsedSeconds
                ? `${Math.floor(test.timeUsedSeconds / 60)}m ${
                    test.timeUsedSeconds % 60
                  }s`
                : "-"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {test.timerMode || test.isTimerMode
                ? "Timer-based quiz."
                : "Unlimited time quiz."}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Notes Used</p>
            <p className="text-xl font-semibold">
              {Array.isArray(test.notesUsed || test.selectedNoteIds)
                ? (test.notesUsed || test.selectedNoteIds).length
                : 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Number of notes selected for this test.
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Questions &amp; Answers</h2>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showExplanations}
                onChange={() => setShowExplanations((v) => !v)}
              />
              Show AI explanations
            </label>
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-slate-300">
              This test doesn&apos;t have per-question data stored in history.
              New tests taken after this update will show each question, your
              answer, the correct answer, and AI explanations here.
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const questionText = q.question || q.questionText;
                const options = q.options || [];
                const correctIndex =
                  typeof q.correctOptionIndex === "number"
                    ? q.correctOptionIndex
                    : options.indexOf(q.correctAnswer);
                const userIndex =
                  typeof q.userOptionIndex === "number"
                    ? q.userOptionIndex
                    : options.indexOf(q.userAnswer);
                const isCorrect =
                  typeof q.isCorrect === "boolean"
                    ? q.isCorrect
                    : userIndex === correctIndex;

                return (
                  <div
                    key={idx}
                    className="border border-slate-800 rounded-xl p-3"
                  >
                    <p className="text-sm font-medium mb-2">
                      Q{idx + 1}. {questionText}
                    </p>

                    <div className="space-y-1 mb-2">
                      {options.map((opt, i) => {
                        const isUser = i === userIndex;
                        const isCorrectOpt = i === correctIndex;

                        let bg = "bg-slate-800";
                        if (isUser && isCorrectOpt) bg = "bg-emerald-600/30";
                        else if (isUser && !isCorrectOpt) bg = "bg-red-600/30";
                        else if (isCorrectOpt) bg = "bg-emerald-600/20";

                        return (
                          <div
                            key={i}
                            className={`text-xs px-3 py-1 rounded-lg ${bg}`}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                            {isUser && " (your answer)"}
                            {isCorrectOpt && " (correct)"}
                          </div>
                        );
                      })}
                    </div>

                    <p
                      className={`text-xs font-medium ${
                        isCorrect ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </p>

                    {showExplanations && q.aiExplanation && (
                      <p className="mt-2 text-xs text-slate-300">
                        <span className="font-semibold text-slate-200">
                          Explanation:{" "}
                        </span>
                        {q.aiExplanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
