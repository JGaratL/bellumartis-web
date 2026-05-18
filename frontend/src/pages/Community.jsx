import { useEffect, useState } from "react";
import CreatePost from "../components/community/CreatePost";
import PostCard from "../components/community/PostCard";
import "./Community.css";

const Community = () => {

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
            />
          ) : null
        )

      )}

    </div>
  );
};

export default Community;