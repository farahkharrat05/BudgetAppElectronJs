#  BudgetApp – Application Electron de gestion de budget

BudgetApp est une application de bureau développée avec **Electron**, permettant de gérer son budget personnel en local.  
Elle propose la gestion des **catégories de dépenses**, des **dépenses**, ainsi qu’un suivi simple des totaux.

Ce projet est réalisé dans le cadre du **TP – Projet fil rouge Electron**.

---

## Fonctionnalités

### ✔️ Fonctionnalités principales
- Gestion des **catégories** (création, affichage…)
- Gestion des **dépenses** :
  - ajout d’une dépense
  - association à une catégorie
  - filtrage par catégorie / date (évolution possible)
- Calcul du **total par catégorie**
- Persistance locale via **SQLite**
- Communication sécurisée via **IPC (Inter Process Communication)**
- Architecture respectant la séparation :
  - **Main process**
  - **Preload**
  - **Renderer**
- Base de données relationnelle avec **2 entités minimum**
- Tests unitaires sur une partie du code
- CI/CD pour build automatique

---

## Architecture générale

L’application suit l’architecture standard Electron :

- **Main process** : gestion des fenêtres, de la base SQLite, et des handlers IPC
- **Preload** : exposition sécurisée de l'API via `window.api`
- **Renderer** : interface utilisateur (HTML / CSS / JS)

## Structure du projet
BudgetApp/
│
├── main.js
├── preload.js
├── index.html
├── renderer.js
├── package.json
│
└── docs/
├── use-cases.md
├── data-model.md
└── architecture.md
## Lancer l’application
npm run start

## Tests unitaires
Les tests se trouvent dans le répertoire :

bash
Copier le code
/tests
Ils sont exécutables via :

bash
Copier le code
npm run test

## CI/CD
Une pipeline simple est configurée pour :

installer les dépendances

exécuter les tests

tenter un build Electron

Fichier CI/CD disponible dans :

bash
Copier le code
.github/workflows/ci.yml


## Auteur
Farah Kharrat
Projet réalisé dans le cadre du cours Electron – Projet fil rouge.
2025.



