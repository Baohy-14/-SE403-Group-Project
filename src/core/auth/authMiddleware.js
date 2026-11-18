/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 * Verifies cryptographic HS256 JWT Bearer tokens and attaches verified principal to req.user.
 */

const db = require('../db/database');
const jwtService = require('./jwtService');
const auditService = require('../audit/auditService');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return res.status(401).json({
      success: false,
      error: 'MISSING_BEARER_TOKEN',
      message: 'Thiếu thông tin xác thực JWT (Authorization: Bearer <token>).'
    });
  }

  const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const claims = jwtService.verify(rawToken);
    const user = db.getUserById(claims.sub);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    req.user = user;
    req.jwtClaims = claims;
    return next();
  } catch (err) {
    auditService.logSecurityEvent({
      actorId: 'UNAUTHENTICATED',
      actorRole: 'NONE',
      facilityId: 'UNKNOWN',
      action: 'AUTH_JWT_REJECTED',
      targetResource: req.path,
      ipAddress: req.ip,
      status: 'DENIED_401',
      details: `Xác thực JWT thất bại: ${err.message}`
    });
    return res.status(401).json({
      success: false,
      error: err.message || 'INVALID_TOKEN',
      message: 'JWT Token không hợp lệ, sai chữ ký hoặc đã hết hạn.'
    });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      auditService.logSecurityEvent({
        actorId: req.user.id,
        actorRole: req.user.role,
        facilityId: req.user.facility_id || 'NONE',
        action: 'RBAC_ROLE_DENIED',
        targetResource: req.path,
        ipAddress: req.ip,
        status: 'DENIED_403',
        details: `Vai trò [${req.user.role}] bị chặn truy cập endpoint yêu cầu [${allowedRoles.join(', ')}]`
      });
      return res.status(403).json({
        success: false,
        error: 'ROLE_FORBIDDEN',
        message: `Vai trò [${req.user.role}] không có thẩm quyền thực hiện thao tác này.`
      });
    }
    return next();
  };
}

module.exports = {
  authenticate,
  requireRoles
};
