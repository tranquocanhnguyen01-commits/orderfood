import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { toJson } from '../utils/to-json.js';
import { hashPassword } from '../utils/hash.js';

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { username: String(username) } });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const hashed = hashPassword(String(password));
  if (hashed !== user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json(toJson({ token, user }));
}
