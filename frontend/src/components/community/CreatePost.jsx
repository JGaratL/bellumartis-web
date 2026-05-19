import { useEffect, useRef, useState } from "react";
import { FaImage, FaSmile, FaTimes } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";

const EMOJIS = [
    "😀", "😂", "🤣", "😍", "🔥", "👍", "🙏", "💀", "😎", "😢",
    "😡", "😱", "🥳", "🤔", "💔", "❤️", "👏", "🎉", "😴", "😏"
];

function CreatePost({ onPostCreated }) {

    const { user, token } = useAuth();

    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const emojiRef = useRef(null);

    /*
    ============================
    AUTO RESIZE TEXTAREA
    ============================
    */
    const handleInput = (e) => {
        setContent(e.target.value);

        const el = textareaRef.current;
        if (!el) return;

        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
    };

    /*
    ============================
    MULTIPLE IMAGES HANDLER
    ============================
    */
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        if (!files.length) return;

        setImages(files);

        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(previews);
    };

    /*
    ============================
    REMOVE IMAGE
    ============================
    */
    const removeImage = (indexToRemove) => {

        URL.revokeObjectURL(imagePreviews[indexToRemove]);

        const updatedImages =
            images.filter((_, index) => index !== indexToRemove);

        const updatedPreviews =
            imagePreviews.filter((_, index) => index !== indexToRemove);

        setImages(updatedImages);
        setImagePreviews(updatedPreviews);

        if (updatedImages.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    /*
    ============================
    INSERT EMOJI
    ============================
    */
    const insertEmoji = (emoji) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newText =
            content.substring(0, start) +
            emoji +
            content.substring(end);

        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        }, 0);
    };

    /*
    ============================
    CLOSE EMOJI OUTSIDE CLICK
    ============================
    */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) {
                setShowEmoji(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /*
    ============================
    SUBMIT POST
    ============================
    */
    const handleSubmit = async () => {
        if (!content.trim() && images.length === 0) return;
        if (!token) return;

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("content", content);

            images.forEach((img) => {
                formData.append("images", img, img.name);
            });

            const res = await fetch(
                "http://localhost:5000/api/posts/create",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            const raw = await res.text();
            let data = {};

            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = {
                    error: raw || "Respuesta invalida del servidor"
                };
            }

            if (!res.ok) {
                throw new Error(data.error || "Error subiendo el post");
            }

            setContent("");
            setImages([]);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImagePreviews([]);

            if (textareaRef.current) {
                textareaRef.current.style.height = "40px";
            }

            if (onPostCreated) onPostCreated();

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /*
    ============================
    KEYBOARD CONTROL
    ============================
    */
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="create-post">

            <div className="create-post-top">

                <img
                    src="/default-avatar.jpg"
                    alt=""
                    className="profile-image"
                />

                <textarea
                    ref={textareaRef}
                    placeholder={`¿Qué está pasando, ${user?.nickname || "usuario"}?`}
                    value={content}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    style={{
                        resize: "none",
                        overflow: "hidden",
                        minHeight: "40px",
                        maxHeight: "200px"
                    }}
                />
            </div>

            {/* PREVIEWS */}
            {imagePreviews.length > 0 && (
                <div className="create-post-preview-container">

                    {imagePreviews.map((preview, index) => (
                        <div className="create-post-preview-item" key={index}>
                            <img src={preview} alt={`preview-${index}`} />

                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                    ))}

                </div>
            )}

            <div className="create-post-bottom">

                <button
                    className="create-post-submit"
                    onClick={handleSubmit}
                    disabled={!user}
                    style={{
                        opacity: user ? 1 : 0.5,
                        cursor: user ? "pointer" : "not-allowed"
                    }}
                >
                    {loading ? "Publicando..." : "Publicar"}
                </button>

                <div className="create-post-icons" ref={emojiRef}>

                    <button
                        type="button"
                        onClick={() => setShowEmoji(!showEmoji)}
                    >
                        <FaSmile />
                    </button>

                    {showEmoji && (
                        <div className="emoji-picker">
                            {EMOJIS.map((emoji, i) => (
                                <span
                                    key={i}
                                    onClick={() => insertEmoji(emoji)}
                                >
                                    {emoji}
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                    >
                        <FaImage />
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                    />

                </div>

            </div>

        </div>
    );
}

export default CreatePost;
