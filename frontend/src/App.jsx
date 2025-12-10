import { useEffect, useState } from "react";
import "./App.css";

function App() {
  // ÉTATS PRINCIPAUX 
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newExpense, setNewExpense] = useState({
    label: "",
    amount: "",
    date: "",
    category_id: "",
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  //  CHARGEMENT INITIAL  

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [cats, exps] = await Promise.all([
          window.api.listCategories(),
          window.api.listExpenses(),
        ]);

        setCategories(cats);
        setExpenses(exps);
      } catch (err) {
        console.error("Erreur chargement :", err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

 
  // LOGIQUE CATÉGORIES

  async function handleAddCategory(e) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      const created = await window.api.createCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCategoryName("");
    } catch (err) {
      console.error("Erreur ajout catégorie :", err);
      alert("Impossible d’ajouter la catégorie.");
    }
  }

  function handleCategoryClick(id) {
    // clic sur la carte =  filtrer
    setSelectedCategoryId(id);
  }

  function clearCategoryFilter() {
    setSelectedCategoryId(null);
  }

  function openCategoryModal(cat) {
    setEditingCategory({ ...cat });
  }

  function handleEditCategoryField(field, value) {
    setEditingCategory((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

 async function handleSaveCategory() {
  try {
    const payload = {
      ...editingCategory,
      monthly_limit:
        editingCategory.monthly_limit != null
          ? parseFloat(editingCategory.monthly_limit)
          : null,
    };

    const updated = await window.api.updateCategory(payload);

    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );

    setEditingCategory(null);
  } catch (err) {
    console.error("Erreur modification catégorie :", err);
    alert("Erreur lors de la modification.");
  }
}


  async function handleDeleteCategory() {
    if (!editingCategory) return;

    // on empêche de supprimer si des dépenses existent
    const hasExpenses = expenses.some(
      (e) => e.category_id === editingCategory.id
    );
    if (hasExpenses) {
      alert("Impossible de supprimer : des dépenses utilisent cette catégorie.");
      return;
    }

    if (!confirm("Supprimer définitivement cette catégorie ?")) return;

    try {
      const res = await window.api.deleteCategory(editingCategory.id);
      if (!res || !res.success) {
        alert("Suppression impossible.");
        return;
      }

      setCategories((prev) =>
        prev.filter((c) => c.id !== editingCategory.id)
      );
      if (selectedCategoryId === editingCategory.id) {
        setSelectedCategoryId(null);
      }
      setEditingCategory(null);
    } catch (err) {
      console.error("Erreur suppression catégorie :", err);
      alert("Erreur lors de la suppression.");
    }
  }
 
  // LOGIQUE DÉPENSES

  async function handleAddExpense(e) {
    e.preventDefault();
    const { label, amount, date, category_id } = newExpense;

    if (!label || !amount || !date || !category_id) {
      alert("Merci de remplir tous les champs de la dépense.");
      return;
    }

    const payload = {
      label: label.trim(),
      amount: parseFloat(amount),
      date,
      category_id: parseInt(category_id, 10),
    };

    if (isNaN(payload.amount) || isNaN(payload.category_id)) {
      alert("Montant ou catégorie invalide.");
      return;
    }

    try {
      const created = await window.api.createExpense(payload);
      setExpenses((prev) => [...prev, created]);
      setNewExpense({ label: "", amount: "", date: "", category_id: "" });
    } catch (err) {
      console.error("Erreur ajout dépense :", err);
      alert("Impossible d’ajouter la dépense.");
    }
  }
  async function  handleImportCsv() {
  try {
    const res = await window.api.importExpenses();
    if (res && res.imported > 0) {
      // On ajoute les nouvelles dépenses en plus des anciennes
      setExpenses((prev) => [...prev, ...res.items]);
      alert(`${res.imported} dépenses importées depuis le CSV.`);
    } else {
      alert("Aucune dépense importée.");
    }
  } catch (err) {
    console.error("Erreur import CSV :", err);
    alert("Erreur lors de l'import CSV.");
  }
}



  function openExpenseModal(exp) {
    setEditingExpense({ ...exp });
  }

  function handleEditExpenseField(field, value) {
    setEditingExpense((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSaveExpense() {
    if (!editingExpense) return;

    const payload = {
      ...editingExpense,
      amount: parseFloat(editingExpense.amount),
      category_id: parseInt(editingExpense.category_id, 10),
    };

    if (isNaN(payload.amount) || isNaN(payload.category_id)) {
      alert("Montant ou catégorie invalide.");
      return;
    }

    try {
      const updated = await window.api.updateExpense(payload);
      setExpenses((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      setEditingExpense(null);
    } catch (err) {
      console.error("Erreur maj dépense :", err);
      alert("Erreur lors de la modification.");
    }
  }

  async function handleDeleteExpense() {
    if (!editingExpense) return;
    if (!confirm("Supprimer définitivement cette dépense ?")) return;

    try {
      await window.api.deleteExpense(editingExpense.id);
      setExpenses((prev) =>
        prev.filter((e) => e.id !== editingExpense.id)
      );
      setEditingExpense(null);
    } catch (err) {
      console.error("Erreur suppression dépense :", err);
      alert("Erreur lors de la suppression.");
    }
  }

  // 4. DONNÉES DÉRIVÉES SIMPLES

  const filteredExpenses =
    selectedCategoryId === null
      ? expenses
      : expenses.filter((e) => e.category_id === selectedCategoryId);

  const selectedCategory =
    selectedCategoryId === null
      ? null
      : categories.find((c) => c.id === selectedCategoryId);

  const totalSpent = filteredExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  // total par catégorie (pour afficher sur la carte)
  function getTotalForCategory(catId) {
    return expenses
      .filter((e) => e.category_id === catId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // 5. RENDER

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">💰 Budget</h2>
        <nav className="nav">
          <button className="nav-item active">Dashboard</button>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h2>Welcome</h2> 
            <p className="subtitle">
              Suivi simple de ton budget
            </p>
          </div>
        </header>

        {loading && <p>Chargement...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* --- Ligne du haut : catégories --- */}
        <section className="top-row">
          <div className="card big-card">
            <h2>Catégories</h2>

            <div className="categories-grid">
              {categories.length === 0 ? (
                <p>Aucune catégorie pour l’instant.</p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={
                      "category-card" +
                      (selectedCategoryId === cat.id
                        ? " category-card-selected"
                        : "")
                    }
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {/* bouton ... pour éditer sans déclencher le filtre */}
                    <button
                      className="category-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryModal(cat);
                      }}
                    >
                      ⋯
                    </button>

                    <div className="category-name">{cat.name}</div>
                    <div className="category-amount">
                      {getTotalForCategory(cat.id).toFixed(2)} €
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="inline-form" onSubmit={handleAddCategory}>
              <input
                type="text"
                placeholder="Nouvelle catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit">Ajouter</button>
            </form>
          </div>

          <div className="card stats-card">
            <h2>Résumé</h2>
            <p>Total dépensé (filtre actuel) :</p>
            <p className="stat-value">
              {totalSpent.toFixed(2)} €
            </p>
            <p style={{ fontSize: 13, color: "#7a8194" }}>
              Catégories : {categories.length} • Dépenses :{" "}
              {filteredExpenses.length}
            </p>
          </div>
        </section>

        {/* --- Ligne du bas : dépenses --- */}
        <section className="bottom-row">
          <div className="card big-card">
            <div className="section-title-row">
              <h2>Dépenses</h2>
              {selectedCategory && (
                <div>
                  <span style={{ fontSize: 13, marginRight: 8 }}>
                    Filtré sur : <strong>{selectedCategory.name}</strong>
                  </span>
                  <button onClick={clearCategoryFilter}>
                    Effacer le filtre
                  </button>
                </div>
              )}
            </div>

           <form className="inline-form" onSubmit={handleAddExpense}>
  <input
    type="text"
    placeholder="Libellé"
    value={newExpense.label}
    onChange={(e) =>
      setNewExpense((prev) => ({
        ...prev,
        label: e.target.value,
      }))
    }
  />
  <input
    type="number"
    placeholder="Montant"
    value={newExpense.amount}
    onChange={(e) =>
      setNewExpense((prev) => ({
        ...prev,
        amount: e.target.value,
      }))
    }
  />
  <input
    type="date"
    value={newExpense.date}
    onChange={(e) =>
      setNewExpense((prev) => ({
        ...prev,
        date: e.target.value,
      }))
    }
  />
  <select
    value={newExpense.category_id}
    onChange={(e) =>
      setNewExpense((prev) => ({
        ...prev,
        category_id: e.target.value,
      }))
    }
  >
    <option value="">Catégorie</option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.id}>
        {cat.name}
      </option>
    ))}
  </select>

  <button type="submit">Ajouter</button>
  <button type="button" onClick={handleImportCsv}>
    Importer CSV
  </button>
</form>

   {filteredExpenses.length === 0 ? (
              <p>Aucune dépense pour l’instant.</p>
            ) : (
              <ul className="expense-list">
                {filteredExpenses
                  .slice()
                  .sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                  )
                  .map((exp) => {
                    const cat = categories.find(
                      (c) => c.id === exp.category_id
                    );
                    return (
                      <li
                        key={exp.id}
                        className="expense-item"
                        onClick={() => openExpenseModal(exp)}
                      >
                        <div>
                          <div className="expense-label">
                            {exp.label}
                          </div>
                          <div className="expense-meta">
                            {exp.date} · {cat ? cat.name : "Sans catégorie"}
                          </div>
                        </div>
                        <div className="expense-amount">
                          {exp.amount.toFixed(2)} €
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>
      </main>

      {editingCategory && (
  <div className="modal-backdrop">
    <div className="modal">
      <h2>Modifier la catégorie</h2>

      <div className="modal-form">

        {/* Nom */}
        <label>
          Nom
          <input
            type="text"
            value={editingCategory.name}
            onChange={(e) =>
              handleEditCategoryField("name", e.target.value)
            }
          />
        </label>

        {/* Limite mensuelle */}
        <label>
          Limite mensuelle (€)
          <input
            type="number"
            placeholder="Ex: 200"
            value={
              editingCategory.monthly_limit != null
                ? editingCategory.monthly_limit
                : ""
            }
            onChange={(e) =>
              handleEditCategoryField(
                "monthly_limit",
                e.target.value === "" ? null : parseFloat(e.target.value)
              )
            }
          />
        </label>
      </div>

      <div className="modal-actions">
        <button className="btn-danger" onClick={handleDeleteCategory}>
          Supprimer
        </button>

        <div style={{ flex: 1 }} />

        <button
          className="btn-secondary"
          onClick={() => setEditingCategory(null)}
        >
          Annuler
        </button>

        <button className="btn-primary" onClick={handleSaveCategory}>
          Appliquer
        </button>
      </div>
    </div>
  </div>
)}


      {editingExpense && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Modifier la dépense</h2>

            <div className="modal-form">
              <label>
                Libellé
                <input
                  type="text"
                  value={editingExpense.label}
                  onChange={(e) =>
                    handleEditExpenseField("label", e.target.value)
                  }
                />
              </label>

              <label>
                Montant
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) =>
                    handleEditExpenseField("amount", e.target.value)
                  }
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) =>
                    handleEditExpenseField("date", e.target.value)
                  }
                />
              </label>

              <label>
                Catégorie
                <select
                  value={editingExpense.category_id}
                  onChange={(e) =>
                    handleEditExpenseField(
                      "category_id",
                      e.target.value
                    )
                  }
                >
                  <option value="">Choisir...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="btn-danger"
                onClick={handleDeleteExpense}
              >
                Supprimer
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn-secondary"
                onClick={() => setEditingExpense(null)}
              >
                Annuler
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveExpense}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
