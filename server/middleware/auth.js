import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication invalid, no token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };

    // Refresh token if it expires within 15 minutes (sliding window)
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - now;
    if (timeLeft > 0 && timeLeft < 15 * 60) {
      const newToken = jwt.sign(
        { id: payload.id, username: payload.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.setHeader("X-Refreshed-Token", newToken);
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }
    console.error('Auth middleware error', err);
    return res.status(401).json({ message: 'Authentication invalid, token is invalid' });
  }
};

export default authMiddleware;
