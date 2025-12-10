window.addEventListener('DOMContentLoaded', async () => {
 
  //CATEGORIES
  const catInput = document.getElementById('category-input');
  const catBtn = document.getElementById('category-add-btn');
  const catList = document.getElementById('category-list');
  const expCategorySelect = document.getElementById('exp-category-select');

  let currentCategories = [];
  let selectedCategoryId = null; 

  async function refreshCategories() {
    const categories = await window.api.listCategories();
    currentCategories = categories;

    // Nettoyage
    catList.innerHTML = '';
    expCategorySelect.innerHTML = '<option value="">Choisir une catégorie...</option>';

    categories.forEach((cat) => {
      // Élément LISTE dans le DOM
      const li = document.createElement('li');
      li.textContent = `${cat.id} - ${cat.name}`;
      li.style.cursor = 'pointer';
      li.dataset.id = cat.id;

      // Quand on clique sur une catégorie -> filtre
      li.addEventListener('click', () => {
        selectedCategoryId = cat.id;
        refreshExpenses();
      });

      catList.appendChild(li);

      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.name} (#${cat.id})`;
      expCategorySelect.appendChild(opt);
    });
  }

  catBtn.addEventListener('click', async () => {
    const name = catInput.value.trim();
    if (!name) return;

    await window.api.createCategory(name);
    catInput.value = '';

    await refreshCategories();
    await refreshExpenses();
  });

  // DEPENSES

  const expLabel = document.getElementById('exp-label');
  const expAmount = document.getElementById('exp-amount');
  const expDate = document.getElementById('exp-date');
  const expBtn = document.getElementById('exp-add-btn');
  const expList = document.getElementById('expense-list');
  const categorySummary = document.getElementById('category-summary');
  const resetFilterBtn = document.getElementById('reset-filter-btn');

  async function refreshExpenses() {
    const expenses = await window.api.listExpenses();

    let filtered = expenses;

    if (selectedCategoryId !== null) {
      filtered = expenses.filter(exp => exp.category_id === selectedCategoryId);
    }

    expList.innerHTML = '';
    let total = 0;

    filtered.forEach((exp) => {
      const li = document.createElement('li');
      li.textContent = `${exp.id} - ${exp.label} : ${exp.amount}€ (cat ${exp.category_id})`;
      expList.appendChild(li);
      total += exp.amount;
    });

    // Texte de total (résumé)
    if (selectedCategoryId === null) {
      categorySummary.textContent = `Toutes catégories : ${total.toFixed(2)}€`;
    } else {
      const cat = currentCategories.find((c) => c.id === selectedCategoryId);
      const name = cat ? cat.name : `Cat ${selectedCategoryId}`;
      categorySummary.textContent = `Catégorie ${name} : ${total.toFixed(2)}€`;
    }
  }

  expBtn.addEventListener('click', async () => {
    const data = {
      label: expLabel.value.trim(),
      amount: parseFloat(expAmount.value),
      date: expDate.value,
      category_id: parseInt(expCategorySelect.value, 10)
    };

    // Validation
    if (!data.label || isNaN(data.amount) || !data.date || isNaN(data.category_id)) {
      alert('Merci de remplir tous les champs de dépense 🙂');
      return;
    }

    await window.api.createExpense(data);

    // Reset du formulaire
    expLabel.value = '';
    expAmount.value = '';
    expDate.value = '';
    expCategorySelect.value = '';

    await refreshExpenses();
  });

  //      Bouton : RESET filtre
  resetFilterBtn.addEventListener('click', () => {
    selectedCategoryId = null; // enlever le filtre
    refreshExpenses();
  });


  await refreshCategories();
  await refreshExpenses();
});
