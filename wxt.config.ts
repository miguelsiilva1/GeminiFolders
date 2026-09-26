import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
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
