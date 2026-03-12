import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-surface-500">
      <div className="w-10 h-10 mb-3 text-surface-600">
        {icon}
      </div>
      <p className="text-sm italic">{message}</p>
    </div>
  );
}
