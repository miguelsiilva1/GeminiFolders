import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: 'GeminiFolders',
    description: 'Organize Gemini chats into folders with drag and drop.',
    permissions: ['storage'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
  },
  // Load the build unpacked in your own Chrome profile (logged into Gemini).
  webExt: { disabled: true },
});
