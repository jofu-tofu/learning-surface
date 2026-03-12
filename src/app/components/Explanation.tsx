import type { Check } from '../../shared/types.js';

export interface ExplanationProps {
  explanation: string | null;
  checks: Check[];
  followups: string[];
  onFollowupClick?: (question: string) => void;
}

export function Explanation(_props: ExplanationProps): React.ReactElement {
  throw new Error('Not implemented');
}
