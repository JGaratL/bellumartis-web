
function PrivacyPolicy() {
  return (
    <div className="legal-page section">

      <h1>Política de Privacidad</h1>

      <p className="legal-intro">
        En cumplimiento del Reglamento (UE) 2016/679 (Reglamento General de Protección de Datos - RGPD)
        y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales,
        se informa a los usuarios de esta web sobre el tratamiento de sus datos personales.
      </p>

      {/* ===================== */}
      <section>
        <h2>1. Responsable del tratamiento</h2>

        <p><strong>Identidad:</strong> Bellumartis</p>
        <p><strong>Titular:</strong> Francisco García Campa</p>
        <p><strong>Actividad:</strong> Divulgación de historia militar y actualidad geopolítica</p>
        <p><strong>Contacto:</strong> info@bellumartis.com</p>
      </section>

      {/* ===================== */}
      <section>
        <h2>2. Finalidad del tratamiento de los datos</h2>

        <p>
          Los datos personales que el usuario facilite a través de formularios de contacto,
          registro o suscripción serán tratados con las siguientes finalidades:
        </p>

        <ul>
          <li>Gestionar el registro de usuarios en la plataforma.</li>
          <li>Atender consultas, solicitudes o comunicaciones.</li>
          <li>Enviar comunicaciones informativas relacionadas con el proyecto.</li>
          <li>Mejorar la experiencia del usuario en la web.</li>
        </ul>
      </section>

      {/* ===================== */}
      <section>
        <h2>3. Legitimación</h2>

        <p>
          El tratamiento de los datos se basa en el consentimiento del usuario,
          así como en la ejecución de servicios solicitados y el interés legítimo
          del responsable en el desarrollo de su actividad divulgativa.
        </p>
      </section>

      {/* ===================== */}
      <section>
        <h2>4. Conservación de los datos</h2>

        <p>
          Los datos personales se conservarán durante el tiempo estrictamente necesario
          para cumplir la finalidad para la que fueron recogidos y para determinar posibles
          responsabilidades legales.
        </p>
      </section>

      {/* ===================== */}
      <section>
        <h2>5. Comunicación de datos a terceros</h2>

        <p>
          No se cederán datos personales a terceros salvo obligación legal o cuando sea
          necesario para la prestación del servicio (por ejemplo, proveedores tecnológicos
          o de hosting).
        </p>
      </section>

      {/* ===================== */}
      <section>
        <h2>6. Derechos del usuario</h2>

        <p>
          El usuario puede ejercer en cualquier momento los siguientes derechos:
        </p>

        <ul>
          <li>Acceso a sus datos personales.</li>
          <li>Rectificación de datos inexactos.</li>
          <li>Supresión de sus datos cuando ya no sean necesarios.</li>
          <li>Limitación u oposición al tratamiento.</li>
          <li>Portabilidad de los datos.</li>
        </ul>

        <p>
          Para ejercer estos derechos puede enviar un correo a:
          <strong> contacto@bellumartis.com</strong>
        </p>
      </section>

      {/* ===================== */}
      <section>
        <h2>7. Seguridad de los datos</h2>

        <p>
          Se han adoptado medidas técnicas y organizativas adecuadas para garantizar la
          seguridad, integridad y confidencialidad de los datos personales,
          evitando su pérdida, alteración o acceso no autorizado.
        </p>
      </section>

      {/* ===================== */}
      <section>
        <h2>8. Cambios en la política de privacidad</h2>

        <p>
          Bellumartis se reserva el derecho a modificar la presente política para adaptarla
          a novedades legislativas o cambios en la actividad del proyecto.
        </p>
      </section>

      {/* ===================== */}
      <p className="legal-footer">
        Última actualización: mayo de 2026
      </p>

    </div>
  );
}

export default PrivacyPolicy;