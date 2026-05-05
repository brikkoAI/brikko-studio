/**
 * Step 6 — three-touch disclaimer. Stub for Task 27. Replaced in Task 30.
 */
export function Step6Disclaimer({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}): JSX.Element {
  return (
    <div data-testid="step-6-stub" className="onboarding-step">
      <h2>Step 6 — Task 30</h2>
      <div className="onboarding-actions">
        <button type="button" className="secondary" onClick={onBack}>
          Назад
        </button>
        <button type="button" className="primary" onClick={onFinish}>
          Завершить
        </button>
      </div>
    </div>
  );
}
