function checkRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "No tienes permisos para esta acción"
      });
    }

    next();
  };
}

module.exports = checkRole;