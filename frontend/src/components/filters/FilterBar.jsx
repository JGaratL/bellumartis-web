import "./FilterBar.css";
import FilterGroup from "./FilterGroup";

import { MdOutlineTypeSpecimen } from "react-icons/md";
import { LuLayoutGrid, LuSwords } from "react-icons/lu";
import { GrHistory } from "react-icons/gr";
import { BsGlobeAmericas } from "react-icons/bs";
import { SlGraduation } from "react-icons/sl";
import { FiMapPin } from "react-icons/fi";

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

      <FilterGroup
        label="PERIODO"
        filterKey="period"
        icon={GrHistory}
      />

      <FilterGroup
        label="CONFLICTO"
        filterKey="conflict"
        icon={LuSwords}
      />

      <FilterGroup
        label="REGIÓN"
        filterKey="region"
        icon={BsGlobeAmericas}
      />

      <FilterGroup
        label="PAÍS"
        filterKey="country"
        icon={FiMapPin}
      />

      <FilterGroup
        label="INVITADO"
        filterKey="guest"
        icon={SlGraduation}
      />
    </div>
  );
}