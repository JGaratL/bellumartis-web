import "./ProfileCard.css";
import { useState, useEffect } from "react";
import { BiSolidPencil, BiSolidCamera } from "react-icons/bi";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import AvatarEditor from "./AvatarEditor";

const countries = [
    "Alemania",
    "Argentina",
    "Australia",
    "Belgica",
    "Brasil",
    "Canada",
    "Chile",
    "China",
    "Colombia",
    "Corea del Sur",
    "Cuba",
    "Dinamarca",
    "Ecuador",
    "España",
    "Estados Unidos",
    "Finlandia",
    "Francia",
    "Grecia",
    "Irlanda",
    "Italia",
    "Japon",
    "Mexico",
    "Noruega",
    "Paises Bajos",
    "Peru",
    "Polonia",
    "Portugal",
    "Reino Unido",
    "Republica Checa",
    "Rumania",
    "Suecia",
    "Suiza",
    "Uruguay",
    "Venezuela",
];

const provincesES = [
    "A Coruna",
    "Alava",
    "Albacete",
    "Alicante",
    "Almeria",
    "Asturias",
    "Avila",
    "Badajoz",
    "Baleares",
    "Barcelona",
    "Burgos",
    "Caceres",
    "Cadiz",
    "Cantabria",
    "Castellon",
    "Ceuta",
    "Ciudad Real",
    "Cordoba",
    "Cuenca",
    "Girona",
    "Granada",
    "Guadalajara",
    "Gipuzkoa",
    "Huelva",
    "Huesca",
    "Jaen",
    "La Rioja",
    "Las Palmas",
    "Leon",
    "Lleida",
    "Lugo",
    "Madrid",
    "Malaga",
    "Melilla",
    "Murcia",
    "Navarra",
    "Ourense",
    "Palencia",
    "Pontevedra",
    "Salamanca",
    "Santa Cruz de Tenerife",
    "Segovia",
    "Sevilla",
    "Soria",
    "Tarragona",
    "Teruel",
    "Toledo",
    "Valencia",
    "Valladolid",
    "Bizkaia",
    "Zamora",
    "Zaragoza",
];


function ProfileCard({ user, editable, onClose, onSave }) {
    if (!user) return null;

    const [tempImage, setTempImage] = useState(null);
    const [showEditor, setShowEditor] = useState(false);

    const resolveAvatarSrc = (value) => {
        if (!value || typeof value !== "string") return null;
        const avatar = value.trim();
        if (!avatar) return null;

        if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
            return avatar;
        }

        if (avatar.startsWith("/uploads/")) {
            return `http://localhost:5000${avatar}`;
        }

        if (avatar.startsWith("uploads/")) {
            return `http://localhost:5000/${avatar}`;
        }

        return avatar;
    };

    const [form, setForm] = useState(user);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setForm(user);
    }, [user]);

    const isValidUrl = (value) => {
        if (!value) return true;

        try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));

        if (["x_url", "instagram_url", "facebook_url", "youtube_url"].includes(field)) {
            setErrors(prev => ({
                ...prev,
                [field]: isValidUrl(value)
                    ? null
                    : "Introduce una URL válida (https://...)"
            }));
        }
    };

    const formatSocialUrl = (url) => {
        if (!url) return "-";

        try {
            const u = new URL(url);

            let host = u.hostname.replace("www.", "");
            let path = u.pathname.replace(/\/$/, "");

            // quitar cosas típicas innecesarias
            if (path === "/") return host;

            return host + path;
        } catch {
            return url; // si no es URL válida, lo mostramos tal cual
        }
    };

    return (
        <div className="pc-external">
            <div className="pc-internal">

                {/* IZQUIERDA */}
                <div className="pc-left">
                    <div className="pc-avatar-wrapper">

                        <img
                            src={resolveAvatarSrc(form.profile_image) || "/BHM.webp"}
                            className="pc-avatar"
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/BHM.webp";
                            }}
                        />

                        <input
                            type="file"
                            accept="image/*"
                            id="avatarInput"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                const reader = new FileReader();

                                reader.onload = (event) => {
                                    setTempImage(event.target.result);
                                    setShowEditor(true);
                                };

                                reader.readAsDataURL(file);

                                // 🔥 CLAVE
                                e.target.value = null;
                            }}
                        />

                        {editable && (
                            <div
                                className="pc-camera"
                                onClick={() => document.getElementById("avatarInput").click()}
                            >
                                <BiSolidCamera />
                            </div>
                        )}
                    </div>
                </div>

                {/* DERECHA */}
                <div className="pc-right">

                    <div className="pc-right-top">

                        {/* COLUMNA IZQUIERDA */}
                        <div className="pc-col">

                            {/* NICKNAME */}
                            <div className="pc-cell">
                                <div className="pc-label-small pc-label-row">
                                    Nickname

                                    {editable && (
                                        <BiSolidPencil
                                            className="pc-icon"
                                            onClick={() =>
                                                setForm(prev => ({
                                                    ...prev,
                                                    editingNickname: true
                                                }))
                                            }
                                        />
                                    )}
                                </div>

                                {editable && form.editingNickname ? (
                                    <input
                                        autoFocus
                                        value={form.nickname || ""}
                                        onChange={(e) =>
                                            setForm(prev => ({
                                                ...prev,
                                                nickname: e.target.value
                                            }))
                                        }
                                        onBlur={() =>
                                            setForm(prev => ({
                                                ...prev,
                                                editingNickname: false
                                            }))
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                setForm(prev => ({
                                                    ...prev,
                                                    editingNickname: false
                                                }));
                                            }

                                            if (e.key === "Escape") {
                                                setForm(prev => ({
                                                    ...prev,
                                                    nickname: user.nickname,
                                                    editingNickname: false
                                                }));
                                            }
                                        }}
                                    />
                                ) : (
                                    <div
                                        onClick={() => {
                                            if (!editable) return;

                                            setForm(prev => ({
                                                ...prev,
                                                editingNickname: true
                                            }));
                                        }}
                                        style={{ cursor: editable ? "pointer" : "default" }}
                                    >
                                        {form.nickname}
                                    </div>
                                )}
                            </div>

                            {/* EMAIL */}
                            <div className="pc-cell">
                                <div className="pc-label-small">Email</div>
                                <div>{form.email}</div>
                            </div>

                            {/* PASSWORD */}
                            <div className="pc-cell">
                                <div className="pc-label-small pc-label-row">
                                    Password
                                    {editable && <BiSolidPencil className="pc-icon" />}
                                </div>

                                <div className="pc-inline">
                                    <div>
                                        {showPassword ? form.password : "********"}
                                    </div>

                                </div>
                            </div>

                            {/* PAÍS */}
                            <div className="pc-cell">
                                <div className="pc-label-small">País</div>

                                {editable ? (
                                    <select
                                        value={form.country || ""}
                                        onChange={(e) => handleChange("country", e.target.value)}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div>{form.country || "-"}</div>
                                )}
                            </div>

                        </div>

                        {/* COLUMNA DERECHA */}
                        <div className="pc-col">

                            <div className="pc-cell pc-empty"></div>
                            <div className="pc-cell pc-empty"></div>

                            {/* FECHA */}
                            <div className="pc-cell">
                                <div className="pc-label-small">
                                    Fecha de registro
                                </div>
                                <div>
                                    {form.created_at
                                        ? new Date(form.created_at).toLocaleDateString()
                                        : "-"}
                                </div>
                            </div>

                            {/* PROVINCIA */}
                            {form.country === "España" ? (
                                <div className="pc-cell">
                                    <div className="pc-label-small">Provincia</div>

                                    {editable ? (
                                        <select
                                            value={form.province || ""}
                                            onChange={(e) => handleChange("province", e.target.value)}
                                        >
                                            {provincesES.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div>{form.province || "-"}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="pc-cell pc-empty"></div>
                            )}

                        </div>

                    </div>

                    <div className="pc-divider" />

                    {/* RRSS */}
                    <div className="pc-right-bottom">

                        <div className="pc-rrss-grid">

                            {/* YOUTUBE */}
                            <div className="pc-rrss-item">
                                <FaYoutube className="pc-rrss-icon youtube" />

                                {editable ? (
                                    <>
                                        <input
                                            value={form.youtube_url || ""}
                                            onChange={(e) => handleChange("youtube_url", e.target.value)}
                                            placeholder="YouTube URL"
                                        />
                                        {errors.youtube_url && (
                                            <div className="pc-error">{errors.youtube_url}</div>
                                        )}
                                    </>
                                ) : (
                                    form.youtube_url ? (
                                        <a
                                            href={form.youtube_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {formatSocialUrl(form.youtube_url)}
                                        </a>
                                    ) : (
                                        "-"
                                    )
                                )}
                            </div>

                            {/* X */}
                            <div className="pc-rrss-item">
                                <FaXTwitter className="pc-rrss-icon x" />

                                {editable ? (
                                    <>
                                        <input
                                            value={form.x_url || ""}
                                            onChange={(e) => handleChange("x_url", e.target.value)}
                                            placeholder="X URL"
                                        />
                                        {errors.x_url && (
                                            <div className="pc-error">{errors.x_url}</div>
                                        )}
                                    </>
                                ) : (
                                    form.x_url ? (
                                        <a
                                            href={form.x_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {formatSocialUrl(form.x_url)}
                                        </a>
                                    ) : (
                                        "-"
                                    )
                                )}
                            </div>

                            {/* FACEBOOK */}
                            <div className="pc-rrss-item">
                                <FaFacebook className="pc-rrss-icon facebook" />

                                {editable ? (
                                    <>
                                        <input
                                            value={form.facebook_url || ""}
                                            onChange={(e) => handleChange("facebook_url", e.target.value)}
                                            placeholder="Facebook URL"
                                        />
                                        {errors.facebook_url && (
                                            <div className="pc-error">{errors.facebook_url}</div>
                                        )}
                                    </>
                                ) : (
                                    form.facebook_url ? (
                                        <a
                                            href={form.facebook_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {formatSocialUrl(form.facebook_url)}
                                        </a>
                                    ) : (
                                        "-"
                                    )
                                )}
                            </div>

                            {/* INSTAGRAM */}
                            <div className="pc-rrss-item">
                                <FaInstagram className="pc-rrss-icon instagram" />

                                {editable ? (
                                    <>
                                        <input
                                            value={form.instagram_url || ""}
                                            onChange={(e) => handleChange("instagram_url", e.target.value)}
                                            placeholder="Instagram URL"
                                        />
                                        {errors.instagram_url && (
                                            <div className="pc-error">{errors.instagram_url}</div>
                                        )}
                                    </>
                                ) : (
                                    form.instagram_url ? (
                                        <a
                                            href={form.instagram_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {formatSocialUrl(form.instagram_url)}
                                        </a>
                                    ) : (
                                        "-"
                                    )
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            {showEditor && tempImage && (
                <AvatarEditor
                    image={tempImage}
                    onCancel={() => {
                        setTempImage(null);
                        setShowEditor(false);
                    }}
                    onSave={(img) => {
                        setForm(prev => ({
                            ...prev,
                            profile_image: img
                        }));

                        setTempImage(null);
                        setShowEditor(false);
                    }}
                />
            )}

            {/* BOTONES */}
            <div className="pc-actions">
                {editable ? (
                    <>
                        <button
                            className="pc-btn"
                            onClick={() => onSave?.(form)}
                        >
                            Guardar
                        </button>

                        <button
                            className="pc-btn pc-btn-cancel"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                    </>
                ) : (
                    <button
                        className="pc-btn"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProfileCard;
