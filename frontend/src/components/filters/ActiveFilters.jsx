import { useFiltersStore } from "../../store/filtersStore";
import "./ActiveFilters.css";

export default function ActiveFilters() {
  const filters = useFiltersStore((s) => s.filters);
  const setFilter = useFiltersStore((s) => s.setFilter);

  const entries = Object.entries(filters).filter(
    ([_, value]) => value
  );

  if (!entries.length) return null;

  return (
    <div className="active-filters">
      {entries.map(([key, value]) => (
        <div key={key} className="filter-chip">
          <span>{value}</span>

          <button
            className="chip-remove"
            onClick={() =>
              setFilter(key, null)
            }
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}