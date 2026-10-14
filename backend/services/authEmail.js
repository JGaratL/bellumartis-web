const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { sendEmail } = require("./brevoService");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const MAIL_FROM =
  process.env.MAIL_FROM || "admin@bellumartis.com";

const hashToken = (token) =>
  crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");

const createEmailVerificationToken = (user) =>
  jwt.sign(
    {
      purpose: "email-verification",
      email: user.email,
      nickname: user.nickname,
    },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: "24h",
    }
  );

const verifyEmailVerificationToken = (token) => {
  const payload = jwt.verify(
    token,
    process.env.JWT_SECRET
  );

  if (payload.purpose !== "email-verification") {
    throw new Error("Token de verificacion invalido");
  }

  return payload;
};

const createResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    hash: hashToken(token),
  };
};

const buildVerificationLink = (token) =>
  `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

const buildResetLink = (token) =>
  `${FRONTEND_URL}/reset-password/${encodeURIComponent(token)}`;

const sendMail = async ({ to, subject, html, text }) => {
  return sendEmail({
    to,
    subject,
    html,
    text,
    type: subject.startsWith("Verifica") ? "verification" : "password_reset",
  });
};

const sendVerificationEmail = async (user) => {
  const token = createEmailVerificationToken(user);
  const link = buildVerificationLink(token);

  await sendMail({
    to: user.email,

    subject: "Verifica tu email en BellumArtis",

    text: `Hola ${user.nickname || "usuario"}.

Verifica tu email aqui: ${link}

El enlace caduca en 24 horas.`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Verifica tu email</h2>

        <p>Hola ${user.nickname || "usuario"},</p>

        <p>
          Gracias por registrarte en BellumArtis.
          Pulsa el siguiente enlace para activar tu cuenta:
        </p>

        <p>
          <a
            href="${link}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#0f6970;
              color:#fff;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Verificar email
          </a>
        </p>

        <p>
          Si el boton no funciona, copia y pega este enlace:
        </p>

        <p>
          <a href="${link}">${link}</a>
        </p>

        <p>El enlace caduca en 24 horas.</p>
      </div>
    `,
  });

  return { accepted: true };
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const link = buildResetLink(resetToken);

  await sendMail({
    to: user.email,

    subject: "Restablece tu contraseña en BellumArtis",

    text: `Hola ${user.nickname || "usuario"}.

Cambia tu contraseña aqui: ${link}

El enlace caduca en 1 hora.`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Restablecer contraseña</h2>

        <p>Hola ${user.nickname || "usuario"},</p>

        <p>
          Hemos recibido una solicitud para cambiar tu contraseña.
          Pulsa el siguiente enlace:
        </p>

        <p>
          <a
            href="${link}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#0f6970;
              color:#fff;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Cambiar contraseña
          </a>
        </p>

        <p>
          Si el boton no funciona, copia y pega este enlace:
        </p>

        <p>
          <a href="${link}">${link}</a>
        </p>

        <p>El enlace caduca en 1 hora.</p>
      </div>
    `,
  });

  return { accepted: true };
};

module.exports = {
  hashToken,
  createResetToken,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
