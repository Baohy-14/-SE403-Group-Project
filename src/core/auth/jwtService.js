/**
 * RFC 7519 Compliant JWT Service (HS256 via Node.js native node:crypto)
 * Signs and verifies cryptographic JWT access tokens carrying RBAC & ABAC claims:
 * { sub, username, role, facility_id, mpi_id, iat, exp }
 */

const crypto = require('crypto');
const config = require('../config');

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

class JwtService {
  sign(claims, expiresInSec = 3600) {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      ...claims,
      iat: nowSec,
      exp: nowSec + expiresInSec
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', config.JWT_SECRET)
      .update(signingInput, 'utf8')
      .digest();

    return `${signingInput}.${base64UrlEncode(signature)}`;
  }

  verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
      throw new Error('MALFORMED_JWT');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', config.JWT_SECRET).update(signingInput, 'utf8').digest()
    );

    const a = Buffer.from(encodedSignature, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('INVALID_JWT_SIGNATURE');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSec > payload.exp) {
      throw new Error('JWT_EXPIRED');
    }

    return payload;
  }

  issueTokenForUser(user, expiresInSec = 3600) {
    return this.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        facility_id: user.facility_id || null,
        mpi_id: user.mpi_id || null
      },
      expiresInSec
    );
  }
}

module.exports = new JwtService();
