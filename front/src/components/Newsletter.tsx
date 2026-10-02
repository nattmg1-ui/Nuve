import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);


  if (enviado) return <p className="footer-newsletter-confirm">Listo, ya quedaste suscrita.</p>;

  return (
    <form
      className="footer-newsletter-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setEnviado(true);
        setEmail('');
      }}
    >
      <input
        type="email"
        required
        placeholder="tu@correo.com"
        className="footer-newsletter-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Correo electrónico"
      />
      <button type="submit" className="btn btn-primary">
        Unirme
      </button>
    </form>
  );
}
