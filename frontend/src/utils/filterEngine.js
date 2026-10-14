function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVideoGuests(video) {
  if (Array.isArray(video?.guests)) {
    return video.guests;
  }

  if (typeof video?.guests === "string") {
    return video.guests.split("|");
  }

  if (Array.isArray(video?.guest)) {
    return video.guest;
  }

  if (typeof video?.guest === "string") {
    return [video.guest];
  }

  return [];
}

export function filterVideos(videos, filters, search) {
  return videos.filter((video) => {
    if (
      search &&
      !normalize(video.title).includes(normalize(search))
    ) {
      return false;
    }

    for (const key in filters) {
      const filterValue = filters[key];

      if (
        filterValue == null ||
        (Array.isArray(filterValue) && filterValue.length === 0)
      ) {
        continue;
      }

      if (key === "guest") {
        const selectedGuest = normalize(filterValue);
        const videoGuests = getVideoGuests(video).map(normalize);

        if (!videoGuests.includes(selectedGuest)) {
          return false;
        }

        continue;
      }

      if (Array.isArray(filterValue)) {
        const videoValue = video[key];

        if (Array.isArray(videoValue)) {
          const normalizedVideoValues = videoValue.map(normalize);

          if (
            !filterValue.some((value) =>
              normalizedVideoValues.includes(normalize(value))
            )
          ) {
            return false;
          }

          continue;
        }

        if (!filterValue.map(normalize).includes(normalize(videoValue))) {
          return false;
        }

        continue;
      }

      if (normalize(video[key]) !== normalize(filterValue)) {
        return false;
      }
    }

    return true;
  });
}
