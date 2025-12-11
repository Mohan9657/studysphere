import { Suspense } from "react";
import TestPageClient from "./TestPageClient";

export const dynamic = "force-dynamic";

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <p className="text-sm text-slate-300">Loading test...</p>
        </div>
      }
    >
      <TestPageClient />
    </Suspense>
  );
}
