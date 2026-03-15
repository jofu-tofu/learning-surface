import React, { useState, useRef, useEffect } from 'react';
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
  onRenameChat?: (chatId: string, title: string) => void;
}

export function ChatList({
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: ChatListProps): React.ReactElement {
  const [chatIdPendingDelete, setChatIdPendingDelete] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  function startRename(chat: Chat) {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
    setChatIdPendingDelete(null);
  }

  function commitRename() {
    if (editingChatId && editingTitle.trim()) {
      onRenameChat?.(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  }

  function cancelRename() {
    setEditingChatId(null);
    setEditingTitle('');
  }

  const sortedChats = sortChatsByRecent(chats);

  return (
    <div className={listContainer}>
      {sortedChats.map((chat) => {
        const isActive = chat.id === activeChatId;
        const isConfirming = chatIdPendingDelete === chat.id;
        const isEditing = editingChatId === chat.id;

        return (
          <div
            key={chat.id}
            data-testid={`chat-${chat.id}`}
            className="group relative"
          >
            {isConfirming ? (
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-danger-bg border border-danger-border">
                <span className="text-xs text-danger-text flex-1 truncate">Delete this chat?</span>
                <button
                  data-testid={`chat-delete-confirm-${chat.id}`}
                  onClick={() => {
                    onDeleteChat?.(chat.id);
                    setChatIdPendingDelete(null);
                  }}
                  className={`text-xs px-2 py-0.5 rounded bg-danger-solid text-inverse-text hover:bg-danger-solid/80 cursor-pointer ${focusRing}`}
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
            ) : isEditing ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700/60 border border-accent-500/40">
                <Icon name="chat" className="shrink-0 text-accent-500/60" size={14} />
                <input
                  ref={editInputRef}
                  data-testid={`chat-rename-input-${chat.id}`}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  onBlur={commitRename}
                  className="flex-1 min-w-0 bg-transparent text-sm text-surface-100 outline-none placeholder:text-surface-500"
                  placeholder="Chat title"
                />
              </div>
            ) : (
              <button
                onClick={() => onChatSelect?.(chat.id)}
                onDoubleClick={() => startRename(chat)}
                className={`${listItemBase} ${isActive ? listItemActive : listItemInactive}`}
              >
                {/* Chat icon */}
                <Icon name="chat" className={`shrink-0 ${isActive ? 'text-accent-500/60' : 'text-surface-500'}`} size={14} />
                <span className="truncate flex-1">{chat.title}</span>
                {/* Action buttons — visible on hover */}
                <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    role="button"
                    data-testid={`chat-rename-${chat.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(chat);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-600 text-surface-500 hover:text-surface-300 cursor-pointer"
                  >
                    <Icon name="edit" size={11} />
                  </span>
                  <span
                    role="button"
                    data-testid={`chat-delete-${chat.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatIdPendingDelete(chat.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-600 text-surface-500 hover:text-surface-300 cursor-pointer"
                  >
                    <Icon name="close" size={12} />
                  </span>
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
