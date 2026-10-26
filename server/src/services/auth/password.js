import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';

const DUMMY_PASSWORD_HASH =
  '$2b$12$UF1rGQVKv6feF7W4V9Flqu2ZxTQaUVih0fyW/yiy5XlHwMbu2tzn2';

export function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function runDummyPasswordCheck(password) {
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}
