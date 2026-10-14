(() => {
  const { companyName, companyShortName } = document.body.dataset;
  const intro = document.querySelector('.booking-intro p:not(.eyebrow)');
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
    const topics = { integrazione: `Verifichiamo l’integrazione di AnnunciFunebri.it sul sito di ${companyShortName}.`, 'nuovo-sito': `Valutiamo un nuovo sito per ${companyShortName}, integrato con AnnunciFunebri.it.` };
    intro.textContent = topics[button.dataset.focus] || `Guardiamo insieme le opportunità per ${companyName}.`;
  }));
  document.querySelectorAll('[data-whatsapp]').forEach(link => {
    link.href = 'https://wa.me/393408384217?text=' + encodeURIComponent(`Ciao Giuliano, ho visto la proposta dedicata a ${companyName}. Vorrei parlarne con te.`);
  });
})();
