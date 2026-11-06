import { Children, cloneElement, isValidElement } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

/** One native control, two visual parts. The circle folds into its dark label on hover/focus. */
export default function Action({
  as: Tag = "button",
  children,
  className = "",
  icon,
  bare = false,
  type,
  ...props
}) {
  const nativeType = Tag === "button" ? type || "button" : undefined;
  if (bare)
    return (
      <Tag {...props} type={nativeType} className={className}>
        {children}
      </Tag>
    );
  const parts = Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim(),
  );
  const isIcon = (child) =>
    isValidElement(child) &&
    (child.type === "svg" ||
      (typeof child.type !== "string" &&
        child.type?.$$typeof === Symbol.for("react.forward_ref")));
  const embeddedIcon = parts.find(isIcon);
  const glyph = icon || embeddedIcon || <ArrowUpRight />;
  const label = parts.filter((child) => child !== embeddedIcon);
  const iconOnly = !label.length;
  return (
    <Tag
      {...props}
      type={nativeType}
      className={`action ${iconOnly ? "action-icon" : ""} ${className}`}
    >
      {!iconOnly && <span className="action-label">{label}</span>}
      <span className="action-orb" aria-hidden="true">
        {isValidElement(glyph)
          ? cloneElement(glyph, { "aria-hidden": true, focusable: false })
          : glyph}
      </span>
    </Tag>
  );
}

/** Native select semantics, matching the same detached orange control. */
export function SelectControl({
  className = "",
  children,
  disabled,
  ...props
}) {
  return (
    <span
      className={`select-control ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <select {...props} disabled={disabled}>
        {children}
      </select>
      <span className="select-orb" aria-hidden="true">
        <ChevronDown size={15} />
      </span>
    </span>
  );
}
