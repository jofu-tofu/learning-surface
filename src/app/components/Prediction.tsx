import React, { useState, useCallback, useMemo } from 'react';
import type { Section, PredictionClaim } from '../../shared/types.js';
import { EmptyState } from './EmptyState.js';
import { ProcessingState } from './ProcessingState.js';
import { Icon } from './Icon.js';
import { useIsProcessing } from '../hooks/ProcessingContext.js';
import { useSurfaceActions } from './panes/SurfaceActionsContext.js';
import type { SecondPaneProps } from './panes/registry.js';

function ClaimInput({ claim, value, onChange }: {
  claim: PredictionClaim;
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  switch (claim.type) {
    case 'choice':
      return (
        <div className="space-y-2">
          {claim.options?.map(option => (
            <label key={option} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name={claim.id}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="w-4 h-4 accent-accent-500"
              />
              <span className={`text-sm ${value === option ? 'text-surface-100' : 'text-surface-300 group-hover:text-surface-200'} transition-colors`}>
                {option}
              </span>
            </label>
          ))}
        </div>
      );
    case 'fill-blank':
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Fill in your answer..."
          className="w-full h-8 bg-surface-700/60 text-surface-100 placeholder:text-surface-500 rounded-lg px-3 text-sm border border-surface-600/30 focus:outline-none focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20"
        />
      );
    case 'free-text':
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Explain your reasoning..."
          rows={3}
          className="w-full bg-surface-700/60 text-surface-100 placeholder:text-surface-500 rounded-lg px-3 py-2 text-sm border border-surface-600/30 focus:outline-none focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20 resize-none"
        />
      );
  }
}

const predictionEmptyIcon = (
  <Icon name="document" className="w-10 h-10" size={40} strokeWidth={1.5} />
);

export function Prediction({ section }: SecondPaneProps): React.ReactElement {
  const { submitResponse } = useSurfaceActions();
  const scaffold = section?.predictionScaffold;
  const isProcessing = useIsProcessing();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const readOnly = scaffold?.claims.every(c => c.value !== null) ?? false;

  const handleChange = useCallback((claimId: string, value: string) => {
    setResponses(prev => ({ ...prev, [claimId]: value }));
  }, []);

  const allFilled = useMemo(() => {
    if (!scaffold) return false;
    return scaffold.claims.every(c => {
      const val = responses[c.id] ?? '';
      return val.trim().length > 0;
    });
  }, [scaffold, responses]);

  const handleSubmit = useCallback(() => {
    if (!section || !scaffold || !allFilled) return;
    submitResponse(section.id, responses);
  }, [section, scaffold, allFilled, responses, submitResponse]);

  if (!scaffold) {
    return (
      <div className="explanation-pane space-y-6">
        {isProcessing
          ? <ProcessingState message="Generating prediction scaffold..." />
          : <EmptyState icon={predictionEmptyIcon} message="Select a section to see its predictions" />}
      </div>
    );
  }

  return (
    <div className="explanation-pane space-y-6">
      {/* Framing question */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-surface-50">Make your predictions</h3>
        <p className="text-sm text-surface-300">{scaffold.question}</p>
      </div>

      {/* Claims */}
      <div className="space-y-5">
        {scaffold.claims.map(claim => (
          <div key={claim.id} className="space-y-2">
            <p className="text-sm font-medium text-surface-200">{claim.prompt}</p>
            {readOnly ? (
              <p className="text-sm text-accent-400 italic">{claim.value}</p>
            ) : (
              <ClaimInput
                claim={claim}
                value={responses[claim.id] ?? ''}
                onChange={val => handleChange(claim.id, val)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      {!readOnly && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled || isProcessing}
          className="w-full h-10 bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Submitting...' : 'Submit predictions'}
        </button>
      )}

      {/* Processing indicator when predictions are submitted and AI is generating explanation */}
      {readOnly && isProcessing && (
        <ProcessingState message="Generating explanation based on your predictions..." />
      )}
    </div>
  );
}
