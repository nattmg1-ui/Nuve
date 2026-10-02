import { useStore } from '@nanostores/react';
import { $totalItems } from '../lib/cart';

/** Ícono de bolsa con el contador del carrito (lee el store compartido). */
export default function CartBadge() {
  const totalItems = useStore($totalItems);
  return (
    <>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M6.5 8.5h11l.9 11.5a1.5 1.5 0 0 1-1.5 1.6H7.1a1.5 1.5 0 0 1-1.5-1.6l.9-11.5Z" strokeLinejoin="round" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" strokeLinecap="round" />
      </svg>
      {totalItems > 0 && <span className="topbar__badge">{totalItems}</span>}
    </>
  );
}
