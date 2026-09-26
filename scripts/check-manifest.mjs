// Fails if the built manifest asks for more than the extension needs.
// Run after `npm run build`.
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('.output/chrome-mv3/manifest.json', 'utf8'));
const errors = [];
const expect = (ok, message) => ok || errors.push(message);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

expect(manifest.manifest_version === 3, 'must be Manifest V3');
expect(same(manifest.permissions, ['storage']), `permissions must be exactly ["storage"], got ${JSON.stringify(manifest.permissions)}`);
expect(!manifest.host_permissions?.length, 'no host_permissions allowed');
expect(!manifest.optional_permissions?.length && !manifest.optional_host_permissions?.length, 'no optional permissions allowed');
expect(!manifest.web_accessible_resources, 'no web_accessible_resources (the page could detect the extension)');
expect(!manifest.externally_connectable, 'no externally_connectable');
expect(!manifest.background, 'no background worker expected');
expect(
  manifest.content_scripts?.every((cs) => same(cs.matches, ['https://gemini.google.com/*']) && !cs.world),
  'content scripts must only match https://gemini.google.com/* in the isolated world',
);
expect(
  manifest.content_security_policy?.extension_pages?.includes("connect-src 'none'"),
  "extension pages CSP must include connect-src 'none'",
);
expect(typeof manifest.key === 'string' && manifest.key.length > 0, 'manifest key (stable extension ID) is missing');

if (errors.length) {
  console.error('Manifest check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Manifest check passed.');
