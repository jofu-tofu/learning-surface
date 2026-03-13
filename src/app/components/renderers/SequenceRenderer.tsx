import React, { useId, useMemo } from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';

// --- Data Shape ---

interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
}

interface SequenceData {
  actors: string[];
  messages: SequenceMessage[];
}

// --- Constants ---

const ACTOR_W = 120;
const ACTOR_H = 36;
const ACTOR_GAP = 40;
const MSG_H = 48;
const PAD = 24;
const LIFELINE_GAP = 12;

// --- Parsing ---

export function parseSequenceData(content: string): SequenceData | null {
  try {
    const raw = JSON.parse(content);
    if (!Array.isArray(raw.actors) || !Array.isArray(raw.messages)) return null;
    if (raw.actors.some((a: unknown) => typeof a !== 'string')) return null;
    for (const m of raw.messages) {
      if (typeof m.from !== 'string' || typeof m.to !== 'string' || typeof m.label !== 'string') return null;
    }
    return raw as SequenceData;
  } catch {
    return null;
  }
}

// --- Component ---

export function SequenceRenderer({ content }: RendererProps): React.ReactElement {
  const rawId = useId();
  const markerId = rawId.replace(/:/g, '');
  const data = useMemo(() => parseSequenceData(content), [content]);

  if (!data) {
    return <ErrorBanner message="Invalid sequence data — expected JSON with actors and messages arrays" />;
  }

  if (data.actors.length === 0) {
    return <div className="text-sm text-surface-400">Empty sequence diagram</div>;
  }

  const colW = ACTOR_W + ACTOR_GAP;
  const width = data.actors.length * colW - ACTOR_GAP + 2 * PAD;
  const lifelineTop = PAD + ACTOR_H + LIFELINE_GAP;
  const msgsHeight = Math.max(data.messages.length * MSG_H, MSG_H);
  const bottomActorY = lifelineTop + msgsHeight + LIFELINE_GAP;
  const height = bottomActorY + ACTOR_H + PAD;

  const actorX = (name: string): number => {
    const idx = data.actors.indexOf(name);
    return idx === -1 ? -1 : PAD + idx * colW + ACTOR_W / 2;
  };

  return (
    <div data-testid="canvas-sequence" className="canvas-container flex justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: '600px' }}
      >
        <defs>
          <marker
            id={`seq-arrow-${markerId}`}
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="var(--color-accent-400)" fillOpacity={0.7} />
          </marker>
          <marker
            id={`seq-arrow-d-${markerId}`}
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="var(--color-surface-400)" fillOpacity={0.6} />
          </marker>
        </defs>

        {/* Actor boxes (top) */}
        {data.actors.map((name, i) => {
          const cx = PAD + i * colW + ACTOR_W / 2;
          return (
            <g key={`actor-t-${i}`}>
              <rect
                x={cx - ACTOR_W / 2}
                y={PAD}
                width={ACTOR_W}
                height={ACTOR_H}
                rx={8}
                fill="var(--color-surface-800)"
                stroke="var(--color-surface-600)"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={PAD + ACTOR_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-surface-100)"
                fontSize={13}
                fontFamily="var(--font-sans)"
                fontWeight={500}
              >
                {name}
              </text>
            </g>
          );
        })}

        {/* Lifelines */}
        {data.actors.map((_, i) => {
          const cx = PAD + i * colW + ACTOR_W / 2;
          return (
            <line
              key={`ll-${i}`}
              x1={cx}
              y1={lifelineTop}
              x2={cx}
              y2={lifelineTop + msgsHeight}
              stroke="var(--color-surface-600)"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Messages */}
        {data.messages.map((msg, i) => {
          const y = lifelineTop + i * MSG_H + MSG_H / 2;
          const fromX = actorX(msg.from);
          const toX = actorX(msg.to);

          if (fromX < 0 || toX < 0) return null; // unknown actor

          const isSelf = msg.from === msg.to;
          const strokeColor = msg.dashed ? 'var(--color-surface-400)' : 'var(--color-accent-400)';
          const strokeOp = msg.dashed ? 0.6 : 0.7;
          const marker = msg.dashed
            ? `url(#seq-arrow-d-${markerId})`
            : `url(#seq-arrow-${markerId})`;

          if (isSelf) {
            const loopW = 40;
            const loopH = 24;
            return (
              <g key={`msg-${i}`}>
                <path
                  d={`M ${fromX} ${y} L ${fromX + loopW} ${y} L ${fromX + loopW} ${y + loopH} L ${fromX + 4} ${y + loopH}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeOpacity={strokeOp}
                  strokeWidth={1.5}
                  strokeDasharray={msg.dashed ? '4 3' : undefined}
                  markerEnd={marker}
                />
                <text
                  x={fromX + loopW + 6}
                  y={y + loopH / 2}
                  dominantBaseline="central"
                  fill="var(--color-surface-300)"
                  fontSize={11}
                  fontFamily="var(--font-sans)"
                >
                  {msg.label}
                </text>
              </g>
            );
          }

          return (
            <g key={`msg-${i}`}>
              <line
                x1={fromX}
                y1={y}
                x2={toX}
                y2={y}
                stroke={strokeColor}
                strokeOpacity={strokeOp}
                strokeWidth={1.5}
                strokeDasharray={msg.dashed ? '4 3' : undefined}
                markerEnd={marker}
              />
              <text
                x={(fromX + toX) / 2}
                y={y - 8}
                textAnchor="middle"
                fill="var(--color-surface-300)"
                fontSize={11}
                fontFamily="var(--font-sans)"
              >
                {msg.label}
              </text>
            </g>
          );
        })}

        {/* Actor boxes (bottom) */}
        {data.actors.map((name, i) => {
          const cx = PAD + i * colW + ACTOR_W / 2;
          return (
            <g key={`actor-b-${i}`}>
              <rect
                x={cx - ACTOR_W / 2}
                y={bottomActorY}
                width={ACTOR_W}
                height={ACTOR_H}
                rx={8}
                fill="var(--color-surface-800)"
                stroke="var(--color-surface-600)"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={bottomActorY + ACTOR_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-surface-100)"
                fontSize={13}
                fontFamily="var(--font-sans)"
                fontWeight={500}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
