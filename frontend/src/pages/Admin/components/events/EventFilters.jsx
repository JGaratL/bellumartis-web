import { useEffect, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine, RiCalendarEventLine } from "react-icons/ri";
import { IoTicketOutline } from "react-icons/io5";
import { RiHeartPulseLine } from "react-icons/ri";
import { MdOutlineLocationOn } from "react-icons/md";

function DropdownField({
  label,
  placeholder,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  icon,
}) {
  const selectedLabel = useMemo(
    () =>
      (value
        ? options.find((option) => option.value === value)?.label
        : placeholder) || placeholder,
    [options, placeholder, value]
  );

  return (
    <div className="admin-filter-field">
      <span className="admin-filter-field-label" style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
        {icon}
        {label}
      </span>

      <button
        type="button"
        className={`admin-filter-control ${isOpen ? "open" : ""}`}
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`admin-filter-value ${!value ? "placeholder" : ""}`}>
          {selectedLabel}
        </span>
        <RiArrowDownSLine className="admin-filter-caret" />
      </button>

      {isOpen && (
        <div className="admin-filter-dropdown" role="listbox">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              className={`admin-filter-option ${
                option.value === value ? "selected" : ""
              }`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateField({ value, onChange, isOpen, onToggle }) {
  const inputRef = useRef(null);

  const displayValue = useMemo(() => {
    if (!value) return "Seleccione una fecha";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Seleccione una fecha";
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [value]);

  return (
    <div className="admin-filter-field">
      <span className="admin-filter-field-label"  style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
        <RiCalendarEventLine />
        Fecha
      </span>

      <button
        type="button"
        className={`admin-filter-control ${isOpen ? "open" : ""}`}
        onClick={() => {
          onToggle();
          const input = inputRef.current;
          if (input?.showPicker) {
            input.showPicker();
          } else {
            input?.click();
          }
        }}
      >
        <span className={`admin-filter-value ${!value ? "placeholder" : ""}`}>
          {displayValue}
        </span>
        <RiArrowDownSLine className="admin-filter-caret" />
      </button>

      <input
        ref={inputRef}
        type="date"
        className="admin-date-hidden-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Seleccione una fecha"
      />
    </div>
  );
}

export default function EventFilters({
  typeValue,
  onTypeChange,
  statusValue,
  onStatusChange,
  dateValue,
  onDateChange,
  provinceValue,
  onProvinceChange,
  typeOptions,
  statusOptions,
  provinceOptions,
  onClearFilters,
}) {
  const rootRef = useRef(null);
  const [openField, setOpenField] = useState("");

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpenField("");
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const toggleField = (field) => {
    setOpenField((current) => (current === field ? "" : field));
  };

  const iconStyle = {
    color: "#0f6970",
    fontSize: "18px",
    flexShrink: 0,
  };

  return (
    <div className="admin-users-filters-card" ref={rootRef}>
      <div className="admin-users-search-wrap admin-events-search-wrap">
        <div className="admin-events-search-copy">
          <p className="admin-stat-label">Filtros de eventos</p>
        </div>

        <div className="admin-events-search-actions">
          <button
            type="button"
            className="admin-filters-clear-btn"
            onClick={() => {
              setOpenField("");
              onClearFilters();
            }}
            disabled={!typeValue && !statusValue && !dateValue && !provinceValue}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="admin-users-filters-grid admin-events-filters-grid">
        <DropdownField
          label="Tipo"
          placeholder="Seleccione un tipo"
          value={typeValue}
          options={typeOptions}
          isOpen={openField === "type"}
          onToggle={() => toggleField("type")}
          icon={<IoTicketOutline style={iconStyle} />}
          onSelect={(nextValue) => {
            onTypeChange(nextValue);
            setOpenField("");
          }}
        />

        <DropdownField
          label="Estado"
          placeholder="Seleccione un estado"
          value={statusValue}
          options={statusOptions}
          isOpen={openField === "status"}
          onToggle={() => toggleField("status")}
          icon={<RiHeartPulseLine style={iconStyle} />}
          onSelect={(nextValue) => {
            onStatusChange(nextValue);
            setOpenField("");
          }}
        />

        <DateField
          value={dateValue}
          onChange={onDateChange}
          isOpen={openField === "date"}
          onToggle={() => toggleField("date")}
        />

        <DropdownField
          label="Provincia"
          placeholder="Seleccione una provincia"
          value={provinceValue}
          options={provinceOptions}
          isOpen={openField === "province"}
          onToggle={() => toggleField("province")}
          icon={<MdOutlineLocationOn style={iconStyle} />}
          onSelect={(nextValue) => {
            onProvinceChange(nextValue);
            setOpenField("");
          }}
        />
      </div>
    </div>
  );
}
