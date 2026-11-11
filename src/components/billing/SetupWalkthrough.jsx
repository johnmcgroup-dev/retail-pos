import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { money, priceFor, withDefaults } from "@/lib/billing";

const WORDS = ["setting up", "choosing", "paying", "all set"];

/**
 * A step-by-step guide through registration: create the store, choose a plan,
 * pay on the hosted page, then the dashboard opens. Click a step circle or use
 * Back / Next to read each stage; the current stage is passed in by the screen
 * the owner is actually on, so the guide always starts where they are.
 */
export default function SetupWalkthrough({ stage = 1, config, compact = false }) {
  const cfg = withDefaults(config);
  const safeStage = Math.min(Math.max(stage, 1), 4);
  const [current, setCurrent] = useState(safeStage);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setCurrent(safeStage);
    setFinished(false);
  }, [safeStage]);

  const steps = [
    {
      title: "Create your store",
      body: "Enter your store name, business name and address. The store name also becomes your public shop link, so no two stores can share one.",
    },
    {
      title: "Choose a plan",
      body: `Pick ${money(priceFor("monthly", cfg))} per month or ${money(
        priceFor("annual", cfg)
      )} for a full year. Both plans unlock every feature — the annual plan simply costs less over twelve months.`,
    },
    {
      title: "Pay online",
      body: "Your secure Paystack payment page opens with the amount already set. Pay by card or transfer and keep the reference shown on this screen — it links the payment to your store.",
    },
    {
      title: "Your store opens",
      body: "As soon as the payment is confirmed your dashboard unlocks — products, POS, stock, reports and your online shop are all ready to use.",
    },
  ];

  const idx = finished ? WORDS.length - 1 : current - 1;

  const goTo = (n) => {
    setFinished(false);
    setCurrent(Math.min(Math.max(n, 1), steps.length));
  };

  const badgeClass = (state) =>
    state === "todo"
      ? "bg-slate-100 text-slate-500 hover:scale-105"
      : "bg-blue-600 text-white shadow-sm";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
        <span>You're</span>
        <span className="inline-flex h-9 items-center overflow-hidden rounded-lg bg-blue-100 px-3">
          <span
            className="block transition-transform duration-500 ease-out"
            style={{ transform: `translateY(-${idx * 36}px)` }}
          >
            {WORDS.map((word) => (
              <span key={word} className="flex h-9 items-center whitespace-nowrap font-medium text-blue-700">
                {word}
              </span>
            ))}
          </span>
        </span>
      </p>

      <div className="flex items-center">
        {steps.map((step, i) => {
          const n = i + 1;
          const state = finished || n < current ? "complete" : n === current ? "active" : "todo";
          const done = state === "complete";
          return (
            <React.Fragment key={step.title}>
              <button
                type="button"
                onClick={() => goTo(n)}
                aria-label={`Step ${n}: ${step.title}`}
                aria-current={state === "active" ? "step" : undefined}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span
                  className={`relative grid h-10 w-10 place-items-center rounded-full text-sm font-semibold transition-all duration-300 ${badgeClass(
                    state
                  )} ${state === "active" ? "scale-105" : ""}`}
                >
                  <span className={done ? "opacity-0" : "opacity-100"}>{n}</span>
                  {done && <Check className="absolute h-5 w-5" />}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span className="flex flex-1 items-center px-1.5">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                  <span className="relative mx-1 h-0.5 flex-1 rounded-full bg-slate-200">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full bg-blue-600 transition-all duration-500 ${
                        !finished && current > n ? "w-full" : "w-0"
                      }`}
                    />
                  </span>
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {!compact && (
        <>
          <div className="relative mt-4 grid overflow-hidden">
            {steps.map((step, i) => {
              const active = !finished && i === current - 1;
              return (
                <div
                  key={step.title}
                  aria-hidden={active ? "false" : "true"}
                  className={`[grid-area:1/1] transition-all duration-300 ${
                    active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              );
            })}
            <div
              aria-hidden={finished ? "false" : "true"}
              className={`[grid-area:1/1] transition-all duration-300 ${
                finished ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">You're ready</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                That's the whole process — choose a plan below and your payment link opens straight away.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              className={`rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                current === 1 && !finished ? "invisible" : ""
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (finished) {
                  goTo(1);
                } else if (current < steps.length) {
                  goTo(current + 1);
                } else {
                  setFinished(true);
                }
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {finished ? "Start over" : current === steps.length ? "Got it" : "Next"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}