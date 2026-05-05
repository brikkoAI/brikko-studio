/**
 * Onboarding wizard shell.
 *
 * - Tracks current step in URL query `?step=N` so reload + browser back work.
 * - 6 steps total (M0 OAuth + welcome are *before* this wizard; this is post-
 *   sign-in setup).
 * - Steps 3/4/5/6 are stubs in Task 27 and get replaced in Tasks 28-30.
 */
import { useCallback, useEffect, useState } from "react";
import { Step1Welcome } from "./Step1Welcome.js";
import { Step2Workspace } from "./Step2Workspace.js";
import { Step3Provider } from "./Step3Provider.js";
import { Step4Profile } from "./Step4Profile.js";
import { Step5MagicMoment } from "./Step5MagicMoment.js";
import { Step6Disclaimer } from "./Step6Disclaimer.js";

const TOTAL_STEPS = 6;

function readStepFromUrl(): number {
  if (typeof window === "undefined") return 1;
  const v = Number(new URLSearchParams(window.location.search).get("step") ?? "1");
  return Number.isInteger(v) && v >= 1 && v <= TOTAL_STEPS ? v : 1;
}

export function Wizard(): JSX.Element {
  const [step, setStep] = useState<number>(readStepFromUrl);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("step", String(step));
    window.history.replaceState({}, "", u);
  }, [step]);

  const next = useCallback(
    () => setStep((s) => Math.min(TOTAL_STEPS, s + 1)),
    [],
  );
  const back = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);
  const finish = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/chat";
    }
  }, []);

  return (
    <div className="page onboarding-page" data-testid="onboarding-wizard">
      <Stepper current={step} total={TOTAL_STEPS} />

      <div className="onboarding-body">
        {step === 1 && <Step1Welcome onNext={next} />}
        {step === 2 && <Step2Workspace onNext={next} onBack={back} />}
        {step === 3 && <Step3Provider onNext={next} onBack={back} />}
        {step === 4 && <Step4Profile onNext={next} onBack={back} />}
        {step === 5 && <Step5MagicMoment onNext={next} onBack={back} />}
        {step === 6 && <Step6Disclaimer onFinish={finish} onBack={back} />}
      </div>
    </div>
  );
}

function Stepper({
  current,
  total,
}: {
  current: number;
  total: number;
}): JSX.Element {
  return (
    <div
      className="onboarding-stepper"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      data-testid="onboarding-stepper"
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`onboarding-stepper-segment${
            i + 1 <= current ? " active" : ""
          }`}
          data-testid={`onboarding-stepper-${i + 1}`}
        />
      ))}
    </div>
  );
}
