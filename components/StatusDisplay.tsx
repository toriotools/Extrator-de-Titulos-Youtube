import React from 'react';

interface StatusDisplayProps {
  message: string;
  progressPercentage: number;
  isLoading: boolean;
  isError: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ message, progressPercentage, isLoading, isError }) => {
  const barColor = isError ? 'bg-red-500' : 'bg-sky-500';
  const textColor = isError ? 'text-red-400' : 'text-slate-300';

  return (
    <section aria-live="polite" className="space-y-3 p-4 bg-slate-700/50 rounded-md border border-slate-600/50">
      <p className={`text-md ${textColor}`}>
        {message}
      </p>
      {isLoading && !isError && (
        <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden" title={`Progresso: ${progressPercentage.toFixed(0)}%`}>
          <div
            className={`h-3 rounded-full ${barColor} transition-all duration-300 ease-out`}
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da extração"
          ></div>
        </div>
      )}
    </section>
  );
};

export default StatusDisplay;
