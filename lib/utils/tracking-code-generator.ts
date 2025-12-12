/**
 * Unified tracking code generator
 * All tracking codes should use the same generation method for consistency
 */
import { nanoid } from 'nanoid';

/**
 * Generate a unique tracking code
 * Uses nanoid(10) for consistent 10-character codes across all UTM generation points
 * 
 * @returns A 10-character unique tracking code
 */
export function generateTrackingCode(): string {
  return nanoid(10);
}

