import { useState, useRef, useEffect } from "react";
import { SlSpeech } from "react-icons/sl";
import { BiLike } from "react-icons/bi";

const PostCard = ({ post = {} }) => {

  const [likes, setLikes] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(false);

  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/posts/${post.id}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (data.liked) {
        setLikes((prev) => prev + 1);
        setLiked(true);
      } else {
        setLikes((prev) => prev - 1);
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

  // 🔥 NEXT / PREV
  const scrollToIndex = (index) => {
    const el = trackRef.current;
    if (!el) return;

    const width = el.clientWidth;
    el.scrollTo({
      left: width * index,
      behavior: "smooth"
    });

    setActiveIndex(index);
  };

  const next = () => {
    if (activeIndex < post.images.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const prev = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  return (
    <div className="post-card">

      {/* HEADER */}
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
      </div>

      {/* CONTENT */}
      <div className="post-content">
        {post.content}
      </div>

      {/* CAROUSEL */}
      {post.images?.length > 0 && (
        <div className="post-carousel">

          {/* NAV BUTTONS (desktop) */}
          {post.images.length > 1 && (
            <>
              <button
                className="carousel-btn left"
                onClick={prev}
                disabled={activeIndex === 0}
              >
                ‹
              </button>

              <button
                className="carousel-btn right"
                onClick={next}
                disabled={activeIndex === post.images.length - 1}
              >
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

          {/* DOTS */}
          {post.images.length > 1 && (
            <div className="post-carousel-dots">
              {post.images.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${activeIndex === index ? "active" : ""}`}
                >
                  ●
                </span>
              ))}
            </div>
          )}

        </div>
      )}

      {/* FOOTER */}
      <div className="post-footer">

        <div className="post-action">
          <SlSpeech />
          <span>{post.comments_count || 0}</span>
        </div>

        <div
          className="post-action"
          onClick={handleLike}
          style={{ cursor: "pointer" }}
        >
          <BiLike color={liked ? "#0f6970" : "black"} />
          <span>{likes}</span>
        </div>

      </div>

    </div>
  );
};

export default PostCard;