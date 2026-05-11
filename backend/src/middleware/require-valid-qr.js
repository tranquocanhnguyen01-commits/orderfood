import { verifyTableSignature } from '../utils/qr-signature.js';

export function requireValidQr(req, res, next) {
  const tableCode = req.query.tableCode || req.body.tableCode;
  const signature = req.query.signature || req.body.signature;

  if (!tableCode || !signature) {
    return res.status(400).json({ message: 'Missing tableCode or signature' });
  }

  const ok = verifyTableSignature(String(tableCode), String(signature), process.env.QR_SIGN_SECRET);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid QR signature' });
  }

  req.tableCode = String(tableCode);
  return next();
}
