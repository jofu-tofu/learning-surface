import React, { useState } from 'react';
import type { Chat } from '../../shared/types.js';
import { sortChatsByRecent } from '../../shared/types.js';
import { listContainer, listItemBase, listItemActive, listItemInactive, focusRing } from '../utils/styles.js';
import { Icon } from './Icon.js';

interface ChatListProps {
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
  const [chatIdPendingDelete, setChatIdPendingDelete] = useState<string | null>(null);

  const sortedChats = sortChatsByRecent(chats);

  return (
    <div className={listContainer}>
      {sortedChats.map((chat) => {
        const isActive = chat.id === activeChatId;
        const isConfirming = chatIdPendingDelete === chat.id;

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
                    setChatIdPendingDelete(null);
                  }}
                  className={`text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-500 cursor-pointer ${focusRing}`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setChatIdPendingDelete(null)}
                  className={`text-xs px-2 py-0.5 rounded bg-surface-700 text-surface-300 hover:bg-surface-600 cursor-pointer ${focusRing}`}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => onChatSelect?.(chat.id)}
                className={`${listItemBase} ${isActive ? listItemActive : listItemInactive}`}
              >
                {/* Chat icon */}
                <Icon name="chat" className={`shrink-0 ${isActive ? 'text-accent-500/60' : 'text-surface-500'}`} size={14} />
                <span className="truncate flex-1">{chat.title}</span>
                {/* Delete button — visible on hover */}
                <span
                  role="button"
                  data-testid={`chat-delete-${chat.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatIdPendingDelete(chat.id);
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-surface-600 text-surface-500 hover:text-surface-300 cursor-pointer"
                >
                  <Icon name="close" size={12} />
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
        className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm text-surface-400 hover:bg-surface-700/40 hover:text-surface-200 transition-colors cursor-pointer mt-1 ${focusRing}`}
      >
        <Icon name="plus" className="shrink-0" size={14} />
        <span>New Chat</span>
      </button>
    </div>
  );
}
