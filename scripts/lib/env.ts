// Load .env.local FIRST (Next.js convention — `import 'dotenv/config'` only reads
// `.env` and silently misses it). Import this module before anything that reads
// process.env at module scope.
import { config } from 'dotenv';

config({ path: '.env.local' });
config(); // then .env, without overriding
