import { useState, useRef, useEffect } from "react";
import { useFiltersStore } from "../../store/filtersStore";
import "./FilterGroup.css";

export default function FilterGroup({
    label,
    filterKey,
    icon: Icon
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    const setFilter = useFiltersStore((s) => s.setFilter);
    const filters = useFiltersStore((s) => s.filters);

    const currentValue = filters[filterKey];

    const optionsMap = {
        theme: ["historia_militar", "actualidad_militar"],
        type: ["video", "podcast", "articulo", "webinar"],
        period: ["WW1", "WW2", "Guerra Fría", "Vietnam"],
        conflict: ["Frente Oriental", "Pacífico", "África", "Normandía"],
        region: ["Europa", "Oriente Medio", "Asia", "América"],
        country: ["España", "EEUU", "Rusia", "China"],
        guest: ["Soto Chica", "Rafael Mey"]
    };

    const options = optionsMap[filterKey] || [];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                ref.current &&
                !ref.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, []);

    return (
        <div className="filter-group" ref={ref}>
            <button
                className="filter-group-btn"
                onClick={() => setOpen(!open)}
            >
                <div className="filter-group-label">
                    {Icon && (
                        <Icon className="filter-group-icon" />
                    )}

                    <span>{label}</span>
                </div>

                <span
                    style={{ fontSize: "10px" }}
                >
                    ▼
                </span>
            </button>

            {open && (
                <div className="filter-group-menu">
                    {options.map((opt) => (
                        <div
                            key={opt}
                            className="filter-group-item"
                            onClick={() => {
                                setFilter(
                                    filterKey,
                                    opt
                                );
                                setOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}

                    <div
                        className="filter-group-item clear"
                        onClick={() => {
                            setFilter(
                                filterKey,
                                null
                            );
                            setOpen(false);
                        }}
                    >
                        Limpiar
                    </div>
                </div>
            )}
        </div>
    );
}