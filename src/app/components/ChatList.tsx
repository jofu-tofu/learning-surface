import React, { useState, useRef, useEffect } from 'react';
import type { Chat } from '../../shared/session.js';
import { sortChatsByRecent } from '../../shared/session.js';
import { listContainer, listItemBase, listItemActive, listItemInactive, focusRing } from '../utils/styles.js';
import { Icon } from './Icon.js';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  /** True when the app is in draft mode (no chat created yet). */
  isDraftChat?: boolean;
  /** Controlled select mode — toggled by parent (e.g. header button). */
  selectMode?: boolean;
  onExitSelectMode?: () => void;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (chatId: string) => void;
  onDeleteChats?: (chatIds: string[]) => void;
  onRenameChat?: (chatId: string, title: string) => void;
}

export function ChatList({
  chats,
  activeChatId,
  isDraftChat = false,
  selectMode: selectModeProp = false,
  onExitSelectMode,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onDeleteChats,
  onRenameChat,
}: ChatListProps): React.ReactElement {
  const [chatIdPendingDelete, setChatIdPendingDelete] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const lastClickedIdRef = useRef<string | null>(null);

  const effectiveSelectMode = selectModeProp && chats.length > 0;

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

  function handleSelectClick(chatId: string, shiftKey: boolean) {
    if (shiftKey && lastClickedIdRef.current && lastClickedIdRef.current !== chatId) {
      // Shift-click: select range between last clicked and current
      const ids = sortedChats.map(c => c.id);
      const fromIdx = ids.indexOf(lastClickedIdRef.current);
      const toIdx = ids.indexOf(chatId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) next.add(ids[i]);
          return next;
        });
        lastClickedIdRef.current = chatId;
        return;
      }
    }

    // Normal click: toggle single item
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
    lastClickedIdRef.current = chatId;
  }

  function handleExitSelectMode() {
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    lastClickedIdRef.current = null;
    onExitSelectMode?.();
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    onDeleteChats?.([...selectedIds]);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    lastClickedIdRef.current = null;
    onExitSelectMode?.();
  }

  return (
    <div className={listContainer}>
      {/* Select mode toolbar */}
      {effectiveSelectMode && (
        <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 border-b border-surface-700/30">
          {confirmBulkDelete ? (
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-xs text-danger-text flex-1 truncate">
                Delete {selectedIds.size} chat{selectedIds.size !== 1 ? 's' : ''}?
              </span>
              <button
                data-testid="bulk-delete-confirm"
                onClick={handleBulkDelete}
                className={`text-xs px-2 py-0.5 rounded bg-danger-solid text-inverse-text hover:bg-danger-solid/80 cursor-pointer ${focusRing}`}
              >
                Yes
              </button>
              <button
                data-testid="bulk-delete-cancel"
                onClick={() => setConfirmBulkDelete(false)}
                className={`text-xs px-2 py-0.5 rounded bg-surface-700 text-surface-300 hover:bg-surface-600 cursor-pointer ${focusRing}`}
              >
                No
              </button>
            </div>
          ) : (
            <>
              <span className="text-xs text-surface-500">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Shift-click to select range'}
              </span>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <button
                  data-testid="bulk-delete-btn"
                  onClick={() => setConfirmBulkDelete(true)}
                  className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-danger-text hover:bg-danger-bg cursor-pointer ${focusRing}`}
                >
                  <Icon name="trash" size={11} />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              )}
              <button
                data-testid="exit-select-btn"
                onClick={handleExitSelectMode}
                className={`text-xs px-1.5 py-0.5 rounded text-surface-400 hover:text-surface-200 hover:bg-surface-700/40 cursor-pointer ${focusRing}`}
              >
                Done
              </button>
            </>
          )}
        </div>
      )}

      {sortedChats.map((chat) => {
        const isActive = chat.id === activeChatId;
        const isConfirming = chatIdPendingDelete === chat.id;
        const isEditing = editingChatId === chat.id;
        const isSelected = selectedIds.has(chat.id);

        return (
          <div
            key={chat.id}
            data-testid={`chat-${chat.id}`}
            className="group relative"
          >
            {isConfirming && !effectiveSelectMode ? (
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
            ) : isEditing && !effectiveSelectMode ? (
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
                onClick={(e) => effectiveSelectMode ? handleSelectClick(chat.id, e.shiftKey) : onChatSelect?.(chat.id)}
                onDoubleClick={() => !effectiveSelectMode && startRename(chat)}
                className={`${listItemBase} ${!effectiveSelectMode && isActive && !isDraftChat ? listItemActive : isSelected ? 'bg-accent-600/10 border border-accent-500/30 text-surface-200' : listItemInactive}`}
              >
                {effectiveSelectMode ? (
                  <span
                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-accent-600 border-accent-500 text-inverse-text'
                        : 'border-surface-500 text-transparent'
                    }`}
                  >
                    <Icon name="check" size={10} strokeWidth={3} />
                  </span>
                ) : (
                  <Icon name="chat" className={`shrink-0 ${isActive && !isDraftChat ? 'text-accent-500/60' : 'text-surface-500'}`} size={14} />
                )}
                <span className="truncate flex-1">{chat.title}</span>
                {/* Action buttons — visible on hover (hidden in select mode) */}
                {!effectiveSelectMode && (
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
                )}
              </button>
            )}
          </div>
        );
      })}

      {/* New chat button — highlighted when in draft mode */}
      <button
        data-testid="new-chat-btn"
        onClick={() => onNewChat?.()}
        className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-1 ${focusRing} ${
          isDraftChat
            ? 'bg-accent-600/15 text-accent-400 font-medium border border-accent-500/30'
            : 'text-surface-400 hover:bg-surface-700/40 hover:text-surface-200'
        }`}
      >
        <Icon name="plus" className="shrink-0" size={14} />
        <span>New Chat</span>
      </button>
    </div>
  );
}
