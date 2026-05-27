const jwt = require('jsonwebtoken');


exports.requireAuthentication = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied: No Authentication Token Supplied' });
    }

    const token = authHeader.split(' ')[1];
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_override');
    
    
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Session Expired or Invalid Access Key' });
  }
};