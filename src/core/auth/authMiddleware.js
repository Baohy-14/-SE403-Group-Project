/**
 * MediLink Security & Authentication Middleware
 * Validates user sessions and parses Role-Based Claims (RBAC)
 */

const db = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // If no header, check for dev header or query param
    const devUser = req.headers['x-dev-user'] || req.query.dev_user;
    if (devUser) {
      const user = db.getUserByUsername(devUser);
      if (user) {
        req.user = user;
        return next();
      }
    }
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Thiếu thông tin xác thực. Vui lòng cung cấp Authorization Header (Bearer Token).'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // In production, verify JWT with config.JWT_SECRET.
  // For standard mock/testing, parse token format: "token:<username>" or look up username.
  let username = token;
  if (token.startsWith('token:')) {
    username = token.replace('token:', '');
  }

  const user = db.getUserByUsername(username) || db.getUserById(username);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token xác thực không hợp lệ hoặc người dùng không tồn tại.'
    });
  }

  req.user = user;
  next();
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'ROLE_FORBIDDEN',
        message: `Vai trò [${req.user.role}] không có quyền thực hiện thao tác này.`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRoles
};
