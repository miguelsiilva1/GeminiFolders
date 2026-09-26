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
  removeFromPanel: 'Remove from Folders',
  options: 'Options',
  empty: 'Empty folder',
  noFolders: 'Create a folder with + or drag chats here',
  untitled: 'Untitled chat',
  errors: {
    nameLength: 'Folder name must be 1–80 characters.',
    notFound: 'Folder not found.',
    maxDepth: 'Folders can be nested at most 3 levels.',
    intoSelf: "A folder can't be moved into itself.",
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
  removeFromPanel: 'Remover das Pastas',
  options: 'Opções',
  empty: 'Pasta vazia',
  noFolders: 'Crie uma pasta com + ou arraste chats para aqui',
  untitled: 'Chat sem título',
  errors: {
    nameLength: 'O nome da pasta deve ter 1–80 caracteres.',
    notFound: 'Pasta não encontrada.',
    maxDepth: 'As pastas só podem ter 3 níveis.',
    intoSelf: 'Uma pasta não pode ser movida para dentro de si própria.',
    unknownItem: 'Item desconhecido.',
    folderFull: 'Esta pasta está cheia. Divida-a em subpastas.',
    tooManyFolders: 'Demasiadas pastas para sincronizar.',
    syncFull: 'O armazenamento sincronizado está cheio.',
  },
};

/** Follows Gemini's UI language. */
export const t = (document.documentElement.lang || navigator.language).toLowerCase().startsWith('pt') ? pt : en;
