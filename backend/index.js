const express = require("express");
const postsRoutes = require("./routes/posts");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const checkRole = require("./middleware/role");
const verifyToken = require("./middleware/auth");
const { OAuth2Client } = require("google-auth-library");
const contentRoutes = require("./routes/contentRoutes");
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


const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/posts");
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

require("dotenv").config();

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/notifications", notificationsRoutes);




const upload = multer({

  storage,

  fileFilter: (req, file, cb) => {

    const allowed = /jpg|jpeg|png|webp/;

    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase());

    if (valid) {
      cb(null, true);
    } else {
      cb(new Error("Solo imágenes"));
    }
  }
});


/*
====================================
HELPER JWT
====================================
*/
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role || "user",
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
const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password || "");
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
          "La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo",
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
        const token = generateToken(user);

        return res.json({
          message: "Cuenta Google completada con password local",
          token,
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
      console.error("EMAIL VERIFICATION ERROR:", mailError);
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
      return res.status(400).json({
        error: "Usuario no encontrado",
      });
    }

    const user = rows[0];

    if (user.provider === "google" && !user.password) {
      return res.status(400).json({
        error: "Este usuario usa Google login",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({
        error: "Contraseña incorrecta",
      });
    }

    if (!user.email_verified_at || user.status === "inactive") {
      return res.status(403).json({
        error: "Tu email aun no esta verificado. Revisa tu correo o solicita un nuevo enlace.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const token = generateToken(user);

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
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

    const [rows] = await pool.query(
      "SELECT id, nickname, email, email_verified_at, status FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.json({
        message: "Si el email existe, enviaremos un nuevo enlace de verificacion.",
      });
    }

    const user = rows[0];

    if (user.email_verified_at || user.status === "active") {
      return res.json({
        message: "Tu email ya estaba verificado.",
      });
    }

    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      console.error("RESEND VERIFICATION MAIL ERROR:", mailError);
    }

    return res.json({
      message: "Te hemos enviado un nuevo enlace de verificacion.",
    });
  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);
    return res.status(500).json({ error: "No se pudo reenviar la verificacion" });
  }
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

    const [rows] = await pool.query(
      "SELECT id, nickname, email, password FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0 || !rows[0].password) {
      return res.json({
        message:
          "Si existe una cuenta local con ese email, recibirás un enlace para cambiar la contraseña.",
      });
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
      console.error("RESET PASSWORD MAIL ERROR:", mailError);
    }

    return res.json({
      message: "Te hemos enviado un enlace para restablecer la contrasena.",
    });
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
          "La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo",
      });
    }

    const tokenHash = hashToken(token);

    const [rows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE reset_password_token = ?
        AND reset_password_expires IS NOT NULL
        AND reset_password_expires > NOW()
      LIMIT 1
      `,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        error: "El enlace ha caducado o no es valido",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET password = ?, reset_password_token = NULL, reset_password_expires = NULL
      WHERE id = ?
      `,
      [hashedPassword, rows[0].id]
    );

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

    const token = generateToken(user);

    res.json({
      token,
      user,
    });
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
    `SELECT id, nickname, email, province, country, created_at, profile_image,
            x_url, facebook_url, instagram_url, youtube_url
     FROM users
     WHERE id = ?`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.json(rows[0]);
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

      if (province) {
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
EDIT PROFILE
====================================
*/

app.put("/users/me", verifyToken, async (req, res) => {
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
      const matches = nextProfileImage.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);

      if (!matches || !matches[1]) {
        return res.status(400).json({ error: "Imagen de perfil inválida" });
      }

      const buffer = Buffer.from(matches[1], "base64");
      const avatarsDir = path.join(__dirname, "uploads", "avatars");
      fs.mkdirSync(avatarsDir, { recursive: true });

      const filename = `avatar-${req.user.id}-${Date.now()}.webp`;
      const outputPath = path.join(avatarsDir, filename);

      await sharp(buffer)
        .resize(500, 500, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(outputPath);

      nextProfileImage = `/uploads/avatars/${filename}`;

      if (
        oldProfileImage &&
        typeof oldProfileImage === "string" &&
        (oldProfileImage.startsWith("/uploads/avatars/") ||
          oldProfileImage.startsWith("uploads/avatars/"))
      ) {
        const oldRelative = oldProfileImage.replace(/^\/+/, "");
        const oldAbsolutePath = path.join(__dirname, oldRelative);

        if (fs.existsSync(oldAbsolutePath) && oldAbsolutePath !== outputPath) {
          fs.unlinkSync(oldAbsolutePath);
        }
      }
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

    return res.json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
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
          "La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo",
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
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, user.id]
    );

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

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
    const userId = req.body.userId;

    const user = await User.findById(userId);

    // 1. borrar anterior si existe
    if (user.profile_image && !user.profile_image.includes("default")) {
        const oldPath = path.join(
            "uploads",
            path.basename(user.profile_image)
        );

        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    // 2. procesar nueva imagen (sharp ya lo haces aquí)
    const filename = Date.now() + ".webp";
    const outputPath = path.join("uploads", filename);

    await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(outputPath);

    const newUrl = `/uploads/${filename}`;

    // 3. guardar en BD
    user.profile_image = newUrl;
    await user.save();

    res.json({ url: newUrl });
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

  res.json(rows[0]);
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

/*
====================================
EVENTS LIST
====================================
*/
app.get("/events", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT events.*,
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
    const [rows] = await pool.query(
      `
      SELECT events.*,
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
app.get("/events/:id/users", async (req, res) => {
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

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

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
