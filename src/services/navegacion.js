export function desplazarAlInicio() {
  const main = document.querySelector('.main');
  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
