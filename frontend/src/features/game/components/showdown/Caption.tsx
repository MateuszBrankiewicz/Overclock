import React from 'react';

export const Caption: React.FC<{
  main: React.ReactNode;
  detail?: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ main, detail, aside }) => (
  <div className="flex min-w-0 items-center gap-2">
    <div className="flex min-w-0 flex-1 flex-col leading-tight sm:min-w-[9rem]">
      <span className="truncate text-[11px] font-black tracking-[0.14em] sm:text-sm">
        {main}
      </span>
      {detail && (
        <span className="truncate text-[10px] font-bold tracking-wide sm:text-xs">
          {detail}
        </span>
      )}
    </div>
    {aside}
  </div>
);
