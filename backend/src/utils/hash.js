import crypto from 'crypto';

export function hashPassword(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
