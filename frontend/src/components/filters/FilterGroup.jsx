import { useState, useRef, useEffect } from "react";
import { useFiltersStore } from "../../store/filtersStore";
import "./FilterGroup.css";

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export default function FilterGroup({ label, filterKey, icon: Icon }) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [guests, setGuests] = useState([]);
    const [contentTaxonomy, setContentTaxonomy] = useState({ periods: [], conflicts: [] });
    const [search, setSearch] = useState("");

    const ref = useRef();

    const setFilter = useFiltersStore((s) => s.setFilter);
    const filters = useFiltersStore((s) => s.filters);

    const theme = filters?.theme;
    const currentValue = filters?.[filterKey] ?? null;
    const isPeriod = filterKey === "period";
    const isDisabled = isPeriod && theme === "actualidad_militar";

    const optionsMap = {
        theme: [
            { value: "historia_militar", label: "Historia Militar" },
            { value: "actualidad_militar", label: "Actualidad Militar" },
        ],
        type: [
            { value: "video", label: "Vídeo" },
            { value: "podcast", label: "Podcast" },
            { value: "articulo", label: "Artículo" },
        ],
    };

    const fallbackPeriodTree = {
        Prehistoria: ["Prehistoria"],
        "Historia Antigua": ["Mesopotamia", "Persia", "Grecia", "Roma"],
        "Edad Media": [
            "Reino de Asturias",
            "Reconquista",
            "Cruzadas",
            "Bizancio",
            "Siglo XV",
        ],
        "Edad Moderna": [
            "Siglo XVI",
            "Siglo XVII",
            "Siglo XVIII",
            "Flandes",
            "Conquista de América",
        ],
        "Historia Contemporánea": [
            "Siglo XIX",
            "Guerras Napoleónicas",
            "Primera Guerra Mundial",
            "Segunda Guerra Mundial",
            "Guerra Fría",
            "Siglo XXI",
        ],
    };

    useEffect(() => {
        if (filterKey === "period" || filterKey === "conflict") {
            fetch("http://localhost:5000/api/content/filters")
                .then((response) => {
                    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
                    return response.json();
                })
                .then((data) => setContentTaxonomy({
                    periods: Array.isArray(data.periods) ? data.periods : [],
                    conflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
                }))
                .catch((err) => console.error("Error cargando filtros de contenido:", err));
            return;
        }

        if (filterKey !== "guest") return;

        async function loadGuests() {
            try {
                const response = await fetch(
                    "http://localhost:5000/api/content/guests"
                );

                const data = await response.json();
                setGuests(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error cargando invitados:", err);
            }
        }

        loadGuests();
    }, [filterKey]);

    useEffect(() => {
        if (filterKey === "guest" && open) {
            setSearch("");
        }
    }, [open, filterKey]);

    const safeGuests = Array.isArray(guests) ? guests : [];
    const filteredGuests =
        filterKey === "guest"
            ? safeGuests.filter((g) =>
                  normalizeText(g?.name).includes(normalizeText(search))
              )
            : [];

    const sortedGuests =
        filterKey === "guest"
            ? [...filteredGuests].sort((a, b) =>
                  normalizeText(a?.name).localeCompare(
                      normalizeText(b?.name),
                      "es"
                  )
              )
            : [];

    const options = filterKey === "guest"
        ? sortedGuests || []
        : filterKey === "conflict"
            ? contentTaxonomy.conflicts
            : optionsMap[filterKey] || [];
    const periodTree = contentTaxonomy.periods.length
        ? Object.fromEntries(contentTaxonomy.periods.map((period) => [period.name, period.subperiods || []]))
        : fallbackPeriodTree;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setExpanded(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isPeriod && theme === "actualidad_militar") {
            setFilter("period", []);
            setOpen(false);
        }
    }, [theme, isPeriod, setFilter]);

    const toggleSubperiod = (value) => {
        const prev = Array.isArray(currentValue) ? currentValue : [];

        if (prev.includes(value)) {
            setFilter(
                "period",
                prev.filter((v) => v !== value)
            );
        } else {
            setFilter("period", [...prev, value]);
        }
    };

    const togglePeriod = (value) => {
        const prev = Array.isArray(currentValue) ? currentValue : [];
        setFilter("period", prev.includes(value)
            ? prev.filter((item) => item !== value)
            : [...prev, value]);
    };

    const isSelected = (value) =>
        Array.isArray(currentValue) && currentValue.includes(value);

    return (
        <div className="filter-group" ref={ref}>
            <div className="filter-title">
                {Icon && <Icon className="filter-title-icon" />}
                <span>{label}</span>
            </div>

            <button
                type="button"
                disabled={isDisabled}
                className={`filter-group-btn
                    ${(Array.isArray(currentValue) ? currentValue.length > 0 : Boolean(currentValue)) ? "active" : ""}
                    ${isDisabled ? "disabled" : ""}
                `}
                onClick={() => {
                    if (isDisabled) return;
                    setOpen(!open);
                }}
            >
            <span className="filter-placeholder">
                {filterKey === "theme" || filterKey === "type"
                    ? optionsMap[filterKey].find(o => o.value === currentValue)?.label || "Seleccionar"
                    : Array.isArray(currentValue)
                        ? currentValue.join(", ") || "Seleccionar"
                        : currentValue || "Seleccionar"}
            </span>

                <span className={`filter-arrow ${open ? "open" : ""}`}>▼</span>
            </button>

            {open && (
                <div className="filter-group-menu">
                    {filterKey === "guest" && (
                        <div className="filter-group-header">
                            <input
                                className="filter-search"
                                placeholder="  Buscar invitado..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    <div className="filter-group-scroll">
                        {isPeriod ? (
                            Object.entries(periodTree).map(([periodo, subitems]) => (
                                <div key={periodo}>
                                    <div
                                        className="period-row"
                                        onClick={() =>
                                            setExpanded(
                                                expanded === periodo ? null : periodo
                                            )
                                        }
                                    >
                                        <span
                                            className={`caret ${
                                                expanded === periodo ? "open" : ""
                                            }`}
                                        >
                                            ▶
                                        </span>

                                        <span>{periodo}</span>
                                    </div>

                                    {expanded === periodo && (
                                        <div className="subperiods">
                                            <label className="subperiod-item">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected(periodo)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={() => togglePeriod(periodo)}
                                                />
                                                <span>Todo {periodo}</span>
                                            </label>
                                            {subitems.map((sub) => (
                                                <label
                                                    key={sub}
                                                    className="subperiod-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected(sub)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        onChange={() =>
                                                            toggleSubperiod(sub)
                                                        }
                                                    />

                                                    <span>{sub}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            options.map((opt) => {
                                const value =
                                    filterKey === "guest"
                                        ? opt?.name || `guest-${opt?.id}`
                                        : filterKey === "theme" || filterKey === "type"
                                            ? opt.value
                                            : opt;

                                const text =
                                    filterKey === "theme" || filterKey === "type"
                                        ? opt.label
                                        : value;

                                return (
                                    <div
                                        key={filterKey === "guest"
                                            ? opt.id
                                            : filterKey === "theme" || filterKey === "type"
                                                ? opt.value
                                                : opt}
                                        className="filter-group-item"
                                        onClick={() => {
                                            setFilter(filterKey, value);
                                            setOpen(false);
                                        }}
                                    >
                                        {filterKey === "guest"
                                            ? `${opt.name}${
                                                  Number.isFinite(Number(opt.videoCount))
                                                      ? ` (${Number(opt.videoCount)})`
                                                      : ""
                                              }`
                                            : text}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div
                        className="filter-group-item clear"
                        onClick={() => {
                            setFilter(filterKey, isPeriod ? [] : null);
                            setOpen(false);
                            setExpanded(null);
                        }}
                    >
                        Limpiar
                    </div>
                </div>
            )}
        </div>
    );
}
