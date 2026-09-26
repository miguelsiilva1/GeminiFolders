import type { OpCode } from '../store/ops';

const en = {
  folders: 'Folders',
  newFolder: 'New folder',
  newSubfolder: 'New subfolder',
  rename: 'Rename',
  addCurrent: 'Add current chat',
  deleteFolder: 'Delete folder',
  confirmDelete: 'Click again to delete',
  removeFromFolder: 'Remove from folder',
  options: 'Options',
  empty: 'Empty folder',
  noFolders: 'Create a folder with +',
  untitled: 'Untitled chat',
  errors: {
    nameLength: 'Folder name must be 1–80 characters.',
    notFound: 'Folder not found.',
    maxDepth: 'Folders can be nested at most 3 levels.',
    intoSelf: "A folder can't be moved into itself.",
    chatAtRoot: 'Chats must be inside a folder.',
    unknownItem: 'Unknown item.',
    folderFull: 'This folder is full. Split it into subfolders.',
    tooManyFolders: 'Too many folders to sync.',
    syncFull: 'Sync storage is full.',
  } satisfies Record<OpCode, string>,
};

const pt: typeof en = {
  folders: 'Pastas',
  newFolder: 'Nova pasta',
  newSubfolder: 'Nova subpasta',
  rename: 'Mudar o nome',
  addCurrent: 'Adicionar chat atual',
  deleteFolder: 'Eliminar pasta',
  confirmDelete: 'Clique de novo para eliminar',
  removeFromFolder: 'Remover da pasta',
  options: 'Opções',
  empty: 'Pasta vazia',
  noFolders: 'Crie uma pasta com +',
  untitled: 'Chat sem título',
  errors: {
    nameLength: 'O nome da pasta deve ter 1–80 caracteres.',
    notFound: 'Pasta não encontrada.',
    maxDepth: 'As pastas só podem ter 3 níveis.',
    intoSelf: 'Uma pasta não pode ser movida para dentro de si própria.',
    chatAtRoot: 'Os chats têm de estar dentro de uma pasta.',
    unknownItem: 'Item desconhecido.',
    folderFull: 'Esta pasta está cheia. Divida-a em subpastas.',
    tooManyFolders: 'Demasiadas pastas para sincronizar.',
    syncFull: 'O armazenamento sincronizado está cheio.',
  },
};

/** Follows Gemini's UI language. */
export const t = (document.documentElement.lang || navigator.language).toLowerCase().startsWith('pt') ? pt : en;
