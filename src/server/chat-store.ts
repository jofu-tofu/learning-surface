import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import type { Chat } from '../shared/types.js';

export interface ChatStore {
  init(dataDir: string): Promise<void>;
  listChats(): Chat[];
  createChat(): Chat;
  getChat(chatId: string): Chat | undefined;
  updateChatTitle(chatId: string, title: string): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  getChatDir(chatId: string): string;
  save(): Promise<void>;
}

export function createChatStore(): ChatStore {
  let dataDir: string;
  let chats: Chat[] = [];

  function indexPath(): string {
    return join(dataDir, 'chats.json');
  }

  function chatDir(chatId: string): string {
    return join(dataDir, 'chats', chatId);
  }

  return {
    async init(dir: string): Promise<void> {
      dataDir = dir;
      await mkdir(join(dir, 'chats'), { recursive: true });

      if (existsSync(indexPath())) {
        const raw = await readFile(indexPath(), 'utf-8');
        chats = JSON.parse(raw) as Chat[];
      } else {
        chats = [];
        await writeFile(indexPath(), JSON.stringify(chats), 'utf-8');
      }
    },

    listChats(): Chat[] {
      return [...chats];
    },

    createChat(): Chat {
      const now = new Date().toISOString();
      const chat: Chat = {
        id: nanoid(10),
        title: 'New Chat',
        createdAt: now,
        updatedAt: now,
      };
      chats.push(chat);
      return chat;
    },

    getChat(chatId: string): Chat | undefined {
      return chats.find((c) => c.id === chatId);
    },

    async updateChatTitle(chatId: string, title: string): Promise<void> {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      chat.title = title;
      chat.updatedAt = new Date().toISOString();
      await this.save();
    },

    async deleteChat(chatId: string): Promise<void> {
      const idx = chats.findIndex((c) => c.id === chatId);
      if (idx === -1) return;
      chats.splice(idx, 1);

      const dir = chatDir(chatId);
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
      }

      await this.save();
    },

    getChatDir(chatId: string): string {
      return chatDir(chatId);
    },

    async save(): Promise<void> {
      await writeFile(indexPath(), JSON.stringify(chats, null, 2), 'utf-8');
    },
  };
}
