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

      if (key === "period") {
        const selectedPeriods = (Array.isArray(filterValue) ? filterValue : [filterValue]).map(normalize);
        const videoPeriods = [
          ...(Array.isArray(video.periods) ? video.periods : []),
          ...(Array.isArray(video.period) ? video.period : [video.period]),
          ...(Array.isArray(video.subperiods) ? video.subperiods : []),
          ...(Array.isArray(video.subperiod) ? video.subperiod : [video.subperiod]),
        ].map(normalize);

        if (!selectedPeriods.some((period) => videoPeriods.includes(period))) {
          return false;
        }

        continue;
      }

      if (key === "theme") {
        const selectedTheme = normalize(filterValue);
        const videoThemes = [
          ...(Array.isArray(video.themes) ? video.themes : []),
          ...(Array.isArray(video.theme) ? video.theme : [video.theme]),
        ].map(normalize);

        if (!videoThemes.includes(selectedTheme)) {
          return false;
        }

        continue;
      }

      if (key === "conflict") {
        const selectedConflict = normalize(filterValue);
        const videoConflicts = [
          ...(Array.isArray(video.conflicts) ? video.conflicts : []),
          ...(Array.isArray(video.conflict) ? video.conflict : [video.conflict]),
        ].map(normalize);

        if (!videoConflicts.includes(selectedConflict)) {
          return false;
        }

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
