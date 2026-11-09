import { useEffect, useRef } from 'react';

// Themed dialog shown by useAlert(); closes on OK, Escape, or a click outside
export default function AlertDialog({ message, onClose }) {
  const okRef = useRef(null);

  useEffect(() => {
    okRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal alert-modal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="box alert-box" role="alertdialog" aria-live="assertive">
        <div className="alert-head"><span className="alert-badge">!</span><span>NOTICE</span></div>
        <p className="alert-msg">{message}</p>
        <button ref={okRef} type="button" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
