const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Formato de token inválido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

verifyToken.optional = (req, res, next) => {
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }
  const [scheme, token] = req.headers.authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // This endpoint is public; an expired or invalid optional session is anonymous.
    req.user = null;
  }
  return next();
};

module.exports = verifyToken;
