import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './routes/index.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'qr-ordering-backend' });
});

app.get('/order', (_req, res) => {
  res.sendFile(path.join(publicDir, 'order.html'));
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

app.get('/kitchen', (_req, res) => {
  res.sendFile(path.join(publicDir, 'kitchen.html'));
});

app.get('/staff', (_req, res) => {
  res.sendFile(path.join(publicDir, 'staff.html'));
});

app.get('/staff-history', (_req, res) => {
  res.sendFile(path.join(publicDir, 'staff-history.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.use('/api', router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

