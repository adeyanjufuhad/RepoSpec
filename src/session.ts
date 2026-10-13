import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export function sealSession(value: object, secret: string) {
  if (secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function openSession<T extends { expires: number }>(value: string, secret: string): T | null {
  try {
    if (secret.length < 32 || value.length > 8000) return null;
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')) as T;
    return Number.isFinite(result.expires) && result.expires > Date.now() ? result : null;
  } catch { return null; }
}
export function sameSecret(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
