import { useFiltersStore } from "../../store/filtersStore";
import "./ActiveFilters.css";

export default function ActiveFilters() {
  const filters = useFiltersStore((s) => s.filters);
  const setFilter = useFiltersStore((s) => s.setFilter);

  const entries = Object.entries(filters).filter(
    ([_, value]) => value && (Array.isArray(value) ? value.length : true)
  );

  if (!entries.length) return null;

  const removeFilter = (key, value) => {
    // 🔥 CASO PERIOD (ARRAY)
    if (Array.isArray(value)) {
      setFilter(key, []);
      return;
    }

    // 🔥 CASO NORMAL
    setFilter(key, null);
  };

  return (
    <div className="active-filters">
      {entries.map(([key, value]) => (
        <div key={key} className="filter-chip">

          {/* LABEL */}
          <span className="chip-label">
            {Array.isArray(value)
              ? value.join(", ")
              : value}
          </span>

          {/* REMOVE */}
          <button
            className="chip-remove"
            onClick={() => removeFilter(key, value)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}