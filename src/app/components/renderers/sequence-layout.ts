// --- Data Shape ---

export interface SequenceParticipant {
  id: string;
  label: string;
}

export interface SequenceMessage {
  from: string;
  to: string;
  label?: string;
  type?: 'solid' | 'dashed';
  group?: string;
}

export interface SequenceData {
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
}

// --- Layout Constants ---

const PARTICIPANT_WIDTH = 120;
const PARTICIPANT_HEIGHT = 36;
const PARTICIPANT_GAP = 60;
const MESSAGE_SPACING = 48;
const PADDING = 32;
const SELF_MESSAGE_WIDTH = 30;
const GROUP_PADDING = 12;
const GROUP_LABEL_HEIGHT = 20;

export const SEQUENCE_CONSTANTS = {
  PARTICIPANT_WIDTH,
  PARTICIPANT_HEIGHT,
  PARTICIPANT_GAP,
  MESSAGE_SPACING,
  PADDING,
  SELF_MESSAGE_WIDTH,
  GROUP_PADDING,
  GROUP_LABEL_HEIGHT,
} as const;

// --- Positioned Types ---

export interface PositionedParticipant extends SequenceParticipant {
  x: number;  // center x of participant box
  y: number;  // top of participant box
  width: number;
  height: number;
}

export interface PositionedMessage extends SequenceMessage {
  index: number;
  x1: number;  // start x (center of from-participant lifeline)
  x2: number;  // end x (center of to-participant lifeline)
  y: number;   // vertical position
  isSelf: boolean;  // from === to
}

export interface PositionedGroup {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SequenceLayout {
  participants: PositionedParticipant[];
  messages: PositionedMessage[];
  groups: PositionedGroup[];
  lifelineTop: number;
  lifelineBottom: number;
  width: number;
  height: number;
}

// --- Parsing ---

export function parseSequenceData(content: string): SequenceData | null {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.participants)) return null;
    if (!Array.isArray(parsed.messages)) return null;
    for (const p of parsed.participants) {
      if (typeof p.id !== 'string' || typeof p.label !== 'string') return null;
    }
    for (const m of parsed.messages) {
      if (typeof m.from !== 'string' || typeof m.to !== 'string') return null;
    }
    return parsed as SequenceData;
  } catch {
    return null;
  }
}

// --- Layout Computation ---

export function computeSequenceLayout(data: SequenceData): SequenceLayout {
  const { participants, messages } = data;

  if (participants.length === 0) {
    return {
      participants: [],
      messages: [],
      groups: [],
      lifelineTop: PADDING + PARTICIPANT_HEIGHT + 24,
      lifelineBottom: PADDING + PARTICIPANT_HEIGHT + 24,
      width: PADDING * 2,
      height: PADDING * 2 + PARTICIPANT_HEIGHT + 24,
    };
  }

  // Position participants horizontally
  const participantMap = new Map<string, number>();
  const positionedParticipants: PositionedParticipant[] = [];

  for (let i = 0; i < participants.length; i++) {
    const leftEdge = PADDING + i * (PARTICIPANT_WIDTH + PARTICIPANT_GAP);
    const centerX = leftEdge + PARTICIPANT_WIDTH / 2;
    participantMap.set(participants[i].id, centerX);
    positionedParticipants.push({
      ...participants[i],
      x: centerX,
      y: PADDING,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
    });
  }

  const lifelineTop = PADDING + PARTICIPANT_HEIGHT + 24;

  // Position messages, skipping those referencing non-existent participants
  const positionedMessages: PositionedMessage[] = [];
  let messageIndex = 0;

  for (const msg of messages) {
    const fromX = participantMap.get(msg.from);
    const toX = participantMap.get(msg.to);
    if (fromX === undefined || toX === undefined) continue;

    const isSelf = msg.from === msg.to;
    const y = lifelineTop + messageIndex * MESSAGE_SPACING;

    positionedMessages.push({
      ...msg,
      index: messageIndex,
      x1: fromX,
      x2: toX,
      y,
      isSelf,
    });

    messageIndex++;
  }

  // Compute lifelineBottom
  const lifelineBottom = positionedMessages.length > 0
    ? positionedMessages[positionedMessages.length - 1].y + MESSAGE_SPACING
    : lifelineTop + MESSAGE_SPACING;

  // Compute total width
  const totalWidth = PADDING * 2 + participants.length * PARTICIPANT_WIDTH + (participants.length - 1) * PARTICIPANT_GAP;

  // Compute groups from contiguous message runs with same group value
  const groups: PositionedGroup[] = [];
  const groupInset = PADDING / 2;

  let i = 0;
  while (i < positionedMessages.length) {
    const msg = positionedMessages[i];
    if (!msg.group) {
      i++;
      continue;
    }

    const groupLabel = msg.group;
    const startIdx = i;

    // Find contiguous run with same group
    while (i < positionedMessages.length && positionedMessages[i].group === groupLabel) {
      i++;
    }

    const endIdx = i - 1;
    const firstMsg = positionedMessages[startIdx];
    const lastMsg = positionedMessages[endIdx];

    groups.push({
      label: groupLabel,
      x: groupInset,
      y: firstMsg.y - GROUP_PADDING - GROUP_LABEL_HEIGHT,
      width: totalWidth - groupInset * 2,
      height: (lastMsg.y - firstMsg.y) + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
    });
  }

  const totalHeight = lifelineBottom + PADDING;

  return {
    participants: positionedParticipants,
    messages: positionedMessages,
    groups,
    lifelineTop,
    lifelineBottom,
    width: totalWidth,
    height: totalHeight,
  };
}
