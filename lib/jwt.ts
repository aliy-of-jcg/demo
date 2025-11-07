import jwt from 'jsonwebtoken';

// const JWT_SECRET = process.env.JWT_SECRET;
// if(!JWT_SECRET) {
//   throw new Error("JWT_SECRET environment variable is required")
// }

   const JWT_SECRET = process.env.JWT_SECRET!;
   if (!JWT_SECRET) {
     throw new Error('JWT_SECRET environment variable is required');
   }

const JWT_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  userId: number;
  uuid: string;
  email: string;
  user_type: string;
  company_name: string;
  contact_number: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
      issuer: 'admin-panel',
      audience: 'admin-panel-users',
    }
  );
}

// Verify and decode JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'admin-panel',
      audience: 'admin-panel-users',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('JWT token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT token invalid:', error.message);
    } else {
      console.error('JWT verification failed:', error);
    }
    return null;
  }
}

// Decode without verification (for client-side display only - DO NOT use for authentication)
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

// Get token expiration date
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
}
