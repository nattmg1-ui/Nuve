// front/src/scripts/menu.js
// Abre y cierra el menú del TopBar en celular (método del tutorial de Astro).
// Agrega o quita la clase "expanded" y actualiza aria-expanded para lectores de pantalla.

const boton = document.querySelector('.hamburger');
const menu = document.getElementById('menu-principal');

if (boton && menu) {
  boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('expanded');
    boton.setAttribute('aria-expanded', String(abierto));
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });
}