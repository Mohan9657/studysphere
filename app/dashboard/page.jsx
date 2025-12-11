"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const DONUT_COLORS = ["#22c55e", "#ef4444"]; // green, red

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalTests, setTotalTests] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [xpPoints, setXpPoints] = useState(0);
  const [correctWrongData, setCorrectWrongData] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [difficultyStats, setDifficultyStats] = useState([]);

  const [streakDays, setStreakDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : null;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const [testsRes, streakRes] = await Promise.all([
          fetch("/api/tests", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/streak", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const testsData = await testsRes.json();
        const streakData = await streakRes.json();

        if (!testsRes.ok || !testsData.success) {
          setError(testsData.message || "Failed to load dashboard data");
        } else {
          setTotalTests(testsData.totalTests || 0);
          setQuestionsAttempted(testsData.totalQuestionsAttempted || 0);
          setOverallAccuracy(testsData.overallAccuracy || 0);
          setXpPoints(testsData.xpPoints || 0);

          setCorrectWrongData([
            { name: "Correct", value: testsData.totalCorrect || 0 },
            { name: "Wrong", value: testsData.totalWrong || 0 },
          ]);

          setScoreHistory(testsData.scoreHistory || []);
          setDifficultyStats(testsData.difficultyStats || []);
        }

        if (streakRes.ok && streakData.success) {
          setStreakDays(streakData.currentStreakDays || 0);
          setLongestStreak(streakData.longestStreakDays || 0);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // keep dependency array fixed to avoid the warning

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("studysphere_token");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header + nav buttons */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">StudySphere Dashboard</h1>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/ask-ai")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Ask AI
            </button>
            <button
              onClick={() => router.push("/notes")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Prepare Notes
            </button>
            {/* 🔽 NEW Upload PDF button */}
            <button
              onClick={() => router.push("/upload-pdf")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Upload PDF
            </button>
            <button
              onClick={() => router.push("/test")}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold"
            >
              Take Test
            </button>
            <button
              onClick={() => router.push("/history")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              View Test History
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Top stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Tests" value={totalTests} />
          <StatCard title="Questions Attempted" value={questionsAttempted} />
          <StatCard title="Overall Accuracy" value={`${overallAccuracy}%`} />
          <StatCard
            title="XP Points"
            value={xpPoints}
            subtitle="You earn 10 XP for each correct answer."
          />
        </div>

        {/* Streak + Daily goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-400 mb-1">Current Streak</p>
            <p className="text-2xl font-semibold mb-1">{streakDays} day(s)</p>
            <p className="text-xs text-slate-400">
              Longest streak: {longestStreak} day(s)
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-400 mb-1">Daily Goal</p>
            <p className="text-sm mb-2">
              {totalTests} / 1 test completed today
            </p>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-yellow-400"
                style={{
                  width: `${Math.min(100, (totalTests / 1) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Keep at least 1 quiz per day to maintain your streak.
            </p>
          </div>
        </div>

        {/* Donut + Score history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3">
              Overall Correct vs Wrong
            </p>

            {questionsAttempted === 0 ? (
              <EmptyState message="Take a test to see accuracy stats." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={correctWrongData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {correctWrongData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} questions`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#e9ebf5ff",
                      borderColor: "#1e293b",
                      fontSize: "0.75rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3">
              Score History (Accuracy %)
            </p>

            {scoreHistory.length === 0 ? (
              <EmptyState message="Take a test to see your score history." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis
                    stroke="#64748b"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      borderColor: "#1e293b",
                      fontSize: "0.75rem",
                    }}
                    formatter={(value) => [`${value}%`, "Accuracy"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Difficulty-wise performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3">
            Difficulty-wise Performance (Average Accuracy)
          </p>

          {difficultyStats.length === 0 ? (
            <EmptyState message="Take tests on different difficulties to see this graph." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={difficultyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="difficulty" stroke="#64748b" />
                <YAxis
                  stroke="#64748b"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#1e293b",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [`${value}%`, "Accuracy"]}
                />
                <Bar dataKey="accuracy" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-semibold mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="h-52 flex items-center justify-center text-xs text-slate-500">
      {message}
    </div>
  );
}
