import Action from "./Action";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const close = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    ref.current.addEventListener("keydown", close);
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={ref}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <Action className="icon-btn" onClick={onClose} aria-label="Kapat">
          <X size={20} />
        </Action>
      </div>
      {children}
    </dialog>
  );
}
