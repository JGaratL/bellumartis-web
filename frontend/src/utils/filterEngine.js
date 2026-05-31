export function filterVideos(videos, filters, search) {
  return videos.filter((video) => {
    // búsqueda
    if (
      search &&
      !video.title.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    // filtros dinámicos
    for (const key in filters) {
      if (!filters[key]) continue;

      if (video[key] !== filters[key]) return false;
    }

    return true;
  });
}