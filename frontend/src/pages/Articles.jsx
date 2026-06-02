import SearchBar from "../components/search/SearchBar";
import FilterBar from "../components/filters/FilterBar";
import ActiveFilters from "../components/filters/ActiveFilters";
import VideoGrid from "../components/content/VideoGrid";
import { LuClapperboard } from "react-icons/lu";
import "./Articles.css";

function Articles() {
  return (
    <div className="page-container">
      <h1 className="page-title">
        <LuClapperboard className="title-icon" />
        Vídeos y Artículos
      </h1>
      <section className="articles-toolbar">
        <div className="search-row">
          <SearchBar />
        </div>

        <div className="filters-row">
          <FilterBar />
        </div>
      </section>

      <ActiveFilters />

      <VideoGrid />
    </div>
  );
}

export default Articles;