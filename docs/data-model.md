# Modèle de données – Budget App

## Entité : Category

| Champ | Type    | Description                        |
|-------|---------|------------------------------------|
| id    | INTEGER | Primary key, autoincrement         |
| name  | TEXT    | Nom de la catégorie                |
| color | TEXT    | Optionnel, couleur pour l'UI (#hex)|


## Entité : Expense

| Champ       | Type    | Description                               |
|-------------|---------|-------------------------------------------|
| id          | INTEGER | Primary key, autoincrement                |
| label       | TEXT    | Libellé de la dépense                     |
| amount      | REAL    | Montant                                   |
| date        | TEXT    | Date au format ISO (ex : 2025-12-08)      |
| category_id | INTEGER | FK vers categories.id                     |

## Relation

- Une **Category** peut avoir plusieurs **Expense**.  
- Une **Expense** appartient à **une seule Category**.

### Diagramme UML (Mermaid)

```mermaid
classDiagram
    class Category {
      int id
      string name
      string color
    }

    class Expense {
      int id
      string label
      float amount
      string date
      int category_id
    }

    Category "1" --> "many" Expense

