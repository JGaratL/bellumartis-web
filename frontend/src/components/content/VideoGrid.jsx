import { useEffect, useState } from "react";
import { useFiltersStore } from "../../store/filtersStore";
import { filterVideos } from "../../utils/filterEngine";
import VideoCard from "./VideoCard";
import "./VideoGrid.css";
import VideoModal from "./VideoModal";

export default function VideoGrid() {
    const [videos, setVideos] = useState([]);

    const filters = useFiltersStore((s) => s.filters);
    const search = useFiltersStore((s) => s.search);

    const [selectedVideo, setSelectedVideo] =
        useState(null);

    useEffect(() => {
        async function fetchVideos() {
            try {
                const response = await fetch(
                    "http://localhost:5000/api/content"
                );

                const data = await response.json();

                setVideos(data);
            } catch (error) {
                console.error("Error cargando videos:", error);
            }
        }

        fetchVideos();
    }, []);

    const filtered = filterVideos(
        videos,
        filters,
        search
    );

    return (
        <>
            <div className="video-grid">
                {filtered.map((video) => (
                    <div
                        key={video.id}
                        onClick={() =>
                            setSelectedVideo(video)
                        }
                    >
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>

            <VideoModal
                video={selectedVideo}
                onClose={() =>
                    setSelectedVideo(null)
                }
            />
        </>
    );
}