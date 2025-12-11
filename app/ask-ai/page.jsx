"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AskAiPage() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(""); // errors + info

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : "";

  // ---------- ASK AI ----------
  const handleAskAi = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setStatusMsg("Question is required");
      return;
    }

    try {
      setLoading(true);
      setStatusMsg("");
      setAnswer("");

      // IMPORTANT: send { question } just like your old working code
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMsg(data.message || "Failed to get AI answer.");
        setAnswer("");
      } else {
        setAnswer(data.answer || "");
        setStatusMsg("");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("Something went wrong while calling AI.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- SAVE ANSWER TO NOTES ----------
  const handleSaveToNotes = async () => {
    if (!answer.trim()) {
      setStatusMsg("Ask AI and get an answer before saving.");
      return;
    }

    try {
      setSaving(true);
      setStatusMsg("");

      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Short title from the question
      const rawTitle = question.trim() || "AI generated note";
      const title =
        rawTitle.length > 60 ? rawTitle.slice(0, 60).trim() + "…" : rawTitle;

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title || "AI note",
          content: answer,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMsg(data.message || "Failed to save note.");
        return;
      }

      setStatusMsg("✅ Saved to notes!");
    } catch (err) {
      console.error(err);
      setStatusMsg("Error while saving note.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- COPY ANSWER (optional) ----------
  const handleCopyAnswer = async () => {
    if (!answer.trim()) return;
    try {
      await navigator.clipboard.writeText(answer);
      setStatusMsg("Copied answer to clipboard.");
    } catch {
      setStatusMsg("Could not copy to clipboard.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ask AI</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ask questions, get AI answers, and save the best ones directly
              into your StudySphere notes.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs hover:bg-slate-800"
          >
            ← Back to dashboard
          </button>
        </div>

        {/* Status / error message */}
        {statusMsg && (
          <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-2 text-xs text-slate-200">
            {statusMsg}
          </div>
        )}

        {/* Question input */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <textarea
            className="w-full min-h-[140px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Example: Explain Java in simple words with key points..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <div className="flex justify-end">
            <button
              onClick={handleAskAi}
              disabled={loading || !question.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>
        </div>

        {/* AI answer + actions */}
        {answer && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">AI answer</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyAnswer}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs hover:bg-slate-800"
                >
                  Copy answer
                </button>
                <button
                  onClick={handleSaveToNotes}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save to notes"}
                </button>
              </div>
            </div>

            <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
