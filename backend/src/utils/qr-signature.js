import crypto from 'crypto';

export function signTableCode(tableCode, secret) {
  return crypto.createHmac('sha256', secret).update(tableCode).digest('hex');
}

export function verifyTableSignature(tableCode, signature, secret) {
  const expected = signTableCode(tableCode, secret);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
