import { apiFetch } from "../api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CreatePost from "../components/community/CreatePost";
import PostCard from "../components/community/PostCard";
import "./Community.css";
import ProfileCard from "../components/ProfileCard";

const POSTS_PAGE_SIZE = 50;

const Community = () => {
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  console.log("showProfile:", showProfile);
  console.log("selectedUser:", selectedUser);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const targetPostId = Number(params.get("post")) || null;
  const targetReplyId = Number(params.get("reply")) || null;

  const fetchPosts = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setLoadError("");
      const query = new URLSearchParams({ limit: String(POSTS_PAGE_SIZE), offset: "0" });
      const res = await apiFetch(`http://localhost:5000/api/posts?${query}`);
      if (!res.ok) throw new Error("Error al cargar posts");
      const data = await res.json();
      let nextPosts = Array.isArray(data?.posts) ? data.posts : [];

      if (targetPostId && !nextPosts.some((post) => Number(post.id) === targetPostId)) {
        try {
          const targetResponse = await apiFetch(`http://localhost:5000/api/posts/${targetPostId}`);
          if (targetResponse.ok) {
            const targetPost = await targetResponse.json();
            nextPosts = [...nextPosts, targetPost].sort((a, b) => Number(b.id) - Number(a.id));
          }
        } catch (targetError) {
          console.error("Error cargando el post enlazado:", targetError);
        }
      }

      setPosts(nextPosts);
      setHasMore(Boolean(data?.hasMore));
      setNextOffset(Number(data?.limit) || POSTS_PAGE_SIZE);
    } catch (err) {
      console.error("Error cargando posts:", err);
      setLoadError("No se pudieron cargar los posts. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [targetPostId]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      setLoadError("");
      const query = new URLSearchParams({ limit: String(POSTS_PAGE_SIZE), offset: String(nextOffset) });
      const res = await apiFetch(`http://localhost:5000/api/posts?${query}`);
      if (!res.ok) throw new Error("Error al cargar más posts");
      const data = await res.json();
      const nextPosts = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((current) => [...current, ...nextPosts]);
      setHasMore(Boolean(data?.hasMore));
      setNextOffset(nextOffset + (Number(data?.limit) || POSTS_PAGE_SIZE));
    } catch (err) {
      console.error("Error cargando más posts:", err);
      setLoadError("No se pudieron cargar más posts. Inténtalo de nuevo.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAvatarClick = async (userId) => {
    try {

      const res = await apiFetch(`http://localhost:5000/api/users/${userId}`, {
        headers: {

        }
      });

      if (!res.ok) throw new Error("Error cargando usuario");

      const data = await res.json();

      setSelectedUser(data);
      setShowProfile(true);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {

    fetchPosts({ showLoading: true });
  }, [fetchPosts]);

  useEffect(() => {
    if (!posts.length || !targetPostId) return;

    const timer = setTimeout(() => {
      const postEl = document.getElementById(`post-${targetPostId}`);
      if (!postEl) return;
      postEl.scrollIntoView({ behavior: "smooth", block: "center" });

      if (targetReplyId) {
        const replyEl = document.getElementById(`reply-${targetReplyId}`);
        if (replyEl) {
          replyEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [posts, targetPostId, targetReplyId]);

  if (loading) {

    return (
      <div className="community">
        Cargando posts...
      </div>
    );
  }

  return (
    <div className="community">

      <CreatePost onPostCreated={() => fetchPosts()} />

      {loadError && <p className="community-load-error" role="alert">{loadError}</p>}

      {posts.length === 0 && !loadError ? (
        <div>No hay posts todavía</div>
      ) : (
        posts.map((post) =>
          post ? (
            <PostCard
              key={post.id}
              post={post}
              targetReplyId={targetPostId === post.id ? targetReplyId : null}
              onAvatarClick={handleAvatarClick}
              onDelete={(deletedId) => setPosts((current) => current.filter((item) => item.id !== deletedId))}
            />
          ) : null
        )
      )}

      {hasMore && (
        <div className="community-pagination">
          <button type="button" onClick={loadMorePosts} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar más posts"}
          </button>
        </div>
      )}

      {console.log("RENDER PROFILE CHECK", showProfile, selectedUser)}

      {showProfile && selectedUser && (
        <div
          className="pc-modal-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProfileCard
              user={selectedUser}
              onClose={() => setShowProfile(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Community;
