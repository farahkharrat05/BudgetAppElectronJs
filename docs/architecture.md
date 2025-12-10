# Architecture – Budget App

Ce document décrit l’architecture générale de l’application *Budget App*, développée avec Electron.  
L'objectif est de fournir une vue claire des composants, de leurs responsabilités et de leurs interactions.

---

# 1. Architecture globale

L’application suit l’architecture standard d’Electron, composée de trois couches :

- **Main process**
- **Preload script**
- **Renderer process (UI)**

Ces couches communiquent entre elles via un mécanisme sécurisé : **IPC (Inter-Process Communication)**.

---

## 1.1 Diagramme d’architecture

```mermaid
flowchart LR
    subgraph Main[Main Process]
        M1[main.js]
        DB[(SQLite Database)]
        M1 --> DB
    end

    subgraph Preload[Preload Script]
        P1[preload.js]
    end

    subgraph Renderer[Renderer Process]
        R1[index.html]
        R2[renderer.js]
    end

    R1 <--> R2
    R2 <--> P1
    P1 <--> M1
````md   

## 2. Description des composants




