/**
 * Step 3 — LLM provider choice. Stub for Task 27. Replaced in Task 28.
 */
export function Step3Provider({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}): JSX.Element {
  return (
    <div data-testid="step-3-stub" className="onboarding-step">
      <h2>Step 3 — Task 28</h2>
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
