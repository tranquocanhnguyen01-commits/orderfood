import 'dotenv/config';
import jwt from 'jsonwebtoken';

function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET in env');
  }

  const payload = {
    id: '2',
    username: 'staff1',
    role: 'staff'
  };

  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  console.log(token);
}

main();
