import React, { useState } from 'react';
import type { Chat } from '../../shared/types.js';

export interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export function ChatList({
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}: ChatListProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-1 px-2">
      {sorted.map((chat) => {
        const isActive = chat.id === activeChatId;
        const isConfirming = confirmDelete === chat.id;

        return (
          <div
            key={chat.id}
            data-testid={`chat-${chat.id}`}
            className="group relative"
          >
            {isConfirming ? (
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-500/30">
                <span className="text-xs text-red-300 flex-1 truncate">Delete this chat?</span>
                <button
                  data-testid={`chat-delete-confirm-${chat.id}`}
                  onClick={() => {
                    onDeleteChat?.(chat.id);
                    setConfirmDelete(null);
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-500 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs px-2 py-0.5 rounded bg-surface-700 text-surface-300 hover:bg-surface-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => onChatSelect?.(chat.id)}
                className={`
                  flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400
                  ${isActive
                    ? 'bg-accent-600/15 text-accent-400 font-medium shadow-sm shadow-accent-500/5'
                    : 'text-surface-300 hover:bg-surface-700/40 hover:text-surface-100'
                  }
                `}
              >
                {/* Chat icon */}
                <svg className={`shrink-0 w-3.5 h-3.5 ${isActive ? 'text-accent-500/60' : 'text-surface-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="truncate flex-1">{chat.title}</span>
                {/* Delete button — visible on hover */}
                <span
                  role="button"
                  data-testid={`chat-delete-${chat.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(chat.id);
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-surface-600 text-surface-500 hover:text-surface-300 cursor-pointer"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        );
      })}

      {/* New chat button */}
      <button
        data-testid="new-chat-btn"
        onClick={() => onNewChat?.()}
        className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm text-surface-400 hover:bg-surface-700/40 hover:text-surface-200 transition-colors cursor-pointer mt-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
      >
        <svg className="shrink-0 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>New Chat</span>
      </button>
    </div>
  );
}
