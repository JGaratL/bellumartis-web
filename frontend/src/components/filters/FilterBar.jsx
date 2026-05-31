import "./FilterBar.css";
import FilterGroup from "./FilterGroup";

export default function FilterBar() {
  return (
    <div className="filter-bar">
      <FilterGroup label="TEMA" filterKey="theme" />
      <FilterGroup label="TIPO" filterKey="type" />
      <FilterGroup label="PERIODO" filterKey="period" />
      <FilterGroup label="CONFLICTO" filterKey="conflict" />
      <FilterGroup label="REGIÓN" filterKey="region" />
      <FilterGroup label="PAÍS" filterKey="country" />
      <FilterGroup label="INVITADO" filterKey="guest" />
    </div>
  );
}