import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { mono } from '../styles';

export const microLabel: CSSProperties = {
  ...mono,
  fontSize: 9,
  letterSpacing: '0.36em',
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
};

export function ScaffoldFooter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...mono,
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'rgba(255,255,255,0.42)',
        textTransform: 'uppercase',
        marginTop: 14,
        paddingTop: 10,
        borderTop: '1px dashed rgba(108,244,255,0.18)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  );
}

export function RelativeTime({ ts }: { ts: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, Date.now() - ts);
  let label: string;
  if (diff < 60_000) label = 'now';
  else if (diff < 3_600_000) label = `${Math.floor(diff / 60_000)}m`;
  else if (diff < 86_400_000) label = `${Math.floor(diff / 3_600_000)}h`;
  else label = `${Math.floor(diff / 86_400_000)}d`;
  return <span>{label}</span>;
}
