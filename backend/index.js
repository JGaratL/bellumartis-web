require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const postsRoutes = require("./routes/posts");
const cors = require("cors");
const { allowedOrigins, requestSecurity } = require("./middleware/requestSecurity");
const { parseCookies, setSessionCookies, setCsrfCookie, clearSessionCookies, SESSION_COOKIE, CSRF_COOKIE } = require("./middleware/sessionCookies");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const checkRole = require("./middleware/role");
const verifyToken = require("./middleware/auth");
const credentialVersion = require("./services/credentialVersion");
const { reserveAuthRequest } = require("./services/authRateLimit");
const { OAuth2Client } = require("google-auth-library");
const contentRoutes = require("./routes/contentRoutes");
const articlesRoutes = require("./routes/articlesRoutes");
const searchRoutes = require("./routes/search");
const {
  createResetToken,
  hashToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
  verifyEmailVerificationToken,
} = require("./services/authEmail");

const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");

const notificationsRoutes = require("./routes/notifications");

const adminEmailsRoutes = require("./routes/adminEmails");
const communicationsRoutes = require("./routes/communications");

const emailAttachmentStorage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/emails");
  },

  filename: (req, file, cb) => {

    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      unique + path.extname(file.originalname)
    );
  }
});


const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins().has(origin)); }, credentials: true }));
app.use(requestSecurity);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin/emails", adminEmailsRoutes);
app.use("/api/communications", communicationsRoutes);
app.use("/api/articles", articlesRoutes);
app.use("/api/search", searchRoutes);




const avatarMimeByExtension = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MAX_PIXELS = 25_000_000;
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (avatarMimeByExtension.get(extension) === file.mimetype) return cb(null, true);
    return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
  },
});

const parseAvatarUpload = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || "Imagen no válida" });
    return next();
  });
};

const assertSupportedImageBuffer = async (buffer, expectedMime = null) => {
  const metadata = await sharp(buffer, { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "error" }).metadata();
  const mimeByFormat = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const actualMime = mimeByFormat[metadata.format];
  if (!actualMime || (expectedMime && actualMime !== expectedMime)) {
    throw new Error("El contenido no es una imagen JPG, PNG o WEBP válida.");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > IMAGE_MAX_PIXELS) {
    throw new Error("La imagen supera las dimensiones permitidas.");
  }
  return metadata;
};

const emailUpload = multer({
  storage: emailAttachmentStorage,
});

const eventUpload = multer({
  dest: path.join(__dirname, "uploads", "events"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    if (allowed.has(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("El poster debe ser una imagen JPG, PNG o WEBP."));
  },
});


/*
====================================
HELPER JWT
====================================
*/
const generateToken = (user, passwordHash = user.password || null) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role || "user",
      cv: credentialVersion(passwordHash),
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const buildUniqueNickname = async (rawNickname) => {
  const base = (rawNickname || "user")
    .toString()
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40) || "user";

  let candidate = base;
  let suffix = 1;

  while (true) {
    const [rows] = await pool.query("SELECT id FROM users WHERE nickname = ?", [
      candidate,
    ]);
    if (rows.length === 0) return candidate;

    candidate = `${base}_${suffix}`.slice(0, 50);
    suffix += 1;
  }
};

const normalizeEmail = (email) => (email || "").toString().trim().toLowerCase();
const isStrongPassword = (password) => {
  const value = typeof password === "string" ? password : "";
  return Buffer.byteLength(value, "utf8") <= 72 &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
};
const dummyPasswordHash = bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
const isSpainCountry = (country) =>
  (country || "")
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() === "espana";
const UNVERIFIED_ACCOUNT_TTL_DAYS = Number(process.env.UNVERIFIED_ACCOUNT_TTL_DAYS || 7);

const cleanupExpiredUnverifiedUsers = async () => {
  if (!Number.isFinite(UNVERIFIED_ACCOUNT_TTL_DAYS) || UNVERIFIED_ACCOUNT_TTL_DAYS <= 0) {
    return 0;
  }

  const [result] = await pool.query(
    `
    DELETE FROM users
    WHERE provider = 'local'
      AND email_verified_at IS NULL
      AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
    [UNVERIFIED_ACCOUNT_TTL_DAYS]
  );

  return result.affectedRows || 0;
};

/*
====================================
REGISTRO
====================================
*/
app.post("/register", async (req, res) => {
  try {
    await cleanupExpiredUnverifiedUsers();

    const { nickname, email, password, province, country } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedNickname = (nickname || "").toString().trim();
    const normalizedCountry = (country || "").toString().trim();
    const normalizedProvince =
      isSpainCountry(normalizedCountry)
        ? (province || "").toString().trim()
        : null;

    if (!normalizedNickname || !normalizedEmail || !password) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo; y no superar 72 bytes UTF-8.",
      });
    }

    const [emailUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [
      normalizedEmail,
    ]);
    if (emailUsers.length > 0) {
      const existingByEmail = emailUsers[0];

      if (!existingByEmail.password && existingByEmail.google_id) {
        const [nicknameUsers] = await pool.query(
          "SELECT id FROM users WHERE nickname = ? AND id <> ?",
          [normalizedNickname, existingByEmail.id]
        );
        if (nicknameUsers.length > 0) {
          return res.status(400).json({
            error: "El nickname ya esta en uso",
            field: "nickname",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          `
          UPDATE users
          SET nickname = ?, password = ?, province = ?, country = ?, last_login = NOW(), email_verified_at = NOW(), status = 'active'
          WHERE id = ?
          `,
          [
            normalizedNickname,
            hashedPassword,
            normalizedProvince,
            normalizedCountry || null,
            existingByEmail.id,
          ]
        );

        const user = {
          id: existingByEmail.id,
          nickname: normalizedNickname,
          email: normalizedEmail,
          role: existingByEmail.role || "user",
        };
        const token = generateToken(user, hashedPassword);
        const csrfToken = setSessionCookies(res, token);

        return res.json({
          message: "Cuenta Google completada con password local",
          csrfToken,
          user,
        });
      }

      return res.status(400).json({
        error: "El email ya esta en uso",
        field: "email",
      });
    }

    const [nicknameUsers] = await pool.query(
      "SELECT id FROM users WHERE nickname = ?",
      [normalizedNickname]
    );
    if (nicknameUsers.length > 0) {
      return res.status(400).json({
        error: "El nickname ya esta en uso",
        field: "nickname",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users
      (nickname, email, password, province, country, provider, status, email_verified_at)
      VALUES (?, ?, ?, ?, ?, 'local', 'inactive', NULL)
      `,
      [
        normalizedNickname,
        normalizedEmail,
        hashedPassword,
        normalizedProvince,
        normalizedCountry || null,
      ]
    );

    const user = {
      id: result.insertId,
      nickname: normalizedNickname,
      email: normalizedEmail,
      role: "user",
    };

    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      console.error("EMAIL VERIFICATION ERROR:", mailError.message);
      return res.status(502).json({
        error: "La cuenta quedó creada, pero no se pudo aceptar el correo de verificación. Solicita un nuevo enlace más tarde.",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }

    res.json({
      message: "Usuario registrado correctamente. Revisa tu email para activar la cuenta.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/*
====================================
LOGIN LOCAL
====================================
*/
app.post("/login", async (req, res) => {
  try {
    await cleanupExpiredUnverifiedUsers();

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      await bcrypt.compare(password, await dummyPasswordHash);
      return res.status(401).json({ error: "Email o contraseña incorrectos, o la cuenta no está verificada." });
    }

    const user = rows[0];

    if (user.provider === "google" && !user.password) {
      await bcrypt.compare(password, await dummyPasswordHash);
      return res.status(401).json({ error: "Email o contraseña incorrectos, o la cuenta no está verificada." });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Email o contraseña incorrectos, o la cuenta no está verificada." });
    }

    if (!user.email_verified_at || user.status === "inactive") {
      return res.status(401).json({ error: "Email o contraseña incorrectos, o la cuenta no está verificada." });
    }

    const token = generateToken(user);

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    const csrfToken = setSessionCookies(res, token);
    res.json({
      message: "Login correcto",
      csrfToken,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image || null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/*
====================================
UNVERIFIED ACCOUNT CLEANUP
====================================
*/
const runUnverifiedCleanup = async (reason = "scheduled") => {
  try {
    const deletedCount = await cleanupExpiredUnverifiedUsers();

    if (deletedCount > 0) {
      console.log(
        `[auth-cleanup:${reason}] deleted ${deletedCount} expired unverified account(s)`
      );
    }
  } catch (error) {
    console.error(`[auth-cleanup:${reason}] error:`, error);
  }
};

runUnverifiedCleanup("startup");
setInterval(() => {
  runUnverifiedCleanup("interval");
}, 24 * 60 * 60 * 1000);

/*
====================================
RESEND EMAIL VERIFICATION
====================================
*/
app.post("/auth/resend-verification", async (req, res) => {
  try {
    await cleanupExpiredUnverifiedUsers();

    const normalizedEmail = normalizeEmail(req.body.email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email obligatorio" });
    }

    const limit = await reserveAuthRequest({
      action: "verification_resend",
      email: normalizedEmail,
      req,
      emailLimit: 3,
      ipLimit: 60,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return res.json({ message: "Si la cuenta existe y necesita verificar el correo, recibirás instrucciones. Espera un poco antes de volver a solicitarlo." });
    }

    const [rows] = await pool.query(
      "SELECT id, nickname, email, email_verified_at, status, provider FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.json({ message: "Si la cuenta existe y necesita verificar el correo, recibirás instrucciones. Espera un poco antes de volver a solicitarlo." });
    }

    const user = rows[0];

    if (user.email_verified_at || user.provider === "google") {
      return res.json({ message: "Si la cuenta existe y necesita verificar el correo, recibirás instrucciones. Espera un poco antes de volver a solicitarlo." });
    }
    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      console.error("RESEND VERIFICATION MAIL ERROR:", mailError.message);
      return res.json({ message: "Si la cuenta existe y necesita verificar el correo, recibirás instrucciones. Espera un poco antes de volver a solicitarlo." });
    }

    return res.json({ message: "Si la cuenta existe y necesita verificar el correo, recibirás instrucciones. Espera un poco antes de volver a solicitarlo." });
  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);
    return res.status(500).json({ error: "No se pudo reenviar la verificacion" });
  }
});

require("./services/emailSendLog").ensureEmailSendLog().catch((error) => {
  console.error("No se pudo inicializar el registro de envíos:", error.message);
});

/*
====================================
VERIFY EMAIL
====================================
*/
app.post("/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token obligatorio" });
    }

    let payload;
    try {
      payload = verifyEmailVerificationToken(token);
    } catch (error) {
      const message =
        error.name === "TokenExpiredError"
          ? "El enlace de verificacion ha caducado"
          : "El enlace de verificacion no es valido";

      return res.status(400).json({ error: message });
    }

    const userId = Number(payload.sub);
    const normalizedEmail = normalizeEmail(payload.email);

    const [rows] = await pool.query(
      "SELECT id, email, email_verified_at FROM users WHERE id = ? AND email = ?",
      [userId, normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (rows[0].email_verified_at) {
      return res.json({
        message: "Tu email ya estaba verificado.",
      });
    }

    await pool.query(
      "UPDATE users SET email_verified_at = NOW(), status = 'active' WHERE id = ?",
      [userId]
    );

    return res.json({
      message: "Email verificado correctamente",
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    return res.status(500).json({ error: "No se pudo verificar el email" });
  }
});

/*
====================================
FORGOT PASSWORD
====================================
*/
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email obligatorio" });
    }

    const limit = await reserveAuthRequest({
      action: "password_reset",
      email: normalizedEmail,
      req,
      emailLimit: 3,
      ipLimit: 60,
      windowSeconds: 60 * 60,
    });
    const genericResponse = {
      message: "Si la cuenta puede recuperar la contraseña, recibirás un enlace válido durante una hora.",
    };
    if (!limit.allowed) return res.json(genericResponse);

    const [rows] = await pool.query(
      "SELECT id, nickname, email, password, email_verified_at, status FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0 || !rows[0].password || !rows[0].email_verified_at || rows[0].status === "inactive") {
      return res.json(genericResponse);
    }

    const user = rows[0];
    const resetTokenData = createResetToken();
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_password_token = ?, reset_password_expires = ?
      WHERE id = ?
      `,
      [resetTokenData.hash, resetPasswordExpires, user.id]
    );

    try {
      await sendPasswordResetEmail(user, resetTokenData.token);
    } catch (mailError) {
      await pool.query(
        "UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ? AND reset_password_token = ?",
        [user.id, resetTokenData.hash]
      );
      console.error("RESET PASSWORD MAIL ERROR:", mailError.message);
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ error: "No se pudo enviar el enlace" });
  }
});

/*
====================================
RESET PASSWORD
====================================
*/
app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token y contrasena obligatorios" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo; y no superar 72 bytes UTF-8.",
      });
    }

    const tokenHash = hashToken(token);

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      UPDATE users
      SET password = ?, reset_password_token = NULL, reset_password_expires = NULL
      WHERE reset_password_token = ?
        AND reset_password_expires IS NOT NULL
        AND reset_password_expires > NOW()
      `,
      [hashedPassword, tokenHash]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ error: "El enlace ha caducado o no es valido" });
    }

    clearSessionCookies(res);

    return res.json({
      message: "Contrasena actualizada correctamente",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ error: "No se pudo cambiar la contrasena" });
  }
});

/*
====================================
GOOGLE AUTH (CORREGIDO)
====================================
*/
app.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Credential requerida" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (payload.email_verified !== true) {
      return res.status(401).json({ error: "Google no ha confirmado esta dirección de correo." });
    }

    const email = normalizeEmail(payload.email);
    const googleId = payload.sub;
    const nickname = payload.name || email.split("@")[0];
    const googlePicture = payload.picture || null;

    if (!email || !googleId) {
      return res.status(400).json({ error: "Payload de Google inválido" });
    }

    const [emailRows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const [googleRows] = await pool.query(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId]
    );

    const emailUser = emailRows[0] || null;
    const googleUser = googleRows[0] || null;
    let user = null;
    let sessionPasswordHash = null;

    /*
    ============================
    USER EXISTS
    ============================
    */
    if (emailUser && googleUser && emailUser.id !== googleUser.id) {
      return res.status(409).json({
        error:
          "Conflicto de cuenta: este Google ya esta vinculado a otro usuario.",
      });
    }

    if (emailUser || googleUser) {
      user = emailUser || googleUser;
      sessionPasswordHash = user.password || null;
      if (user.status === "inactive") {
        return res.status(403).json({ error: "La cuenta está inactiva." });
      }
      let resolvedProfileImage = user.profile_image || null;

      if (!user.google_id) {
        await pool.query(
          "UPDATE users SET google_id = ?, provider = 'google', email_verified_at = NOW(), status = 'active' WHERE id = ?",
          [googleId, user.id]
        );
      } else if (user.provider !== "google") {
        await pool.query(
          "UPDATE users SET provider = 'google', email_verified_at = NOW(), status = 'active' WHERE id = ?",
          [user.id]
        );
      } else if (!user.email_verified_at) {
        await pool.query("UPDATE users SET email_verified_at = NOW() WHERE id = ?", [user.id]);
      }

      if (googlePicture && (!user.profile_image || !user.profile_image.trim())) {
        await pool.query(
          "UPDATE users SET profile_image = ? WHERE id = ?",
          [googlePicture, user.id]
        );
        resolvedProfileImage = googlePicture;
      }

      user = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        role: user.role || "user",
        provider: "google",
        profile_image: resolvedProfileImage,
      };
    }

    /*
    ============================
    NEW USER
    ============================
    */
    else {
      const safeNickname = await buildUniqueNickname(nickname);
      const [result] = await pool.query(
        `
        INSERT INTO users
        (nickname, email, password, provider, google_id, profile_image, province, country, status, email_verified_at)
        VALUES (?, ?, NULL, 'google', ?, ?, NULL, NULL, 'active', NOW())
        `,
        [safeNickname, email, googleId, googlePicture]
      );

      user = {
        id: result.insertId,
        nickname: safeNickname,
        email,
        role: "user",
        provider: "google",
        profile_image: googlePicture || null,
      };
    }

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    const token = generateToken(user, sessionPasswordHash);
    const csrfToken = setSessionCookies(res, token);
    res.json({ csrfToken, user });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google auth error" });
  }
});

/*
====================================
PROFILE
====================================
*/
app.get("/profile", verifyToken, async (req, res) => {
  res.json({
    message: "Acceso autorizado",
    user: req.user,
  });
});

/*
====================================
GET PROFILE
====================================
*/

app.get("/users/me", verifyToken, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nickname, email, role, province, country, created_at, profile_image,
            x_url, facebook_url, instagram_url, youtube_url
     FROM users
     WHERE id = ?`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const csrfToken = parseCookies(req.headers.cookie || "")[CSRF_COOKIE] || setCsrfCookie(res);
  res.json({ ...rows[0], csrfToken });
});

app.post("/logout", (req, res) => {
  clearSessionCookies(res);
  return res.json({ message: "Sesión cerrada" });
});

/*
====================================
ADMIN USERS LIST
====================================
*/
app.get(
  "/admin/users",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const rawQuery = (req.query.q || "").toString().trim();
      const role = (req.query.role || "").toString().trim();
      const province = (req.query.province || "").toString().trim();
      const status = (req.query.status || "").toString().trim();
      const lastLogin = (req.query.lastLogin || "").toString().trim();
      const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit || "20", 10) || 20, 1),
        50
      );
      const offset = Math.max(Number.parseInt(req.query.offset || "0", 10) || 0, 0);

      const where = [];
      const params = [];

      if (rawQuery) {
        where.push("(u.nickname LIKE ? OR u.email LIKE ?)");
        params.push(`%${rawQuery}%`, `%${rawQuery}%`);
      }

      if (["user", "moderator", "admin", "owner"].includes(role)) {
        where.push("u.role = ?");
        params.push(role);
      }

      if (province && province !== "all") {
        where.push("u.province = ?");
        params.push(province);
      }

      if (status === "active") {
        where.push("u.status = 'active'");
        where.push("u.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
      } else if (status === "inactive") {
        where.push("u.status = 'active'");
        where.push(
          "(u.last_login IS NULL OR u.last_login < DATE_SUB(NOW(), INTERVAL 30 DAY))"
        );
      } else if (status === "blocked") {
        where.push("u.status = 'inactive'");
      }

      if (lastLogin === "7d") {
        where.push("u.last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
      } else if (lastLogin === "30d") {
        where.push("u.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
      } else if (lastLogin === "older") {
        where.push(
          "(u.last_login IS NULL OR u.last_login < DATE_SUB(NOW(), INTERVAL 30 DAY))"
        );
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM users u
        ${whereSql}
        `,
        params
      );

      const [rows] = await pool.query(
        `
        SELECT
          u.id,
          u.nickname,
          u.email,
          u.role,
          u.province,
          u.country,
          u.created_at,
          u.last_login,
          u.status,
          (
            SELECT COUNT(*)
            FROM posts p
            WHERE p.user_id = u.id
          ) AS posts_count
        FROM users u
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
        `
        ,
        [...params, limit, offset]
      );

      return res.json({
        users: rows,
        total: Number(countRows?.[0]?.total || 0),
        limit,
        offset,
        hasMore: offset + rows.length < Number(countRows?.[0]?.total || 0),
      });
    } catch (err) {
      console.error("ADMIN USERS LIST ERROR:", err);
      return res.status(500).json({ error: "No se pudo obtener la lista de usuarios" });
    }
  }
);

/*
====================================
ADMIN USERS STATS
====================================
*/
app.get(
  "/admin/users/stats",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          COUNT(*) AS total_users,
          SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new_users,
          SUM(CASE WHEN last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS inactive_users
        FROM users
        `
      );

      return res.json(rows[0] || {
        total_users: 0,
        active_users: 0,
        new_users: 0,
        inactive_users: 0,
      });
    } catch (err) {
      console.error("ADMIN USERS STATS ERROR:", err);
      return res.status(500).json({ error: "No se pudieron obtener las métricas de usuarios" });
    }
  }
);

/*
====================================
DELETE ADMIN USER
====================================
*/
app.delete(
  "/admin/users/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    const targetId = Number(req.params.id);
    const currentUserId = Number(req.user?.id);
    const currentRole = req.user?.role || "user";

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (targetId === currentUserId) {
      return res.status(400).json({
        error: "No puedes eliminar tu propio usuario",
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [targetRows] = await connection.query(
        "SELECT id, role, profile_image FROM users WHERE id = ? LIMIT 1",
        [targetId]
      );

      if (targetRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const targetUser = targetRows[0];

      if (currentRole === "admin" && targetUser.role === "owner") {
        await connection.rollback();
        return res.status(403).json({
          error: "No tienes permisos para eliminar a un owner",
        });
      }

      await connection.query(
        `
        DELETE FROM notifications
        WHERE user_id = ? OR from_user_id = ?
        `,
        [targetId, targetId]
      );

      await connection.query(
        `
        UPDATE posts p
        JOIN post_likes pl ON pl.post_id = p.id
        SET p.likes_count = GREATEST(p.likes_count - 1, 0)
        WHERE pl.user_id = ?
          AND p.user_id <> ?
        `,
        [targetId, targetId]
      );

      await connection.query(
        `
        UPDATE post_replies pr
        JOIN post_reply_likes prl ON prl.reply_id = pr.id
        SET pr.likes_count = GREATEST(pr.likes_count - 1, 0)
        WHERE prl.user_id = ?
          AND pr.user_id <> ?
        `,
        [targetId, targetId]
      );

      await connection.query(
        `
        DELETE prl
        FROM post_reply_likes prl
        LEFT JOIN post_replies pr ON pr.id = prl.reply_id
        LEFT JOIN posts p ON p.id = pr.post_id
        WHERE prl.user_id = ?
           OR pr.user_id = ?
           OR p.user_id = ?
        `,
        [targetId, targetId, targetId]
      );

      await connection.query(
        `
        DELETE pl
        FROM post_likes pl
        LEFT JOIN posts p ON p.id = pl.post_id
        WHERE pl.user_id = ?
           OR p.user_id = ?
        `,
        [targetId, targetId]
      );

      await connection.query(
        `
        DELETE pr
        FROM post_replies pr
        LEFT JOIN posts p ON p.id = pr.post_id
        WHERE pr.user_id = ?
           OR p.user_id = ?
        `,
        [targetId, targetId]
      );

      await connection.query(
        `
        DELETE ue
        FROM user_events ue
        WHERE ue.user_id = ?
        `,
        [targetId]
      );

      await connection.query(
        `
        DELETE p
        FROM posts p
        WHERE p.user_id = ?
        `,
        [targetId]
      );

      await connection.query(
        `
        DELETE FROM users
        WHERE id = ?
        `,
        [targetId]
      );

      await connection.query(
        `
        DELETE n
        FROM notifications n
        LEFT JOIN users recipient
          ON recipient.id = n.user_id
        LEFT JOIN users actor
          ON actor.id = n.from_user_id
        LEFT JOIN posts p
          ON n.type = 'like_post'
          AND p.id = n.reference_id
        LEFT JOIN post_replies pr
          ON n.type IN ('reply_post', 'like_reply')
          AND pr.id = n.reference_id
        WHERE recipient.id IS NULL
          OR actor.id IS NULL
          OR (n.type = 'like_post' AND p.id IS NULL)
          OR (n.type IN ('reply_post', 'like_reply') AND pr.id IS NULL)
        `
      );

      await connection.commit();

      if (
        typeof targetUser.profile_image === "string" &&
        (targetUser.profile_image.startsWith("/uploads/avatars/") ||
          targetUser.profile_image.startsWith("uploads/avatars/"))
      ) {
        const relativePath = targetUser.profile_image.replace(/^\/+/, "");
        const absolutePath = path.join(__dirname, relativePath);

        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (fileError) {
            console.error("DELETE USER AVATAR FILE ERROR:", fileError);
          }
        }
      }

      return res.json({
        message: "Usuario eliminado correctamente",
      });
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("DELETE USER ROLLBACK ERROR:", rollbackError);
      }

      console.error("DELETE ADMIN USER ERROR:", err);
      return res.status(500).json({ error: "No se pudo eliminar el usuario" });
    } finally {
      connection.release();
    }
  }
);

/*
====================================
UPDATE ADMIN USER
====================================
*/
app.put(
  "/admin/users/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    const targetId = Number(req.params.id);
    const currentUserId = Number(req.user?.id);
    const currentRole = req.user?.role || "user";
    const rawRole = req.body?.role;
    const rawStatus = req.body?.status;
    const nextRole = typeof rawRole === "string" ? rawRole.trim() : "";
    const nextStatus = typeof rawStatus === "string" ? rawStatus.trim() : "";

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (!nextRole && !nextStatus) {
      return res.status(400).json({
        error: "Debes indicar al menos un cambio de rol o estado",
      });
    }

    const allowedRoles = ["user", "moderator", "admin", "owner"];
    const allowedStatuses = ["active", "inactive"];

    if (nextRole && !allowedRoles.includes(nextRole)) {
      return res.status(400).json({ error: "Rol de usuario inválido" });
    }

    if (nextStatus && !allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: "Estado de usuario inválido" });
    }

    const connection = await pool.getConnection();

    try {
      const [targetRows] = await connection.query(
        "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
        [targetId]
      );

      if (targetRows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const targetUser = targetRows[0];

      if (currentRole === "admin" && targetUser.role === "owner") {
        return res.status(403).json({
          error: "No tienes permisos para modificar a un owner",
        });
      }

      const updates = [];
      const params = [];

      if (nextRole) {
        updates.push("role = ?");
        params.push(nextRole);
      }

      if (nextStatus) {
        updates.push("status = ?");
        params.push(nextStatus);
      }

      if (!updates.length) {
        return res.status(400).json({
          error: "No hay cambios para actualizar",
        });
      }

      await connection.query(
        `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = ?
        `,
        [...params, targetId]
      );

      const [updatedRows] = await connection.query(
        `
        SELECT
          id,
          nickname,
          email,
          role,
          province,
          country,
          status,
          created_at,
          last_login,
          provider,
          google_id,
          profile_image
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [targetId]
      );

      return res.json({
        message:
          nextStatus === "active"
            ? "Usuario desbloqueado correctamente"
            : nextStatus === "inactive"
              ? "Usuario bloqueado correctamente"
              : "Usuario actualizado correctamente",
        user: updatedRows[0] || null,
      });
    } catch (err) {
      console.error("UPDATE ADMIN USER ERROR:", err);
      return res.status(500).json({ error: "No se pudo actualizar el usuario" });
    } finally {
      connection.release();
    }
  }
);

/*
====================================
EDIT PROFILE
====================================
*/

app.put("/users/me", verifyToken, async (req, res) => {
  let generatedAvatarPath = null;
  try {
    const {
      nickname,
      province,
      country,
      profile_image,
      x_url,
      facebook_url,
      instagram_url,
      youtube_url
    } = req.body;

    let nextProfileImage = profile_image ?? null;
    let oldProfileImage = null;

    const [currentRows] = await pool.query(
      "SELECT profile_image FROM users WHERE id = ?",
      [req.user.id]
    );
    if (currentRows.length > 0) {
      oldProfileImage = currentRows[0].profile_image || null;
    }

    if (
      typeof nextProfileImage === "string" &&
      nextProfileImage.startsWith("data:image/")
    ) {
      const matches = nextProfileImage.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);

      if (!matches || !matches[1]) {
        return res.status(400).json({ error: "Imagen de perfil inválida" });
      }

      const buffer = Buffer.from(matches[2], "base64");
      if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) {
        return res.status(413).json({ error: "La imagen de perfil supera el tamaño máximo de 10 MB" });
      }
      await assertSupportedImageBuffer(buffer, matches[1].toLowerCase());
      const avatarsDir = path.join(__dirname, "uploads", "avatars");
      fs.mkdirSync(avatarsDir, { recursive: true });

      const filename = `avatar-${req.user.id}-${crypto.randomUUID()}.webp`;
      const outputPath = path.join(avatarsDir, filename);
      generatedAvatarPath = outputPath;

      await sharp(buffer, { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "error" })
        .resize(500, 500, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(outputPath);

      nextProfileImage = `/uploads/avatars/${filename}`;

    }

    await pool.query(
      `UPDATE users SET
        nickname = ?,
        province = ?,
        country = ?,
        profile_image = ?,
        x_url = ?,
        facebook_url = ?,
        instagram_url = ?,
        youtube_url = ?
      WHERE id = ?`,
      [
        nickname ?? null,
        province ?? null,
        country ?? null,
        nextProfileImage,
        x_url ?? null,
        facebook_url ?? null,
        instagram_url ?? null,
        youtube_url ?? null,
        req.user.id
      ]
    );

    if (
      generatedAvatarPath &&
      oldProfileImage &&
      typeof oldProfileImage === "string" &&
      (oldProfileImage.startsWith("/uploads/avatars/") || oldProfileImage.startsWith("uploads/avatars/"))
    ) {
      const oldAbsolutePath = path.join(__dirname, oldProfileImage.replace(/^\/+/, ""));
      if (fs.existsSync(oldAbsolutePath) && oldAbsolutePath !== generatedAvatarPath) {
        await fs.promises.unlink(oldAbsolutePath).catch((error) => {
          console.warn("No se pudo borrar el avatar anterior:", error.message);
        });
      }
    }

    return res.json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    if (generatedAvatarPath) await fs.promises.unlink(generatedAvatarPath).catch(() => {});
    console.error("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
});

/*
====================================
CHANGE PASSWORD
====================================
*/
app.put("/users/me/password", verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "La contraseña actual y la nueva son obligatorias" });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        error:
          "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo; y no superar 72 bytes UTF-8.",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, password, provider FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    if (!user.password) {
      return res.status(400).json({
        error: "Este usuario no tiene contraseña local configurada",
      });
    }

    const validCurrentPassword = await bcrypt.compare(current_password, user.password);

    if (!validCurrentPassword) {
      return res.status(400).json({
        error: "La contraseña actual no es correcta",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users
       SET password = ?, reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    clearSessionCookies(res);

    return res.json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ error: "No se pudo cambiar la contraseña" });
  }
});

/*
====================================
UPLOAD AVATAR
====================================
*/

app.post("/upload-avatar", verifyToken, parseAvatarUpload, async (req, res) => {
  let generatedAvatarPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: "Falta la imagen" });
    const [rows] = await pool.query("SELECT profile_image FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

    await assertSupportedImageBuffer(req.file.buffer, req.file.mimetype);
    const filename = `avatar-${req.user.id}-${crypto.randomUUID()}.webp`;
    const outputPath = path.join(__dirname, "uploads", "avatars", filename);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    generatedAvatarPath = outputPath;
    await sharp(req.file.buffer, { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "error" })
      .resize(500, 500, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outputPath);
    const newUrl = `/uploads/avatars/${filename}`;
    await pool.query("UPDATE users SET profile_image = ? WHERE id = ?", [newUrl, req.user.id]);
    generatedAvatarPath = null;

    const oldImage = rows[0].profile_image;
    if (oldImage?.startsWith("/uploads/")) {
      const oldPath = oldImage.startsWith("/uploads/avatars/")
        ? path.join(__dirname, oldImage.replace(/^\/+/, ""))
        : path.join(__dirname, "uploads", path.basename(oldImage));
      if (oldPath !== outputPath) await fs.promises.unlink(oldPath).catch(() => {});
    }
    return res.json({ url: newUrl });
  } catch (error) {
    if (generatedAvatarPath) await fs.promises.unlink(generatedAvatarPath).catch(() => {});
    console.error("AVATAR UPLOAD ERROR:", error);
    return res.status(400).json({ error: error.message || "No se pudo guardar la imagen de perfil" });
  }
});


app.get("/api/users/:id", verifyToken, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nickname, email, province, country, created_at, profile_image,
            x_url, facebook_url, instagram_url, youtube_url
     FROM users
     WHERE id = ?`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const targetUser = rows[0];
  const canViewEmail =
    Number(req.user.id) === Number(targetUser.id) ||
    ["admin", "owner"].includes(req.user.role);
  if (!canViewEmail) delete targetUser.email;

  res.json(targetUser);
});

/*
====================================
CREAR POST
====================================
*/

app.use("/api/posts", postsRoutes);

/*
====================================
EVENTS CREATE
====================================
*/
app.post(
  "/events",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const { title, description, event_type, province, date, link } =
        req.body;

      const [result] = await pool.query(
        `
        INSERT INTO events
        (title, description, event_type, province, date, link)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [title, description, event_type, province, date, link]
      );

      res.json({
        message: "Evento creado correctamente",
        eventId: result.insertId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error creando evento" });
    }
  }
);

const syncFinishedEvents = async () => {
  await pool.query(
    `
    UPDATE events
    SET status = 'finished', updated_at = NOW()
    WHERE status IN ('scheduled', 'ongoing')
      AND date IS NOT NULL
      AND (
        date < CURDATE()
        OR (date = CURDATE() AND time IS NOT NULL AND time < CURTIME())
      )
    `
  );

  await pool.query(`
    DELETE banners
    FROM banners
    INNER JOIN events ON events.id = banners.event_id
    WHERE events.status = 'finished'
  `);
};

const BANNER_EVENT_TYPES = new Set(["charla", "firma", "webinar", "sorteo"]);
const MANUAL_BANNER_TYPE = "book_promotion";
const MANUAL_BANNER_TYPES = new Set(["book_promotion", "sorteo"]);

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    if (allowed.has(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("La imagen debe ser JPG, PNG o WEBP."));
  },
});

const parseBannerUpload = (req, res, next) => {
  bannerUpload.single("image")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || "Imagen no válida" });
    return next();
  });
};

const saveBannerImage = async (file) => {
  if (!file) return null;
  try {
    await assertSupportedImageBuffer(file.buffer, file.mimetype);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
  const directory = path.join(__dirname, "uploads", "banners");
  await fs.promises.mkdir(directory, { recursive: true });
  const filename = `banner-${crypto.randomUUID()}.webp`;
  const filepath = path.join(directory, filename);

  await sharp(file.buffer, { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "error" })
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(filepath);

  return { imageUrl: `/uploads/banners/${filename}`, filepath };
};

const normalizeBannerActive = (value) => {
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    return value.toLowerCase() !== "false";
  }
  return value !== false;
};

const mapBannerRow = (row) => {
  if (!row) return null;

  const isEventBanner = Boolean(row.event_id);

  return {
    id: row.id,
    banner_type: row.banner_type,
    event_id: row.event_id,

    title: row.title || row.event_title,
    additional_text: row.additional_text || null,
    image_url: row.image_url || row.event_image_url,
    link: row.link || row.event_link,

    active: Number(row.active) === 1,
    created_at: row.created_at,
    event_title: row.event_title || null,
    event_province: row.event_province || null,
    event_image_url: row.event_image_url || null,
    event_link: row.event_link || null,
    event_type: row.event_type || null,
    is_manual: !isEventBanner,
  };
};

const syncEventBanner = async (db, eventId, showAsBanner) => {
  const [eventRows] = await db.query(
    `
    SELECT id, title, image_url, link, event_type
    FROM events
    WHERE id = ?
    LIMIT 1
    `,
    [eventId]
  );

  if (eventRows.length === 0) {
    return null;
  }

  const event = eventRows[0];
  if (!BANNER_EVENT_TYPES.has(event.event_type)) {
    await db.query("DELETE FROM banners WHERE event_id = ?", [eventId]);
    return null;
  }

  const active = normalizeBannerActive(showAsBanner) ? 1 : 0;
  const [bannerRows] = await db.query(
    `
    SELECT id
    FROM banners
    WHERE event_id = ?
    ORDER BY id ASC
    `,
    [eventId]
  );

  if (bannerRows.length === 0) {
    const [result] = await db.query(
      `
      INSERT INTO banners (
        banner_type,
        event_id,
        title,
        image_url,
        link,
        active
      ) VALUES (?, ?, NULL, NULL, NULL, ?)
      `,
      [event.event_type, event.id, active]
    );

    return result.insertId;
  }

  const [primary, ...duplicates] = bannerRows;
  await db.query(
    `
    UPDATE banners
    SET banner_type = ?,
        title = NULL,
        image_url = NULL,
        link = NULL,
        active = ?
    WHERE id = ?
    `,
    [event.event_type, active, primary.id]
  );

  if (duplicates.length > 0) {
    const duplicateIds = duplicates.map((item) => item.id);
    await db.query(
      `DELETE FROM banners WHERE id IN (${duplicateIds.map(() => "?").join(",")})`,
      duplicateIds
    );
  }

  return primary.id;
};

const deleteEventBanners = async (db, eventId) => {
  await db.query("DELETE FROM banners WHERE event_id = ?", [eventId]);
};

const getPublicBanner = async (db, userProvince, isAuthenticated = false) => {
  const eventProvince = String(userProvince || "").trim();

  if (!isAuthenticated) {
    const [manualSorteoRows] = await db.query(
      `
      SELECT
        b.id,
        b.banner_type,
        b.event_id,
        b.title,
        b.additional_text,
        b.image_url,
        b.link,
        b.active,
        b.created_at,
        e.title AS event_title,
        e.province AS event_province,
        e.image_url AS event_image_url,
        e.link AS event_link,
        e.event_type
      FROM banners b
      LEFT JOIN events e ON e.id = b.event_id
      WHERE b.active = 1
        AND b.banner_type = 'sorteo'
        AND b.event_id IS NULL
      ORDER BY b.created_at ASC, b.id ASC
      LIMIT 1
      `
    );

    if (manualSorteoRows.length > 0) {
      return mapBannerRow(manualSorteoRows[0]);
    }

    const [sorteoRows] = await db.query(
      `
      SELECT
        b.id,
        b.banner_type,
        b.event_id,
        b.title,
        b.additional_text,
        b.image_url,
        b.link,
        b.active,
        b.created_at,
        e.title AS event_title,
        e.province AS event_province,
        e.image_url AS event_image_url,
        e.link AS event_link,
        e.event_type
      FROM banners b
      INNER JOIN events e ON e.id = b.event_id
      WHERE b.active = 1
        AND b.banner_type = 'sorteo'
      ORDER BY b.created_at ASC, b.id ASC
      LIMIT 1
      `
    );

    return sorteoRows.length > 0 ? mapBannerRow(sorteoRows[0]) : null;
  }

  if (eventProvince) {
    const [matchedRows] = await db.query(
      `
      SELECT
        b.id,
        b.banner_type,
        b.event_id,
        b.title,
        b.additional_text,
        b.image_url,
        b.link,
        b.active,
        b.created_at,
        e.title AS event_title,
        e.province AS event_province,
        e.image_url AS event_image_url,
        e.link AS event_link,
        e.event_type
      FROM banners b
      INNER JOIN events e ON e.id = b.event_id
      WHERE b.active = 1
        AND b.banner_type IN ('charla', 'firma')
        AND e.province = ?
      ORDER BY b.created_at ASC, b.id ASC
      LIMIT 1
      `,
      [eventProvince]
    );

    if (matchedRows.length > 0) {
      return mapBannerRow(matchedRows[0]);
    }
  }

  const [webinarRows] = await db.query(
    `
    SELECT
      b.id,
      b.banner_type,
      b.event_id,
      b.title,
      b.additional_text,
      b.image_url,
      b.link,
      b.active,
      b.created_at,
      e.title AS event_title,
      e.province AS event_province,
      e.image_url AS event_image_url,
      e.link AS event_link,
      e.event_type
    FROM banners b
    INNER JOIN events e ON e.id = b.event_id
    WHERE b.active = 1
      AND b.banner_type = 'webinar'
    ORDER BY b.created_at ASC, b.id ASC
    LIMIT 1
    `
  );

  if (webinarRows.length > 0) {
    return mapBannerRow(webinarRows[0]);
  }

  const [manualRows] = await db.query(
    `
    SELECT
      b.id,
      b.banner_type,
      b.event_id,
      b.title,
      b.additional_text,
      b.image_url,
      b.link,
      b.active,
      b.created_at,
      NULL AS event_title,
      NULL AS event_province,
      NULL AS event_image_url,
      NULL AS event_link,
      NULL AS event_type
    FROM banners b
    WHERE b.active = 1
      AND b.banner_type = ?
      AND b.event_id IS NULL
    ORDER BY b.created_at ASC, b.id ASC
    LIMIT 1
    `,
    [MANUAL_BANNER_TYPE]
  );

  return manualRows.length > 0 ? mapBannerRow(manualRows[0]) : null;
};

/*
====================================
EVENTS LIST
====================================
*/
app.get("/events", async (req, res) => {
  try {
    await syncFinishedEvents();

    const [rows] = await pool.query(
      `
        SELECT
        events.id,
        events.title,
        events.description,
        events.event_type,
        events.province,
        DATE_FORMAT(events.date, '%Y-%m-%d') AS date,
        DATE_FORMAT(events.time, '%H:%i:%s') AS time,
        events.link,
        events.created_at,
        events.status,
        events.image_url,
        events.updated_at,
        COUNT(user_events.id) AS attendees
        FROM events
        LEFT JOIN user_events ON events.id = user_events.event_id
        GROUP BY events.id
        ORDER BY date ASC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo eventos" });
  }
});

/*
====================================
EVENT BY ID
====================================
*/
app.get("/events/:id", async (req, res) => {
  try {
    await syncFinishedEvents();

    const [rows] = await pool.query(
      `
      SELECT
      events.id,
      events.title,
      events.description,
      events.event_type,
      events.province,
      DATE_FORMAT(events.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(events.time, '%H:%i:%s') AS time,
      events.link,
      events.created_at,
      events.status,
      events.image_url,
      events.updated_at,
      COUNT(user_events.id) AS attendees
      FROM events
      LEFT JOIN user_events ON events.id = user_events.event_id
      WHERE events.id = ?
      GROUP BY events.id
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo evento" });
  }
});

/*
====================================
JOIN EVENT
====================================
*/
app.post("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const [existing] = await pool.query(
      "SELECT id FROM user_events WHERE user_id = ? AND event_id = ?",
      [userId, eventId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Ya estás apuntado a este evento",
      });
    }

    await pool.query(
      `
      INSERT INTO user_events (user_id, event_id)
      VALUES (?, ?)
      `,
      [userId, eventId]
    );

    res.json({ message: "Te has apuntado al evento" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al apuntarse" });
  }
});

/*
====================================
CANCEL JOIN
====================================
*/
app.delete("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    await pool.query(
      "DELETE FROM user_events WHERE user_id = ? AND event_id = ?",
      [userId, eventId]
    );

    res.json({ message: "Has cancelado tu asistencia" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cancelar asistencia" });
  }
});

/*
====================================
EVENT USERS
====================================
*/
app.get(
  "/events/:id/users",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const eventId = req.params.id;

      const [rows] = await pool.query(
        `
      SELECT u.id, u.nickname, u.email
      FROM user_events ue
      JOIN users u ON ue.user_id = u.id
      WHERE ue.event_id = ?
      `,
        [eventId]
      );

      return res.json(rows);
    } catch (err) {
      console.error("ADMIN EVENT ATTENDEES ERROR:", err);
      return res.status(500).json({ error: "Error obteniendo usuarios" });
    }
  }
);

/*
====================================
EVENT STATUS
====================================
*/
app.get("/events/:id/status", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT id
      FROM user_events
      WHERE user_id = ? AND event_id = ?
      `,
      [userId, eventId]
    );

    if (rows.length === 0) {
      return res.json({ joined: false });
    }

    res.json({
      joined: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo estado" });
  }
});

/*
====================================
ADMIN EVENTS LIST
====================================
*/
app.get(
  "/admin/events",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await syncFinishedEvents();

      const [rows] = await pool.query(
        `
        SELECT
          events.id,
          events.title,
          events.description,
          events.event_type,
          events.province,
          DATE_FORMAT(events.date, '%Y-%m-%d') AS date,
          DATE_FORMAT(events.time, '%H:%i:%s') AS time,
          events.link,
          events.created_at,
          events.status,
          events.image_url,
          COALESCE(
            (
              SELECT b.active
              FROM banners b
              WHERE b.event_id = events.id
              ORDER BY b.id ASC
              LIMIT 1
            ),
            1
          ) AS show_as_banner,
          events.updated_at,
          COUNT(user_events.id) AS attendees
        FROM events
        LEFT JOIN user_events ON events.id = user_events.event_id
        GROUP BY events.id
        ORDER BY events.date ASC, events.time ASC
        `
      );

      return res.json(rows);
    } catch (err) {
      console.error("ADMIN EVENTS LIST ERROR:", err);
      return res.status(500).json({ error: "No se pudo obtener la lista de eventos" });
    }
  }
);

/*
====================================
ADMIN CREATE EVENT
====================================
*/
app.post(
  "/admin/events",
  verifyToken,
  checkRole(["admin", "owner"]),
  eventUpload.single("image"),
  async (req, res) => {
    const connection = await pool.getConnection();
    let preserveEventImage = false;

    try {
      const normalizeNullable = (value) => {
        const next = String(value || "").trim();
        return next ? next : null;
      };

      const title = String(req.body?.title || "").trim();
      const description = normalizeNullable(req.body?.description);
      const rawEventType = String(req.body?.event_type || "").trim();
      const rawProvince = normalizeNullable(req.body?.province);
      const rawDate = normalizeNullable(req.body?.date);
      const rawTime = normalizeNullable(req.body?.time);
      const rawLink = normalizeNullable(req.body?.link);
      const showAsBanner = normalizeBannerActive(req.body?.show_as_banner);
      const sendProvinceEmail = ["1", "true", "yes"].includes(String(req.body?.send_email || "").toLowerCase());

      const allowedTypes = new Set(["charla", "firma", "sorteo", "webinar"]);
      const eventTypeMap = {
        "charla/conferencia": "charla",
        "charla": "charla",
        "firma libros": "firma",
        "firma": "firma",
        "sorteo": "sorteo",
        "webinar/seminario": "webinar",
        "webinar": "webinar",
      };
      const eventType = eventTypeMap[rawEventType.toLowerCase()] || rawEventType;

      if (!title) {
        return res.status(400).json({ error: "El titulo es obligatorio" });
      }

      if (!allowedTypes.has(eventType)) {
        return res.status(400).json({ error: "Tipo de evento invalido" });
      }

      if (title.length > 100) {
        return res.status(400).json({
          error: "El titulo no puede superar los 100 caracteres",
        });
      }

      if (rawLink && rawLink.length > 255) {
        return res.status(400).json({
          error: "El enlace no puede superar los 255 caracteres",
        });
      }

      const nextDate = rawDate;
      const nextTime = rawTime;
      const nextProvince = rawProvince;
      const nextLink = rawLink;
      const nextDescription = description;
      const imageUrl = req.file ? `/uploads/events/${path.basename(req.file.path)}` : null;

      if (sendProvinceEmail && !nextProvince) {
        return res.status(400).json({ error: "Selecciona una provincia para enviar el aviso." });
      }

      await connection.beginTransaction();

      const [result] = await connection.query(
        `
        INSERT INTO events (
          title,
          description,
          event_type,
          province,
          date,
          time,
          link,
          status,
          image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `,
        [
          title,
          nextDescription,
          eventType,
          nextProvince,
          nextDate,
          nextTime,
          nextLink,
          imageUrl,
        ]
      );

      await syncEventBanner(connection, result.insertId, showAsBanner);

      const [rows] = await connection.query(
        `
        SELECT
          events.id,
          events.title,
          events.description,
          events.event_type,
          events.province,
          DATE_FORMAT(events.date, '%Y-%m-%d') AS date,
          DATE_FORMAT(events.time, '%H:%i:%s') AS time,
          events.link,
          events.created_at,
          events.status,
          events.image_url,
          COALESCE(
            (
              SELECT b.active
              FROM banners b
              WHERE b.event_id = events.id
              ORDER BY b.id ASC
              LIMIT 1
            ),
            1
          ) AS show_as_banner,
          events.updated_at
        FROM events
        WHERE events.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      await connection.commit();
      preserveEventImage = true;

      let emailNotification = null;
      if (sendProvinceEmail) {
        const escapeEmailHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        }[character]));
        const eventTypeLabels = { charla: "Charla/Conferencia", firma: "Firma de libros", sorteo: "Sorteo", webinar: "Webinar/Seminario" };
        const eventDateLabel = nextDate ? nextDate.split("-").reverse().join("/") : "Por confirmar";
        const eventTimeLabel = nextTime ? String(nextTime).slice(0, 5) : "Por confirmar";
        const eventDescription = nextDescription || "Próximamente compartiremos más información.";
        const eventLink = nextLink
          ? `<p><strong>Más información:</strong> <a href="${escapeEmailHtml(nextLink)}">${escapeEmailHtml(nextLink)}</a></p>`
          : "";
        const emailAttachments = [];
        try {
        if (req.file?.path) {
          const extension = path.extname(req.file.originalname).toLowerCase();
          const attachmentPath = path.join(__dirname, "uploads", "emails", `event-poster-${result.insertId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
          await fs.promises.mkdir(path.dirname(attachmentPath), { recursive: true });
          await fs.promises.copyFile(req.file.path, attachmentPath);
          emailAttachments.push({ originalname: req.file.originalname, path: attachmentPath });
        }
        const emailHtml = `
          <div style="font-family:Arial,sans-serif;color:#243333;line-height:1.6;max-width:640px;margin:0 auto">
            <h1 style="color:#0f6970">Nuevo evento en ${escapeEmailHtml(nextProvince)}</h1>
            <h2>${escapeEmailHtml(title)}</h2>
            <p><strong>Tipo:</strong> ${escapeEmailHtml(eventTypeLabels[eventType] || eventType)}</p>
            <p><strong>Fecha:</strong> ${escapeEmailHtml(eventDateLabel)}<br><strong>Hora:</strong> ${escapeEmailHtml(eventTimeLabel)}</p>
            <p><strong>Provincia:</strong> ${escapeEmailHtml(nextProvince)}</p>
            <p><strong>Descripción:</strong><br>${escapeEmailHtml(eventDescription).replace(/\r?\n/g, "<br>")}</p>
            ${eventLink}
            ${emailAttachments.length ? "<p>Adjuntamos el cartel del evento.</p>" : ""}
            <p>Te esperamos,<br>Bellumartis</p>
          </div>`;
        const emailText = [
          `Nuevo evento en ${nextProvince}: ${title}`,
          `Tipo: ${eventTypeLabels[eventType] || eventType}`,
          `Fecha: ${eventDateLabel}`,
          `Hora: ${eventTimeLabel}`,
          `Provincia: ${nextProvince}`,
          `Descripción: ${eventDescription}`,
          nextLink ? `Más información: ${nextLink}` : "",
        ].filter(Boolean).join("\n");
          emailNotification = await adminEmailsRoutes.enqueueAdminEmail({
            type: "province",
            recipients: [nextProvince],
            subject: `Nuevo evento en ${nextProvince}: ${title}`,
            html: emailHtml,
            text: emailText,
            attachments: emailAttachments,
          });
        } catch (emailError) {
          console.error("ADMIN EVENT EMAIL QUEUE ERROR:", emailError);
          emailNotification = { error: emailError.message || "No se pudo preparar el aviso por email." };
        }
      }

      return res.status(201).json({
        message: "Evento creado correctamente",
        event: rows[0] || null,
        emailNotification,
      });
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("ADMIN CREATE EVENT ROLLBACK ERROR:", rollbackError);
      }
      console.error("ADMIN CREATE EVENT ERROR:", err);
      return res.status(500).json({ error: "No se pudo crear el evento" });
    } finally {
      if (req.file?.path && !preserveEventImage) {
        await fs.promises.unlink(req.file.path).catch(() => { });
      }
      connection.release();
    }
  }
);

/*
====================================
ADMIN EVENTS STATS
====================================
*/
app.get(
  "/admin/events/stats",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await syncFinishedEvents();

      const [rows] = await pool.query(
        `
        SELECT
          COUNT(*) AS total_events,
          SUM(
            CASE
              WHEN status IN ('scheduled', 'ongoing')
               AND (date IS NULL OR date >= CURDATE())
              THEN 1
              ELSE 0
            END
          ) AS upcoming_events,
          SUM(
            CASE
              WHEN status = 'finished'
               OR (date IS NOT NULL AND date < CURDATE())
              THEN 1
              ELSE 0
            END
          ) AS past_events,
          (SELECT COUNT(*) FROM user_events) AS interested_users
        FROM events
        `
      );

      return res.json(
        rows[0] || {
          total_events: 0,
          upcoming_events: 0,
          past_events: 0,
          interested_users: 0,
        }
      );
    } catch (err) {
      console.error("ADMIN EVENTS STATS ERROR:", err);
      return res.status(500).json({ error: "No se pudieron obtener las metricas de eventos" });
    }
  }
);

/*
====================================
ADMIN EVENT STATUS UPDATE
====================================
*/
app.patch(
  "/admin/events/:id/status",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id);
      const { status } = req.body || {};
      const allowedStatuses = new Set([
        "scheduled",
        "ongoing",
        "finished",
        "cancelled",
      ]);

      if (!Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "ID de evento invalido" });
      }

      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ error: "Estado de evento invalido" });
      }

      const [result] = await pool.query(
        `
        UPDATE events
        SET status = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [status, eventId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Evento no encontrado" });
      }

      if (status === "finished") {
        await deleteEventBanners(pool, eventId);
      }

      return res.json({
        message: "Estado del evento actualizado correctamente",
        status,
      });
    } catch (err) {
      console.error("ADMIN EVENT STATUS ERROR:", err);
      return res.status(500).json({ error: "No se pudo actualizar el estado del evento" });
    }
  }
);

/*
====================================
ADMIN EVENT UPDATE
====================================
*/
app.put(
  "/admin/events/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  eventUpload.single("image"),
  async (req, res) => {
    const connection = await pool.getConnection();
    let preserveEventImage = false;

    try {
      const eventId = Number(req.params.id);
      const normalizeNullable = (value) => {
        const next = String(value || "").trim();
        return next ? next : null;
      };

      const title = String(req.body?.title || "").trim();
      const description = normalizeNullable(req.body?.description);
      const rawEventType = String(req.body?.event_type || "").trim().toLowerCase();
      const province = normalizeNullable(req.body?.province);
      const date = normalizeNullable(req.body?.date);
      const time = normalizeNullable(req.body?.time);
      const link = normalizeNullable(req.body?.link);
      const imageUrl = req.file ? `/uploads/events/${path.basename(req.file.path)}` : null;

      const eventTypeMap = {
        charla: "charla",
        "charla/conferencia": "charla",
        "firma libros": "firma",
        firma: "firma",
        sorteo: "sorteo",
        "webinar/seminario": "webinar",
        webinar: "webinar",
      };

      const eventType = eventTypeMap[rawEventType] || rawEventType;
      const allowedTypes = new Set(["charla", "firma", "sorteo", "webinar"]);

      if (!Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "ID de evento invalido" });
      }

      if (!title) {
        return res.status(400).json({ error: "El titulo del evento es obligatorio" });
      }

      if (!allowedTypes.has(eventType)) {
        return res.status(400).json({ error: "Tipo de evento invalido" });
      }

      if (title.length > 100) {
        return res.status(400).json({ error: "El titulo del evento es demasiado largo" });
      }

      if (link && link.length > 255) {
        return res.status(400).json({ error: "El enlace del evento es demasiado largo" });
      }

      await connection.beginTransaction();

      const [result] = await connection.query(
        `
        UPDATE events
        SET title = ?,
            description = ?,
            event_type = ?,
            province = ?,
            date = ?,
            time = ?,
            link = ?,
            image_url = COALESCE(?, image_url),
            updated_at = NOW()
        WHERE id = ?
        `,
        [title, description, eventType, province, date, time, link, imageUrl, eventId]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Evento no encontrado" });
      }

      await syncEventBanner(connection, eventId, normalizeBannerActive(req.body?.show_as_banner));

      const [rows] = await connection.query(
        `
        SELECT
          events.id,
          events.title,
          events.description,
          events.event_type,
          events.province,
          DATE_FORMAT(events.date, '%Y-%m-%d') AS date,
          DATE_FORMAT(events.time, '%H:%i:%s') AS time,
          events.link,
          events.created_at,
          events.status,
          events.image_url,
          COALESCE(
            (
              SELECT b.active
              FROM banners b
              WHERE b.event_id = events.id
              ORDER BY b.id ASC
              LIMIT 1
            ),
            1
          ) AS show_as_banner,
          events.updated_at
        FROM events
        WHERE events.id = ?
        LIMIT 1
        `,
        [eventId]
      );

      await connection.commit();
      preserveEventImage = true;

      return res.json({
        message: "Evento actualizado correctamente",
        event: rows[0] || null,
      });
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("ADMIN EVENT UPDATE ROLLBACK ERROR:", rollbackError);
      }
      console.error("ADMIN EVENT UPDATE ERROR:", err);
      return res.status(500).json({ error: "No se pudo actualizar el evento" });
    } finally {
      if (req.file?.path && !preserveEventImage) {
        await fs.promises.unlink(req.file.path).catch(() => { });
      }
      connection.release();
    }
  }
);

/*
====================================
ADMIN BANNERS LIST
====================================
*/
app.get(
  "/admin/banners",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await syncFinishedEvents();

      const [rows] = await pool.query(
        `
        SELECT
          b.id,
          b.banner_type,
          b.event_id,
          b.title,
          b.additional_text,
          b.image_url,
          b.link,
          b.active,
          b.created_at,
          e.title AS event_title,
          e.province AS event_province,
          e.image_url AS event_image_url,
          e.link AS event_link,
          e.event_type
        FROM banners b
        LEFT JOIN events e ON e.id = b.event_id
        ORDER BY b.created_at DESC, b.id DESC
        `
      );

      return res.json(rows.map(mapBannerRow));
    } catch (err) {
      console.error("ADMIN BANNERS LIST ERROR:", err);
      return res.status(500).json({ error: "No se pudo obtener la lista de banners" });
    }
  }
);

/*
====================================
ADMIN BANNERS CREATE MANUAL
====================================
*/
app.post(
  "/admin/banners",
  verifyToken,
  checkRole(["admin", "owner"]),
  parseBannerUpload,
  async (req, res) => {
    let savedImage = null;
    let imagePersisted = false;
    try {
      const title = String(req.body?.title || "").trim();
      const additionalText = String(req.body?.additional_text || "").trim();
      const link = String(req.body?.link || "").trim();
      const bannerType = String(req.body?.banner_type || MANUAL_BANNER_TYPE).trim();
      const active = normalizeBannerActive(req.body?.active);

      if (!title) {
        return res.status(400).json({ error: "El titulo es obligatorio" });
      }

      if (!MANUAL_BANNER_TYPES.has(bannerType)) {
        return res.status(400).json({ error: "El tipo de banner no es valido" });
      }

      if (title.length > 255 || additionalText.length > 255 || link.length > 255) {
        return res.status(400).json({ error: "Alguno de los campos supera el limite permitido" });
      }

      savedImage = await saveBannerImage(req.file);
      const imageUrl = savedImage?.imageUrl || String(req.body?.image_url || "").trim();
      if (!imageUrl) return res.status(400).json({ error: "La imagen es obligatoria" });
      if (imageUrl.length > 255) {
        if (savedImage) await fs.promises.unlink(savedImage.filepath).catch(() => {});
        return res.status(400).json({ error: "La URL de la imagen supera el limite permitido" });
      }

      const [result] = await pool.query(
        `
        INSERT INTO banners (
          banner_type,
          event_id,
          title,
          additional_text,
          image_url,
          link,
          active
        ) VALUES (?, NULL, ?, ?, ?, ?, ?)
        `,
        [bannerType, title, additionalText || null, imageUrl, link || null, active ? 1 : 0]
      );
      imagePersisted = true;

      const [rows] = await pool.query(
        `
        SELECT
          b.id,
          b.banner_type,
          b.event_id,
          b.title,
          b.additional_text,
          b.image_url,
          b.link,
          b.active,
          b.created_at,
          NULL AS event_title,
          NULL AS event_province,
          NULL AS event_image_url,
          NULL AS event_link,
          NULL AS event_type
        FROM banners b
        WHERE b.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      return res.status(201).json({
        message: "Banner creado correctamente",
        banner: mapBannerRow(rows[0] || null),
      });
    } catch (err) {
      if (savedImage && !imagePersisted) await fs.promises.unlink(savedImage.filepath).catch(() => {});
      console.error("ADMIN BANNERS CREATE ERROR:", err);
      return res.status(err.statusCode || 500).json({ error: err.message || "No se pudo crear el banner" });
    }
  }
);

/*
====================================
ADMIN BANNERS UPDATE MANUAL
====================================
*/
app.put(
  "/admin/banners/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  parseBannerUpload,
  async (req, res) => {
    let savedImage = null;
    let imagePersisted = false;
    try {
      const bannerId = Number(req.params.id);

      if (!Number.isInteger(bannerId) || bannerId <= 0) {
        return res.status(400).json({ error: "ID de banner invalido" });
      }

      const title = String(req.body?.title || "").trim();
      const additionalText = String(req.body?.additional_text || "").trim();
      const link = String(req.body?.link || "").trim();

      if (!title) {
        return res.status(400).json({ error: "El titulo es obligatorio" });
      }

      if (title.length > 255 || additionalText.length > 255 || link.length > 255) {
        return res.status(400).json({ error: "Alguno de los campos supera el limite permitido" });
      }

      const [bannerRows] = await pool.query(
        `
        SELECT id, banner_type, event_id
        FROM banners
        WHERE id = ?
        LIMIT 1
        `,
        [bannerId]
      );

      const banner = bannerRows[0];
      if (!banner) {
        return res.status(404).json({ error: "Banner no encontrado" });
      }

      savedImage = await saveBannerImage(req.file);
      const imageUrl = savedImage?.imageUrl || String(req.body?.image_url || "").trim();
      if (!imageUrl) return res.status(400).json({ error: "La imagen es obligatoria" });
      if (imageUrl.length > 255) {
        if (savedImage) await fs.promises.unlink(savedImage.filepath).catch(() => {});
        return res.status(400).json({ error: "La URL de la imagen supera el limite permitido" });
      }

      await pool.query(
        `
        UPDATE banners
        SET title = ?,
            additional_text = ?,
            image_url = ?,
            link = ?
        WHERE id = ?
        `,
        [title, additionalText || null, imageUrl, link || null, bannerId]
      );
      imagePersisted = true;

      const [rows] = await pool.query(
        `
        SELECT
          b.id,
          b.banner_type,
          b.event_id,
          b.title,
          b.additional_text,
          b.image_url,
          b.link,
          b.active,
          b.created_at,
          NULL AS event_title,
          NULL AS event_province,
          NULL AS event_image_url,
          NULL AS event_link,
          NULL AS event_type
        FROM banners b
        WHERE b.id = ?
        LIMIT 1
        `,
        [bannerId]
      );

      return res.json({
        message: "Banner actualizado correctamente",
        banner: mapBannerRow(rows[0] || null),
      });
    } catch (err) {
      if (savedImage && !imagePersisted) await fs.promises.unlink(savedImage.filepath).catch(() => {});
      console.error("ADMIN BANNERS UPDATE ERROR:", err);
      return res.status(err.statusCode || 500).json({ error: err.message || "No se pudo actualizar el banner" });
    }
  }
);

/*
====================================
ADMIN BANNERS TOGGLE STATUS
====================================
*/
app.patch(
  "/admin/banners/:id/status",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const bannerId = Number(req.params.id);
      const { active } = req.body || {};

      if (!Number.isInteger(bannerId) || bannerId <= 0) {
        return res.status(400).json({ error: "ID de banner invalido" });
      }

      const nextActive = normalizeBannerActive(active) ? 1 : 0;

      const [result] = await pool.query(
        `
        UPDATE banners
        SET active = ?
        WHERE id = ?
        `,
        [nextActive, bannerId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Banner no encontrado" });
      }

      return res.json({
        message: "Estado del banner actualizado correctamente",
        active: Boolean(nextActive),
      });
    } catch (err) {
      console.error("ADMIN BANNERS STATUS ERROR:", err);
      return res.status(500).json({ error: "No se pudo actualizar el estado del banner" });
    }
  }
);

/*
====================================
ADMIN BANNERS DELETE MANUAL
====================================
*/
app.delete(
  "/admin/banners/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const bannerId = Number(req.params.id);

      if (!Number.isInteger(bannerId) || bannerId <= 0) {
        return res.status(400).json({ error: "ID de banner invalido" });
      }

      const [bannerRows] = await pool.query(
        `
        SELECT id, banner_type, event_id
        FROM banners
        WHERE id = ?
        LIMIT 1
        `,
        [bannerId]
      );

      const banner = bannerRows[0];
      if (!banner) {
        return res.status(404).json({ error: "Banner no encontrado" });
      }

      if (banner.event_id) {
        return res.status(400).json({ error: "Los banners de eventos no se pueden eliminar manualmente" });
      }

      if (banner.banner_type !== MANUAL_BANNER_TYPE) {
        return res.status(400).json({ error: "Solo se pueden eliminar banners de promocion manual" });
      }

      await pool.query("DELETE FROM banners WHERE id = ?", [bannerId]);

      return res.json({ message: "Banner eliminado correctamente" });
    } catch (err) {
      console.error("ADMIN BANNERS DELETE ERROR:", err);
      return res.status(500).json({ error: "No se pudo eliminar el banner" });
    }
  }
);

/*
====================================
PUBLIC CURRENT BANNER
====================================
*/
app.get("/banners/current", async (req, res) => {
  try {
    await syncFinishedEvents();

    let userProvince = "";
    let isAuthenticated = false;

    const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload?.id) {
          const [userRows] = await pool.query(
            "SELECT province FROM users WHERE id = ? LIMIT 1",
            [payload.id]
          );
          isAuthenticated = userRows.length > 0;
          userProvince = userRows[0]?.province || "";
        }
      } catch (tokenError) {
        userProvince = "";
        isAuthenticated = false;
      }
    }

    const banner = await getPublicBanner(pool, userProvince, isAuthenticated);

    return res.json({ banner });
  } catch (err) {
    console.error("PUBLIC BANNER ERROR:", err);
    return res.status(500).json({ error: "No se pudo obtener el banner" });
  }
});

/*
====================================
ADMIN EVENT DELETE
====================================
*/
app.delete(
  "/admin/events/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: "ID de evento invalido" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [eventRows] = await connection.query(
        "SELECT id, image_url FROM events WHERE id = ? LIMIT 1",
        [eventId]
      );

      if (eventRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Evento no encontrado" });
      }

      await connection.query(
        "DELETE FROM user_events WHERE event_id = ?",
        [eventId]
      );

      await connection.query(
        "DELETE FROM events WHERE id = ?",
        [eventId]
      );

      await deleteEventBanners(connection, eventId);
      await connection.commit();

      const imageUrl = eventRows[0]?.image_url || "";
      if (typeof imageUrl === "string" && imageUrl.trim()) {
        const relativePath = imageUrl.replace(/^\/+/, "");
        const absolutePath = path.join(__dirname, relativePath);

        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (fileError) {
            console.error("DELETE EVENT IMAGE FILE ERROR:", fileError);
          }
        }
      }

      return res.json({
        message: "Evento eliminado correctamente",
      });
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("DELETE EVENT ROLLBACK ERROR:", rollbackError);
      }

      console.error("ADMIN EVENT DELETE ERROR:", err);
      return res.status(500).json({ error: "No se pudo eliminar el evento" });
    } finally {
      connection.release();
    }
  }
);

/*
====================================
CONTENT VIDEOS
====================================
*/

app.use("/api/content", contentRoutes);

/*
====================================
SERVER
====================================
*/
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send(
    "API Bellumartis funcionando correctamente"
  );
});

console.log("users/me route loaded");

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
