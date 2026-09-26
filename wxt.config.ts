import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: 'GeminiFolders',
    description: 'Organize Gemini chats into folders with drag and drop.',
    permissions: ['storage'],
    // Fixed public key = same extension ID on every computer, so chrome.storage.sync data is shared
    // across installs (unpacked extensions otherwise get an ID derived from their folder path).
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmU5UOeWGvvFxKpINfWUAyJu3Ane5E8ECWA8zRdr3YDt+feajEWRl5Xj7sI/9JDFHeXSK8gREMlYhp5nieltw5CZ8vOp27mz93Z2enurmbqrZ1kJ+aUEnNPmmo7ulpyGYLk0GSqb7wk5ObpcKQ+RsjLlpZlmMBWvF2u0lE8yseDBKZ1CHFhgb53AAm9+tflp5akUCUtwjBUII4mITotuYQ8iOWRBpWfrO+qyb784PHBhDhP6NIZ6FNEr10DmVggb9fl9g4jgZCc9g9n+mvPyLcX7XB7/CHTX9lar0fapB56Un7De3GKAmoZH76J9fC88OaoDw2meCS4K3ReuHCu6GbwIDAQAB',
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
  },
  // Load the build unpacked in your own Chrome profile (logged into Gemini).
  webExt: { disabled: true },
});
