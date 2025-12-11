"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TestHistoryPage() {
  const router = useRouter();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : "";

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setError("");
        setLoading(true);

        const token = getToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/test-history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load test history");
          return;
        }

        setTests(data.tests || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load test history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  // if accuracy is missing, compute from score / totalQuestions
  const getAccuracyString = (test) => {
    if (typeof test.accuracy === "number") {
      return `${test.accuracy}%`;
    }
    if (
      typeof test.score === "number" &&
      typeof test.totalQuestions === "number" &&
      test.totalQuestions > 0
    ) {
      const acc = Math.round(
        (test.score / test.totalQuestions) * 100
      );
      return `${acc}%`;
    }
    return "-";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Test History</h1>
            <p className="text-sm text-slate-400">
              See all your past quizzes, scores, time taken and difficulty.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm px-3 py-1 rounded-lg border border-slate-600 hover:bg-slate-800"
          >
            ← Back to dashboard
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-400 font-medium">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading history…</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-slate-400">
            No tests taken yet. Generate a test from your notes or a
            PDF to see it here.
          </p>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-700 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Difficulty</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Accuracy</th>
                  <th className="px-4 py-3 text-left">Questions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, idx) => (
                  <tr
                    key={t._id || idx}
                    className={
                      idx % 2 === 0
                        ? "bg-slate-900"
                        : "bg-slate-900/70"
                    }
                  >
                    <td className="px-4 py-2 text-xs md:text-sm">
                      {t.testLabel || `T${tests.length - idx}`}
                    </td>
                    <td className="px-4 py-2 text-xs md:text-sm">
                      {formatDate(t.createdAt || t.date)}
                    </td>
                    <td className="px-4 py-2 text-xs md:text-sm capitalize">
                      {t.difficulty || "-"}
                    </td>
                    <td className="px-4 py-2 text-xs md:text-sm">
                      {typeof t.score === "number" &&
                      typeof t.totalQuestions === "number"
                        ? `${t.score} / ${t.totalQuestions}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-xs md:text-sm">
                      {getAccuracyString(t)}
                    </td>
                    <td className="px-4 py-2 text-xs md:text-sm">
                      {typeof t.totalQuestions === "number"
                        ? t.totalQuestions
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
