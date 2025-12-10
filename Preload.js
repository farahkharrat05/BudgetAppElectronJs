const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listCategories: () => ipcRenderer.invoke('categories:list'),
  createCategory: (name) => ipcRenderer.invoke('categories:create', name),

  listExpenses: () => ipcRenderer.invoke('expenses:list'),
  createExpense: (data) => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (data) => ipcRenderer.invoke('expenses:update', data),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  updateCategory: (cat) => ipcRenderer.invoke('categories:update', cat),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
  
  // import CSV
  importExpenses: () => ipcRenderer.invoke('expenses:import'),

  

});
