const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const checkRole = require("./middleware/role");
const verifyToken = require("./middleware/auth");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config();

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

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

/*
====================================
REGISTRO
====================================
*/
app.post("/register", async (req, res) => {
  try {
    const { nickname, email, password, province, country } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedNickname = (nickname || "").toString().trim();
    const normalizedCountry = (country || "").toString().trim();
    const normalizedProvince =
      normalizedCountry === "Espana"
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
          SET nickname = ?, password = ?, province = ?, country = ?, last_login = NOW()
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
      (nickname, email, password, province, country, provider)
      VALUES (?, ?, ?, ?, ?, 'local')
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
    const token = generateToken(user);

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [result.insertId]);

    res.json({
      message: "Usuario registrado correctamente",
      token,
      user,
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

      if (!user.google_id) {
        await pool.query(
          "UPDATE users SET google_id = ?, provider = 'google' WHERE id = ?",
          [googleId, user.id]
        );
      } else if (user.provider !== "google") {
        await pool.query("UPDATE users SET provider = 'google' WHERE id = ?", [
          user.id,
        ]);
      }

      user = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        role: user.role || "user",
        provider: "google",
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
        (nickname, email, password, provider, google_id, province, country)
        VALUES (?, ?, NULL, 'google', ?, NULL, NULL)
        `,
        [safeNickname, email, googleId]
      );

      user = {
        id: result.insertId,
        nickname: safeNickname,
        email,
        role: "user",
        provider: "google",
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
      INSERT INTO user_events (user_id, event_id, status)
      VALUES (?, ?, 'going')
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
      SELECT status
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
      status: rows[0].status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo estado" });
  }
});

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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
