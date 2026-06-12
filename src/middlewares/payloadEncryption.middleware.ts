import { Request, Response, NextFunction } from 'express';
import { encrypt, decrypt } from '../utils/encryption';

export const payloadEncryptionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const encryptionKey = process.env.PAYLOAD_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    console.warn('[Warning] PAYLOAD_ENCRYPTION_KEY is not configured. Payload encryption/decryption bypassed.');
    return next();
  }

  const clientWantsEncryption = req.headers['x-payload-encrypted'] === 'true';

  // 1. Decrypt Request Payload if present and client says it is encrypted
  if (clientWantsEncryption && req.body && req.body.payload) {
    try {
      const decryptedText = decrypt(req.body.payload, encryptionKey);
      req.body = JSON.parse(decryptedText);
    } catch (err) {
      console.error('[Error] Request payload decryption failed:', err);
      res.status(400).json({
        success: false,
        message: 'Invalid encrypted payload signature or decryption key failure.',
        statusCode: 400
      });
      return;
    }
  }

  // 2. Intercept JSON Response to encrypt if necessary
  const originalJson = res.json;
  res.json = function (body: any): Response {
    if (clientWantsEncryption) {
      try {
        const bodyString = JSON.stringify(body);
        const encryptedText = encrypt(bodyString, encryptionKey);
        
        res.setHeader('X-Payload-Encrypted', 'true');
        return originalJson.call(this, { payload: encryptedText });
      } catch (err) {
        console.error('[Error] Response payload encryption failed:', err);
        // Fall back to returning standard error
        res.setHeader('X-Payload-Encrypted', 'false');
        return originalJson.call(this, {
          success: false,
          message: 'Secure channel serialization failure.',
          statusCode: 500
        });
      }
    }
    return originalJson.call(this, body);
  };

  next();
};
