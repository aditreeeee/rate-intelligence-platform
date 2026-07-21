import React, { useRef, useState } from "react";
import { useCursorGlow } from "../../hooks/useCursorGlow.js";

let rippleId = 0;

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: IconEl,
  iconPosition = "left",
  loading = false,
  className = "",
  onMouseDown,
  ...rest
}) {
  const glow = useCursorGlow();
  const [ripples, setRipples] = useState([]);

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const id = ++rippleId;
    setRipples((prev) => [
      ...prev,
      { id, size, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2 },
    ]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 500);
    onMouseDown?.(e);
  };

  return (
    <button
      ref={glow.ref}
      onMouseMove={glow.onMouseMove}
      onMouseLeave={glow.onMouseLeave}
      onMouseDown={handleMouseDown}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {ripples.map((r) => (
        <span key={r.id} className="btn__ripple" style={{ width: r.size, height: r.size, left: r.x, top: r.y }} />
      ))}
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {!loading && IconEl && iconPosition === "left" && <IconEl size={16} strokeWidth={2} />}
      <span>{children}</span>
      {!loading && IconEl && iconPosition === "right" && <IconEl size={16} strokeWidth={2} />}
    </button>
  );
}
