import { useCallback } from 'react';
import type { Chat } from '../../shared/types.js';
import { DRAFT_CHAT_ID } from '../../shared/types.js';
import { INITIAL_SURFACE_STATE, type SurfaceState } from './surfaceReducer.js';

type SetState = React.Dispatch<React.SetStateAction<SurfaceState>>;
type SendFn = (data: unknown) => void;

interface ChatActions {
  chats: Chat[];
  activeChatId: string | null;
  isDraftChat: boolean;
  newChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  deleteChats: (chatIds: string[]) => void;
  renameChat: (chatId: string, title: string) => void;
}

export function useChatActions(state: SurfaceState, setState: SetState, send: SendFn): ChatActions {
  const { chats, activeChatId } = state;
  const isDraftChat = activeChatId === DRAFT_CHAT_ID;

  const newChat = useCallback(() => {
    setState(prev => {
      if (prev.activeChatId === DRAFT_CHAT_ID) return prev;
      return {
        ...INITIAL_SURFACE_STATE,
        chats: prev.chats,
        activeChatId: DRAFT_CHAT_ID,
        providerError: null,
      };
    });
  }, [setState]);

  const switchChat = useCallback((chatId: string) => {
    send({ type: 'switch-chat', chatId });
  }, [send]);

  const deleteChat = useCallback((chatId: string) => {
    send({ type: 'delete-chat', chatId });
  }, [send]);

  const deleteChats = useCallback((chatIds: string[]) => {
    if (chatIds.length > 0) send({ type: 'delete-chats', chatIds });
  }, [send]);

  const renameChat = useCallback((chatId: string, title: string) => {
    send({ type: 'rename-chat', chatId, title });
  }, [send]);

  return { chats, activeChatId, isDraftChat, newChat, switchChat, deleteChat, deleteChats, renameChat };
}
