"use client";

import { CircleCheck, Crown, Plus, Target, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addGoal, removeGoal } from "@/app/actions/goals";
import { CATEGORIES, CATEGORY_INFO, type Category } from "@/lib/categories";

type GoalProgress = {
  id: string;
  label: string;
  target: number;
  current: number;
  done: boolean;
};

export function Goals({ goals, isPro, max }: { goals: GoalProgress[]; isPro: boolean; max: number }) {
  const [adding, setAdding] = useState(false);
  const [target, setTarget] = useState("25");
  const [category, setCategory] = useState<Category | "">("");
  const [period, setPeriod] = useState<"month" | "year">("year");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isPro) {
    return (
      <section className="card mt-4 flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-forest-900">
          <Target className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Set wildlife goals</p>
          <p className="text-sm text-bark-500">Like &ldquo;See 50 species this year&rdquo;, with progress tracking.</p>
        </div>
        <Link href="/upgrade" className="inline-flex items-center gap-1 rounded-full bg-forest-600 px-3 py-1.5 text-xs font-bold text-white">
          <Crown className="h-3.5 w-3.5" aria-hidden /> Pro
        </Link>
      </section>
    );
  }

  return (
    <section className="card mt-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-forest-600" aria-hidden />
        <h2 className="font-bold">My goals</h2>
        {!adding && goals.length < max && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-forest-600"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add goal
          </button>
        )}
      </div>

      {goals.length === 0 && !adding && (
        <p className="text-sm text-bark-500">No goals yet. Add one, like &ldquo;See 50 species this year&rdquo;.</p>
      )}

      <ul className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return (
            <li key={g.id}>
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="flex-1 font-semibold">{g.label}</span>
                {g.done && <CircleCheck className="h-4 w-4 text-forest-600" aria-label="Goal reached" />}
                <span className="font-bold text-forest-700">
                  {g.current}/{g.target}
                </span>
                <button
                  type="button"
                  aria-label={`Remove goal: ${g.label}`}
                  className="text-bark-500 hover:text-red-700"
                  onClick={() => startTransition(() => removeGoal(g.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-sand-100">
                <div
                  className={`h-full rounded-full ${g.done ? "bg-sun-400" : "bg-forest-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form
          className="mt-3 space-y-2 rounded-xl bg-sand-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await addGoal({ target: Number(target), category: category || null, period });
              if (result.error) setError(result.error);
              else {
                setError(null);
                setAdding(false);
              }
            });
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            See
            <input
              className="field w-20 py-1.5"
              type="number"
              min={1}
              max={5000}
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <select className="field w-auto py-1.5" value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
              <option value="">species (any)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_INFO[c].label.toLowerCase()} species
                </option>
              ))}
            </select>
            this
            <select className="field w-auto py-1.5" value={period} onChange={(e) => setPeriod(e.target.value as "month" | "year")}>
              <option value="year">year</option>
              <option value="month">month</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary py-2 text-sm" disabled={pending}>
              {pending ? "Saving…" : "Add goal"}
            </button>
            <button type="button" className="btn btn-secondary py-2 text-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
