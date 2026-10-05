/** Identity comes only from headers supplied by the Sites dispatcher, never the body.
 * Older dispatch sessions supply verified email but omit the newer opaque ID.
 * Keep existing ID-based records intact; namespace the legacy compatibility key.
 */
export async function authenticatedUserKey(request: Request): Promise<string | null> {
  const id = request.headers.get('oai-authenticated-user-id')?.trim();
  if (id) return id;
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (!email) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('oslo-hide-seek:legacy-email:' + email));
  return 'legacy-email:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
