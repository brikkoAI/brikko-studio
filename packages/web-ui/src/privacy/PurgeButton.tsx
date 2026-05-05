/**
 * Privacy → Stats tab purge button.
 *
 * Multi-step destructive confirm:
 *   1. User clicks "Очистить все маппинги" → modal opens with body explaining
 *      the irreversibility.
 *   2. User must check "Я понимаю, что данные нельзя восстановить".
 *   3. User must type the literal phrase "УДАЛИТЬ ВСЕ" (REQUIRED_PHRASE).
 *   4. Only then does the danger-solid "Удалить навсегда" button enable.
 *   5. On success, a toast-like confirmation shows the deleted count.
 *
 * Spec §1.3 / hard constraint: dangerous, irreversible actions must require
 * multi-factor confirmation — checkbox alone is insufficient.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { purgeAll } from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

const REQUIRED_PHRASE = "УДАЛИТЬ ВСЕ";

export function PurgeButton(): JSX.Element {
  const t = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [lastResult, setLastResult] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: purgeAll,
    onSuccess: (data) => {
      setLastResult(data.deleted_mappings);
      setOpen(false);
      setAcknowledged(false);
      setPhrase("");
      qc.invalidateQueries({ queryKey: ["privacy"] });
    },
  });

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) {
      setAcknowledged(false);
      setPhrase("");
    }
  };

  const phraseMatches = phrase.trim() === REQUIRED_PHRASE;
  const primaryDisabled = !acknowledged || !phraseMatches || mutation.isPending;

  return (
    <div className="purge-section" data-testid="purge-section">
      <h3>{t("privacy.purge.button")}</h3>
      <p>{t("privacy.purge.confirm.body")}</p>
      <button
        type="button"
        className="danger"
        onClick={() => setOpen(true)}
        data-testid="purge-open"
      >
        {t("privacy.purge.button")}
      </button>
      {lastResult !== null && (
        <span
          className="policy-saved"
          data-testid="purge-success"
          style={{ marginLeft: "0.75rem" }}
        >
          ✓ {t("privacy.purge.success").replace("{count}", String(lastResult))}
        </span>
      )}
      {mutation.isError && (
        <span className="error" data-testid="purge-error" style={{ marginLeft: "0.75rem" }}>
          {String(mutation.error)}
        </span>
      )}

      <ConfirmModal
        open={open}
        onOpenChange={handleOpenChange}
        title={t("privacy.purge.confirm.title")}
        primaryLabel={t("privacy.purge.confirm.button")}
        primaryDisabled={primaryDisabled}
        onPrimary={() => mutation.mutate()}
        cancelLabel={t("common.cancel")}
        testId="purge-modal"
      >
        <p>{t("privacy.purge.confirm.body")}</p>
        <label className="modal-checkbox">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            data-testid="purge-ack"
          />
          <span>{t("privacy.purge.confirm.checkbox1")}</span>
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          {t("privacy.purge.confirm.phrase_label")}{" "}
          <span className="mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {REQUIRED_PHRASE}
          </span>
        </label>
        <input
          type="text"
          className="modal-input"
          placeholder={REQUIRED_PHRASE}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          data-testid="purge-phrase"
          autoComplete="off"
          spellCheck={false}
        />
      </ConfirmModal>
    </div>
  );
}
