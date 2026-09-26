import { z } from 'zod';

export const CHAT_ID = /^[a-f0-9]{8,}$/;
// "-" is not a hex char, so folder ids can never collide with chat ids.
export const FOLDER_ID = /^F-[a-z0-9]{6,}$/;
export const MAX_DEPTH = 3;
export const MAX_NAME = 80;

export const isChatId = (id: string) => CHAT_ID.test(id);
export const isFolderId = (id: string) => FOLDER_ID.test(id);

const itemId = z.string().refine((id) => isChatId(id) || isFolderId(id));

export const folderSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  /** Chat ids and child folder ids, in display order. */
  order: z.array(itemId),
});

export const stateSchema = z.object({
  v: z.literal(1),
  /** Top level of the panel: folders and chats without a folder, in display order. */
  rootOrder: z.array(itemId),
  folders: z.record(z.string().regex(FOLDER_ID), folderSchema),
});

export type Folder = z.infer<typeof folderSchema>;
export type State = z.infer<typeof stateSchema>;
