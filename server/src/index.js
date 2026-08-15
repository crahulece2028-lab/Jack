import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 5000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Note app API listening on http://localhost:${port}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
