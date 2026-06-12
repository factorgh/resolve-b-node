import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a string using AES-256-GCM
 * @param text The plaintext string to encrypt
 * @param secret The encryption key passphrase
 * @returns The formatted encrypted string (iv:ciphertext:tag)
 */
export function encrypt(text: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12); // GCM standard IV is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param encryptedText The formatted encrypted string (iv:ciphertext:tag)
 * @param secret The encryption key passphrase
 * @returns The decrypted plaintext string
 */
export function decrypt(encryptedText: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected iv:ciphertext:tag');
  }
  
  const [ivHex, ciphertextHex, tagHex] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}
