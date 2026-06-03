import { FaSearch } from "react-icons/fa";
import { useFiltersStore } from "../../store/filtersStore";
import "./SearchBar.css";

export default function SearchBar() {
  const search = useFiltersStore((s) => s.search);
  const setSearch = useFiltersStore((s) => s.setSearch);

  return (
    <div className="search-section">
      <div className="search-title">
        <FaSearch />
        <span>Buscar</span>
      </div>

      <div className="search-bar">
        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Buscar por palabras clave..."
        />

        {search.trim() && (
          <button
            type="button"
            className="search-clear"
            onClick={() => setSearch("")}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}