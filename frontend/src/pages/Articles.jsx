import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SearchBar from "../components/search/SearchBar";
import FilterBar from "../components/filters/FilterBar";
import ActiveFilters from "../components/filters/ActiveFilters";
import VideoGrid from "../components/content/VideoGrid";

import { LuClapperboard } from "react-icons/lu";
import { RiResetRightLine } from "react-icons/ri";

import { useFiltersStore } from "../store/filtersStore";

import "./Articles.css";

function Articles() {
  const location = useLocation();
  const resetFilters = useFiltersStore((s) => s.resetFilters);
  const setSearch = useFiltersStore((s) => s.setSearch);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("search")) setSearch(params.get("search") || "");
  }, [location.search, setSearch]);

  return (
    <div className="page-container articles-page">
      <h1 className="page-title">
        <LuClapperboard className="title-icon" />
        Vídeos y Artículos
      </h1>

      <section className="toolbar-panel">
        <SearchBar />

        {/* HEADER FILTROS */}
        <div className="filters-header">
          <span className="filters-title">
            
          </span>

          <button
            className="clear-filters-btn"
            onClick={resetFilters}
          >
            <RiResetRightLine />
            Limpiar filtros
          </button>
        </div>

        <FilterBar />
      </section>

      <ActiveFilters />

      <VideoGrid />
    </div>
  );
}

export default Articles;
