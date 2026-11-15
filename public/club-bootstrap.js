function loadError() {
  const status = document.querySelector('#club-root p');
  if (status) status.textContent = 'Could not load FaZe Afterimage. Check your connection and reload.';
}

if (window.React && window.ReactDOM) {
  import('./afterimage.js').catch(error => {
    console.error(error);
    loadError();
  });
} else {
  loadError();
}

document.querySelector('.skip')?.addEventListener('click', event => {
  const main = document.querySelector('#club-content');
  if (!main) return;
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});