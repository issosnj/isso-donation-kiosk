/**
 * Centralized database URL helper for standalone scripts.
 * All backend scripts should use getDatabaseUrl() instead of duplicating env logic.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from backend directory (scripts may run from repo root)
config({ path: resolve(__dirname, '../../.env') });

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error(
      'DATABASE_URL or DATABASE_PUBLIC_URL is required. Set it in .env or pass when running.'
    );
  }
  return url;
}
