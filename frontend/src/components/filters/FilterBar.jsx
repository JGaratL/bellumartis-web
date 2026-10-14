import "./FilterBar.css";
import FilterGroup from "./FilterGroup";

import { MdOutlineTypeSpecimen } from "react-icons/md";
import { LuLayoutGrid, LuSwords } from "react-icons/lu";
import { GrHistory } from "react-icons/gr";
import { SlGraduation } from "react-icons/sl";

export default function FilterBar() {
  return (
    <div className="filter-bar">
      <FilterGroup
        label="TEMA"
        filterKey="theme"
        icon={MdOutlineTypeSpecimen}
      />

      <FilterGroup
        label="TIPO"
        filterKey="type"
        icon={LuLayoutGrid}
      />

      {/* 👇 ahora será jerárquico */}
      <FilterGroup
        label="PERIODO"
        filterKey="period"
        icon={GrHistory}
      />

      {/* lo dejamos visible aunque aún no tenga lógica */}
      <FilterGroup
        label="CONFLICTO"
        filterKey="conflict"
        icon={LuSwords}
      />

      <FilterGroup
        label="INVITADO"
        filterKey="guest"
        icon={SlGraduation}
      />
    </div>
  );
}
