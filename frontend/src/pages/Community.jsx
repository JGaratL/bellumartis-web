import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CreatePost from "../components/community/CreatePost";
import PostCard from "../components/community/PostCard";
import "./Community.css";

const Community = () => {
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const targetPostId = Number(params.get("post")) || null;
  const targetReplyId = Number(params.get("reply")) || null;

  const fetchPosts = async () => {

    try {

      const res = await fetch(
        "http://localhost:5000/api/posts"
      );

      if (!res.ok) {
        throw new Error("Error al cargar posts");
      }

      const data = await res.json();

      console.log("POSTS API:", data); // 👈 aquí


      setPosts(
        Array.isArray(data) ? data : []
      );

    } catch (err) {

      console.error(
        "Error cargando posts:",
        err
      );

      setPosts([]);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    fetchPosts();

  }, []);

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

      <CreatePost
        onPostCreated={fetchPosts}
      />

      {posts.length === 0 ? (

        <div>
          No hay posts todavía
        </div>

      ) : (

        posts.map((post) =>

          post ? (
            <PostCard
              key={post.id}
              post={post}
              targetReplyId={targetPostId === post.id ? targetReplyId : null}
            />
          ) : null
        )

      )}

    </div>
  );
};

export default Community;
