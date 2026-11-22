import { Suspense } from "react";
import { DashboardView } from "../components/dashboard/dashboard-view";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col font-sans text-slate-900">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-8 sm:px-6 md:pb-10 md:pt-10">
        <header className="mb-6 md:mb-8">
          <h1 className="cp-animate-in text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Good day
          </h1>
          <p className="cp-animate-in mt-1 text-sm text-slate-600 md:text-base">
            Who owes you, how much, and since when?
          </p>
        </header>
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading CashPulse...</div>}>
          <DashboardView />
        </Suspense>
      </main>
    </div>
  );
}
