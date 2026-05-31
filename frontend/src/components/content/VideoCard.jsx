export default function VideoCard({ video }) {
    return (
        <div className="video-card">
            <div className="video-thumb">
                <img
                    src={video.thumbnail_url} alt={video.title}
                />
            </div>

            <div className="video-info">
                <h3 className="video-title">{video.title}</h3>

                <div className="video-meta">
                    {video.theme && <span>{video.theme}</span>}
                    {video.period && <span>• {video.period}</span>}
                </div>
            </div>
        </div>
    );
}