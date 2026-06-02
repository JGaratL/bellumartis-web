import { useEffect, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import { PiCrownBold } from "react-icons/pi";
import { MdOutlineLocationOn } from "react-icons/md";
import { TbHeartbeat } from "react-icons/tb";
import { FaRegClock } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";

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
      <span
        className="admin-filter-field-label"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
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
        <span
          className={`admin-filter-value ${!value ? "placeholder" : ""}`}
        >
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
              className={`admin-filter-option ${option.value === value ? "selected" : ""
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

export default function AdminUsersFilters({
  searchValue,
  onSearchChange,
  roleValue,
  onRoleChange,
  provinceValue,
  onProvinceChange,
  statusValue,
  onStatusChange,
  lastLoginValue,
  onLastLoginChange,
  roleOptions,
  provinceOptions,
  statusOptions,
  lastLoginOptions,
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

    return () =>
      document.removeEventListener(
        "mousedown",
        handleDocumentClick
      );
  }, []);

  const toggleField = (field) => {
    setOpenField((current) =>
      current === field ? "" : field
    );
  };

  const iconStyle = {
    color: "#0f6970",
    fontSize: "18px",
    flexShrink: 0,
  };

  return (
    <div
      className="admin-users-filters-card"
      ref={rootRef}
    >
      <div className="admin-users-search-wrap">
        <label className="admin-search-field">
          <span
            className="admin-filter-field-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaSearch
              style={{
                color: "#0f6970",
                fontSize: "15px",
                flexShrink: 0,
              }}
            />

            Buscar
          </span>

          <input
            type="search"
            className="admin-search-input"
            value={searchValue}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Buscar por nickname o email"
          />
        </label>

        <button
          type="button"
          className="admin-filters-clear-btn"
          onClick={() => {
            setOpenField("");
            onClearFilters();
          }}
          disabled={
            !searchValue &&
            !roleValue &&
            !provinceValue &&
            !statusValue &&
            !lastLoginValue
          }
        >
          Limpiar filtros
        </button>
      </div>

      <div className="admin-users-filters-grid">
        <DropdownField
          label="Rol"
          placeholder="Seleccione rol"
          value={roleValue}
          options={roleOptions}
          isOpen={openField === "role"}
          onToggle={() => toggleField("role")}
          icon={<PiCrownBold style={iconStyle} />}
          onSelect={(nextValue) => {
            onRoleChange(nextValue);
            setOpenField("");
          }}
        />

        <DropdownField
          label="Ubicacion"
          placeholder="Seleccione provincia"
          value={provinceValue}
          options={provinceOptions}
          isOpen={openField === "province"}
          onToggle={() =>
            toggleField("province")
          }
          icon={
            <MdOutlineLocationOn
              style={iconStyle}
            />
          }
          onSelect={(nextValue) => {
            onProvinceChange(nextValue);
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
          icon={
            <TbHeartbeat style={iconStyle} />
          }
          onSelect={(nextValue) => {
            onStatusChange(nextValue);
            setOpenField("");
          }}
        />

        <DropdownField
          label="Ultimo Login"
          placeholder="Seleccione una opción"
          value={lastLoginValue}
          options={lastLoginOptions}
          isOpen={openField === "lastLogin"}
          onToggle={() =>
            toggleField("lastLogin")
          }
          icon={
            <FaRegClock style={iconStyle} />
          }
          onSelect={(nextValue) => {
            onLastLoginChange(nextValue);
            setOpenField("");
          }}
        />
      </div>
    </div>
  );
}
