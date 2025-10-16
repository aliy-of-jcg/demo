import crypto from 'crypto';

// AES-256-GCM encryption (authenticated encryption)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Derives a key from the secret using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The text to encrypt
 * @param secret - The encryption secret (from env)
 * @returns Base64 encoded encrypted data with IV and auth tag
 */
export function encrypt(text: string, secret?: string): string {
  try {
    const encryptionSecret = secret || process.env.ENCRYPTION_SECRET;
    
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET is not set');
    }

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key from secret
    const key = deriveKey(encryptionSecret, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    // Return as base64 (URL-safe)
    return combined.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts AES-256-GCM encrypted data
 * @param encryptedData - Base64 encoded encrypted data
 * @param secret - The encryption secret (from env)
 * @returns Decrypted text
 */
export function decrypt(encryptedData: string, secret?: string): string {
  try {
    const encryptionSecret = secret || process.env.ENCRYPTION_SECRET;
    
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET is not set');
    }

    // Convert from URL-safe base64
    const base64 = encryptedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const combined = Buffer.from(base64 + padding, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH, 
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Derive key
    const key = deriveKey(encryptionSecret, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generates a secure random encryption secret
 * Use this to generate a secret for your .env.local file
 */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a hash of data (for verification/signing)
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies if a hash matches the data
 */
export function verifyHash(data: string, hash: string): boolean {
  const computed = crypto.createHash('sha256').update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

