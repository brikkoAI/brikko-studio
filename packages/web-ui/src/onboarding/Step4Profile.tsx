/**
 * Step 4 — privacy profile. Stub for Task 27. Replaced in Task 29.
 */
export function Step4Profile({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}): JSX.Element {
  return (
    <div data-testid="step-4-stub" className="onboarding-step">
      <h2>Step 4 — Task 29</h2>
      <div className="onboarding-actions">
        <button type="button" className="secondary" onClick={onBack}>
          Назад
        </button>
        <button type="button" className="primary" onClick={onNext}>
          Далее
        </button>
      </div>
    </div>
  );
}
