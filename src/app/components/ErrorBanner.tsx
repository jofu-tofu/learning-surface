import React from 'react';

export function ErrorBanner({ message }: { message: string }): React.ReactElement {
  return (
    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      {message}
    </div>
  );
}
