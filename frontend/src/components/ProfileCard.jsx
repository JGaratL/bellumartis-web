import { useState } from "react";
import "./ProfileCard.css";
import { FaPen } from "react-icons/fa";

function ProfileCard({ user, editable, onSave }) {
  const [form, setForm] = useState(user);
  const [editingField, setEditingField] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveField = async (field) => {
    setEditingField(null);
    if (onSave) onSave(form);
  };

  const Field = ({ label, field }) => (
    <div className="pc-field">
      <span className="pc-label">{label}</span>

      {editingField === field && editable ? (
        <input
          className="pc-input"
          value={form[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          onBlur={() => saveField(field)}
          autoFocus
        />
      ) : (
        <div className="pc-value">
          {form[field] || "-"}
        </div>
      )}

      {editable && (
        <FaPen
          className="pc-icon"
          onClick={() => setEditingField(field)}
        />
      )}
    </div>
  );

  return (
    <div className="profile-card">
      <div className="pc-header">
        <img
          src={form.profile_image || "/BHM.webp"}
          alt="avatar"
          className="pc-avatar"
        />
        <h2>{form.nickname}</h2>
      </div>

      <div className="pc-body">
        <Field label="Nickname" field="nickname" />
        <Field label="Provincia" field="province" />
        <Field label="País" field="country" />

        <Field label="X (Twitter)" field="x_url" />
        <Field label="Instagram" field="instagram_url" />
        <Field label="Facebook" field="facebook_url" />
        <Field label="YouTube" field="youtube_url" />
      </div>
    </div>
  );
}

export default ProfileCard;
