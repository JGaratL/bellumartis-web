import { useFiltersStore } from "../../store/filtersStore";

export default function ActiveFilters() {
  const filters = useFiltersStore((s) => s.filters);
  const removeFilter = useFiltersStore((s) => s.removeFilter);

  return (
    <div className="active-filters">
      {Object.entries(filters).map(([key, value]) => {
        if (!value) return null;

        return (
          <span key={key} className="chip">
            {value}
            <button onClick={() => removeFilter(key)}>✕</button>
          </span>
        );
      })}
    </div>
  );
}