import type { Check } from '../../shared/types.js';

export interface ExplanationProps {
  explanation: string | null;
  checks: Check[];
  followups: string[];
  onFollowupClick?: (question: string) => void;
}

export function Explanation({ explanation, checks, followups, onFollowupClick }: ExplanationProps): React.ReactElement {
  return (
    <div className="explanation-pane">
      {explanation && (
        <div
          className="explanation-content"
          dangerouslySetInnerHTML={{ __html: explanation }}
        />
      )}

      {checks.length > 0 && (
        <div className="checks">
          {checks.map((check) => (
            <div key={check.id} className="check-card">
              <p>{check.question}</p>
              {check.status === 'unanswered' && (
                <button>Think</button>
              )}
              {check.status === 'revealed' && check.answer && (
                <p>{check.answer}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {followups.length > 0 && (
        <div className="followups">
          {followups.map((q) => (
            <button key={q} onClick={() => onFollowupClick?.(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
