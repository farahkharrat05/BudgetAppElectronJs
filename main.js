const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'budget.db');

// Ouverture de la base
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erreur DB :', err);
  else console.log('Base SQLite ouverte :', dbPath);
});

// Création des tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT
    )
  `);

  db.run(
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
});

// IPC — Lister les catégories
ipcMain.handle('categories:list', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// IPC — Créer une catégorie
ipcMain.handle('categories:create', (event, name) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO categories (name) VALUES (?)',
      [name],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, name });
      }
    );
  });
});

// Après avoir créé la table categories :
db.run(
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    monthly_limit REAL
  )`
);

// Si ta table existait déjà sans monthly_limit, tu peux forcer l'ajout :
db.run('ALTER TABLE categories ADD COLUMN monthly_limit REAL', (err) => {
  // On ignore l'erreur "duplicate column", ce n'est pas grave
});

// IPC — Mettre à jour une catégorie
ipcMain.handle('categories:update', (event, category) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE categories
       SET name = ?, color = ?, monthly_limit = ?
       WHERE id = ?`,
      [
        category.name,
        category.color || null,
        category.monthly_limit != null ? category.monthly_limit : null,
        category.id,
      ],
      function (err) {
        if (err) {
          console.error('Erreur UPDATE category :', err);
          reject(err);
        } else {
          resolve(category);
        }
      }
    );
  });
});


// IPC — Supprimer une catégorie (si aucune dépense associée)
ipcMain.handle('categories:delete', (event, id) => {
  return new Promise((resolve, reject) => {
    // Vérifier d'abord s'il y a des dépenses liées
    db.get(
      'SELECT COUNT(*) AS count FROM expenses WHERE category_id = ?',
      [id],
      (err, row) => {
        if (err) {
          console.error('Erreur SELECT COUNT expenses :', err);
          reject(err);
          return;
        }

        if (row.count > 0) {
          // On ne supprime pas si des dépenses existent
          resolve({ success: false, reason: 'HAS_EXPENSES', count: row.count });
          return;
        }

        // Sinon on supprime
        db.run(
          'DELETE FROM categories WHERE id = ?',
          [id],
          function (err2) {
            if (err2) {
              console.error('Erreur DELETE category :', err2);
              reject(err2);
            } else {
              resolve({ success: this.changes > 0 });
            }
          }
        );
      }
    );
  });
});

// IPC — Lister les dépenses
ipcMain.handle('expenses:list', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM expenses', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// IPC — Créer une dépense
ipcMain.handle('expenses:create', (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO expenses (label, amount, date, category_id)
       VALUES (?, ?, ?, ?)`,
      [data.label, data.amount, data.date, data.category_id],
      function (err) {
        if (err) {
          console.error('Erreur INSERT expense :', err);
          reject(err);
          return;
        }

        const createdExpense = {
          id: this.lastID,
          label: data.label,
          amount: data.amount,
          date: data.date,
          category_id: data.category_id,
        };

        // Vérifier la limite de budget pour cette catégorie / mois
        const monthPrefix = data.date.slice(0, 7);

        db.get(
          'SELECT name, monthly_limit FROM categories WHERE id = ?',
          [data.category_id],
          (errCat, catRow) => {
            if (errCat || !catRow || catRow.monthly_limit == null) {
              // pas de limite définie ou erreur => on ignore
              resolve(createdExpense);
              return;
            }

            db.get(
              `SELECT SUM(amount) AS total
               FROM expenses
               WHERE category_id = ?
               AND substr(date, 1, 7) = ?`,
              [data.category_id, monthPrefix],
              (errSum, sumRow) => {
                if (!errSum && sumRow && sumRow.total > catRow.monthly_limit) {
                  // Notif système
                  new Notification({
                    title: 'Budget dépassé ⚠',
                    body: `La catégorie "${catRow.name}" a dépassé sa limite de ${catRow.monthly_limit}€ pour ${monthPrefix}.`,
                  }).show();
                }

                resolve(createdExpense);
              }
            );
          }
        );
      }
    );
  });
});


// IMPORTATION D'UN FICHIER CSV
ipcMain.handle('expenses:import', async () => {
  try {
    // Boîte de dialogue pour choisir le CSV
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importer des dépenses (CSV)',
      properties: ['openFile'],
      filters: [{ name: 'CSV files', extensions: ['csv'] }],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { imported: 0, items: [] };
    }

    const filePath = filePaths[0];

    // Lecture du fichier
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error('Erreur lecture fichier CSV :', err);
      throw err;
    }

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      console.log('CSV vide ou seulement header');
      return { imported: 0, items: [] };
    }

    // Header (on suppose : label,amount,date,category)
    const dataLines = lines.slice(1);

    // Fonction helper pour chercher ou créer une catégorie
    function getOrCreateCategoryByName(name) {
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM categories WHERE name = ?',
          [name],
          (err, row) => {
            if (err) {
              console.error('Erreur SELECT category :', err);
              reject(err);
            } else if (row) {
              resolve(row.id);
            } else {
              db.run(
                'INSERT INTO categories (name) VALUES (?)',
                [name],
                function (err2) {
                  if (err2) {
                    console.error('Erreur INSERT category :', err2);
                    reject(err2);
                  } else {
                    resolve(this.lastID);
                  }
                }
              );
            }
          }
        );
      });
    }

    const importedExpenses = [];

    // Traitement ligne par ligne
    for (const line of dataLines) {
      // On gère CSV avec virgule OU point-virgule
      const sep = line.includes(';') ? ';' : ',';
      const parts = line.split(sep);
      
      if (parts.length < 4) {
        console.warn('Ligne ignorée (pas assez de colonnes) :', line);
        continue;
      }

      const [label, amountStr, date, categoryName] = parts.map((p) => p.trim());

      // Conversion du montant (gère la virgule décimale)
      const amount = parseFloat(amountStr.replace(',', '.'));
      
      // Validation des données
      if (!label || !date || !categoryName || isNaN(amount)) {
        console.warn('Ligne invalide, ignorée :', line);
        continue;
      }

      // Chercher ou créer la catégorie
      let categoryId;
      try {
        categoryId = await getOrCreateCategoryByName(categoryName);
      } catch (err) {
        console.error('Erreur lors de la gestion de la catégorie :', err);
        continue; // On ignore cette ligne mais continue avec les autres
      }

      // Insérer la dépense
      const inserted = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO expenses (label, amount, date, category_id)
           VALUES (?, ?, ?, ?)`,
          [label, amount, date, categoryId],
          function (err) {
            if (err) {
              console.error('Erreur INSERT expense :', err);
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                label: label,
                amount: amount,
                date: date,
                category_id: categoryId,
              });
            }
          }
        );
      });

      importedExpenses.push(inserted);
    }

    console.log(`Import CSV terminé : ${importedExpenses.length} dépenses importées`);
    
    // Afficher une notification de succès
    if (importedExpenses.length > 0) {
      new Notification({
        title: 'Import CSV réussi ✓',
        body: `${importedExpenses.length} dépenses ont été importées avec succès.`,
      }).show();
    }
    
    return { 
      imported: importedExpenses.length, 
      items: importedExpenses 
    };
    
  } catch (err) {
    console.error('Erreur globale import CSV :', err);
    
    // Notification d'erreur
    new Notification({
      title: 'Erreur import CSV',
      body: 'Une erreur est survenue lors de l\'import. Vérifiez le format du fichier.',
    }).show();
    
    throw err; 
  }
});

// IPC — Mettre à jour une dépense
ipcMain.handle('expenses:update', (event, expense) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE expenses
       SET label = ?, amount = ?, date = ?, category_id = ?
       WHERE id = ?`,
      [expense.label, expense.amount, expense.date, expense.category_id, expense.id],
      function (err) {
        if (err) {
          console.error('Erreur UPDATE expense :', err);
          reject(err);
        } else {
          resolve(expense);
        }
      }
    );
  });
});

// IPC — Supprimer une dépense
ipcMain.handle('expenses:delete', (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM expenses WHERE id = ?',
      [id],
      function (err) {
        if (err) {
          console.error('Erreur DELETE expense :', err);
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0 });
        }
      }
    );
  });
});


// Création fenêtre
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
