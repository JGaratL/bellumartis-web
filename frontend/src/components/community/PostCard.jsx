import { useState, useRef, useEffect } from "react";
import { SlSpeech } from "react-icons/sl";
import { BiLike } from "react-icons/bi";
import { FaSmile } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";
import { useAuth } from "../../hooks/useAuth";

const EMOJIS = [
  "😀", "😂", "🤣", "😍", "🔥", "👍", "🙏", "💀", "😎", "😢",
  "😡", "😱", "🥳", "🤔", "💔", "❤️", "👏", "🎉", "😴", "😏"
];

const PostCard = ({ post = {}, onDelete }) => {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(false);

  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [loadingReplies, setLoadingReplies] = useState(false);

  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const menuRef = useRef(null);
  const replyInputRef = useRef(null);
  const replyEmojiRef = useRef(null);
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) {
      alert("Debes iniciar sesión para dar like");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      if (data.liked) {
        setLikes((prev) => prev + 1);
        setLiked(true);
      } else {
        setLikes((prev) => Math.max(0, prev - 1));
        setLiked(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const confirmDeletePost = async () => {
    try {
      setDeleting(true);

      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando");

      setShowDeleteModal(false);

      if (onDelete) {
        onDelete(post.id);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const insertReplyEmoji = (emoji) => {
    const input = replyInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newText = replyText.substring(0, start) + emoji + replyText.substring(end);

    setReplyText(newText);

    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + emoji.length;
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (replyEmojiRef.current && !replyEmojiRef.current.contains(e.target)) {
        setShowReplyEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutsideMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () => document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  const scrollToIndex = (index) => {
    const el = trackRef.current;
    if (!el) return;

    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: "smooth" });
    setActiveIndex(index);
  };

  const next = () => {
    if (!post.images?.length) return;
    if (activeIndex < post.images.length - 1) scrollToIndex(activeIndex + 1);
  };

  const prev = () => {
    if (!post.images?.length) return;
    if (activeIndex > 0) scrollToIndex(activeIndex - 1);
  };

  const fetchReplies = async () => {
    try {
      setLoadingReplies(true);
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/replies`);
      const data = await res.json();
      setReplies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies) fetchReplies();
    setShowReplies(!showReplies);
  };

  const sendReply = async () => {
    try {
      if (!user) {
        alert("Debes iniciar sesión para responder");
        return;
      }
      if (!replyText.trim()) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error enviando respuesta");

      setReplyText("");
      fetchReplies();
    } catch (err) {
      console.error(err);
    }
  };

  const deletePost = () => {
    setShowDeleteModal(true);
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <img src={post.avatar || "/default-avatar.png"} alt="avatar" />

        <div className="post-user-info">
          <div className="post-name">{post.nickname}</div>
          <div className="post-date">
            {post.created_at
              ? (() => {
                  const d = new Date(post.created_at);
                  return `${d.getDate()} ${d.toLocaleString("es-ES", { month: "long" })} ${d.getFullYear()}`;
                })()
              : ""}
          </div>
        </div>

        <div className="post-menu-wrapper" ref={menuRef}>
          <button className="post-menu-btn" onClick={() => setShowMenu(!showMenu)}>
            <BsThreeDots />
          </button>

          {showMenu && (
            <div className="post-menu-dropdown">
              <button onClick={deletePost} className="post-delete-btn">
                Eliminar post
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="post-content">{post.content}</div>

      {post.images?.length > 0 && (
        <div className="post-carousel">
          {post.images.length > 1 && (
            <>
              <button className="carousel-btn left" onClick={prev} disabled={activeIndex === 0}>
                ‹
              </button>
              <button className="carousel-btn right" onClick={next} disabled={activeIndex === post.images.length - 1}>
                ›
              </button>
            </>
          )}

          <div className="post-carousel-track" ref={trackRef}>
            {post.images.map((img, index) => (
              <img
                key={index}
                className="post-carousel-image"
                src={`http://localhost:5000/uploads/posts/${img}`}
                alt={`post-${index}`}
              />
            ))}
          </div>

          {post.images.length > 1 && (
            <div className="post-carousel-dots">
              {post.images.map((_, index) => (
                <span key={index} className={`dot ${activeIndex === index ? "active" : ""}`}>
                  ●
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="post-footer">
        <div
          className="post-action"
          onClick={toggleReplies}
          style={{
            cursor: user ? "pointer" : "not-allowed",
            opacity: user ? 1 : 0.4,
            pointerEvents: user ? "auto" : "none",
          }}
        >
          <SlSpeech />
          <span>{post.replies_count}</span>
        </div>

        <div
          className="post-action"
          onClick={handleLike}
          style={{ cursor: user ? "pointer" : "not-allowed", opacity: user ? 1 : 0.4 }}
        >
          <BiLike color={liked ? "#0f6970" : "black"} />
          <span>{likes}</span>
        </div>
      </div>

      {showReplies && (
        <div className="replies-section">
          <div className="replies-list">
            {loadingReplies ? (
              <p>Cargando...</p>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="reply-item">
                  <img src={reply.avatar || "/default-avatar.png"} alt="avatar" className="reply-avatar" />
                  <div className="reply-body">
                    <div className="reply-user">{reply.nickname}</div>
                    <div className="reply-content">{reply.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="reply-input-wrapper" ref={replyEmojiRef}>
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe una respuesta..."
              className="reply-input"
            />

            <div className="reply-emoji-wrap">
              <button type="button" onClick={() => setShowReplyEmoji(!showReplyEmoji)} className="reply-emoji-btn">
                <FaSmile />
              </button>

              {showReplyEmoji && (
                <div className="reply-emoji-picker">
                  {EMOJIS.map((emoji, i) => (
                    <span key={i} onClick={() => insertReplyEmoji(emoji)}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button onClick={sendReply} className="reply-send-btn">
              Enviar
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Eliminar post</h3>
            <p>¿Seguro que quieres eliminar este post?</p>
            <div className="delete-modal-buttons">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancelar
              </button>
              <button onClick={confirmDeletePost} className="delete-btn" disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
