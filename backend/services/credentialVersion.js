const crypto = require("crypto");

// A signed marker derived from the password hash lets auth middleware revoke
// JWTs after a password change without putting the password hash in the token.
const credentialVersion = (passwordHash) => crypto
  .createHmac("sha256", process.env.JWT_SECRET)
  .update(passwordHash ? `password:${passwordHash}` : "passwordless")
  .digest("hex");

module.exports = credentialVersion;
