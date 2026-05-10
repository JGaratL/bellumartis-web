const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const checkRole = require("./middleware/role");

require("dotenv").config();

const app = express();

const verifyToken = require("./middleware/auth");

app.use(cors());
app.use(express.json());

/*
====================================
REGISTRO
====================================
*/

app.post("/register", async (req, res) => {
  try {
    const {
      nickname,
      email,
      password,
      province,
      country
    } = req.body;

    // comprobar si usuario ya existe
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR nickname = ?",
      [email, nickname]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: "Email o nickname ya en uso",
      });
    }

    // hashear password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insertar usuario
    const [result] = await pool.query(
      `
      INSERT INTO users
      (nickname, email, password, province, country)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        nickname,
        email,
        hashedPassword,
        province,
        country
      ]
    );

    res.json({
      message: "Usuario registrado correctamente",
      userId: result.insertId,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error en el servidor",
    });
  }
});

/*
====================================
LOGIN
====================================
*/

app.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;

    // buscar usuario
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        error: "Usuario no encontrado",
      });
    }

    const user = rows[0];

    // comparar password
    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        error: "Contraseña incorrecta",
      });
    }

    // crear token JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // actualizar último login
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

    res.status(500).json({
      error: "Error en el servidor",
    });
  }
});

/*  RUTA PROTEGIDA */

app.get("/profile", verifyToken, async (req, res) => {
  res.json({
    message: "Acceso autorizado",
    user: req.user
  });
});

/*  EVENTOS (CREAR) */

app.post(
  "/events",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const { title, description, event_type, province, date, link } = req.body;

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
        eventId: result.insertId
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error creando evento" });
    }
  }
);

/*  EVENTOS (LISTAR) */

app.get("/events", async (req, res) => {
  try {

    const [rows] = await pool.query(
      `
      SELECT
        events.*,
        COUNT(user_events.id) AS attendees

      FROM events

      LEFT JOIN user_events
      ON events.id = user_events.event_id

      GROUP BY events.id

      ORDER BY date ASC
      `
    );

    res.json(rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Error obteniendo eventos"
    });
  }
});

/*  EVENTOS (VER UN EVENTO) */

app.get("/events/:id", async (req, res) => {
  try {

    const eventId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT
        events.*,
        COUNT(user_events.id) AS attendees

      FROM events

      LEFT JOIN user_events
      ON events.id = user_events.event_id

      WHERE events.id = ?

      GROUP BY events.id
      `,
      [eventId]
    );

    // no existe evento
    if (rows.length === 0) {
      return res.status(404).json({
        error: "Evento no encontrado"
      });
    }

    res.json(rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Error obteniendo evento"
    });
  }
});

/*  EVENTOS (APUNTARSE) */

app.post("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    // comprobar si ya está apuntado
    const [existing] = await pool.query(
      "SELECT id FROM user_events WHERE user_id = ? AND event_id = ?",
      [userId, eventId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Ya estás apuntado a este evento"
      });
    }

    // insertar asistencia
    await pool.query(
      `
      INSERT INTO user_events (user_id, event_id, status)
      VALUES (?, ?, 'going')
      `,
      [userId, eventId]
    );

    res.json({
      message: "Te has apuntado al evento"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al apuntarse" });
  }
});

/*  EVENTOS (CANCELAR ASISTENCIA) */

app.delete("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    await pool.query(
      "DELETE FROM user_events WHERE user_id = ? AND event_id = ?",
      [userId, eventId]
    );

    res.json({
      message: "Has cancelado tu asistencia"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cancelar asistencia" });
  }
});

/*  EVENTOS (VER ASISTENTES) */

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

/*  EVENTOS (VER SI UN USUARIO ESTÁ APUNTADO) */

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

    // no está apuntado
    if (rows.length === 0) {
      return res.json({
        joined: false
      });
    }

    // sí está apuntado
    res.json({
      joined: true,
      status: rows[0].status
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Error obteniendo estado"
    });
  }
});

/*
====================================
TEST
====================================
*/

app.get("/", (req, res) => {
  res.send("Backend BellumArtis funcionando");
});

/*
====================================
SERVER
====================================
*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});