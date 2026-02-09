# 🚀 Démarrage Rapide

## Installation

```bash
# Backend
cd apps/server
npm install

# Frontend
cd apps/web
npm install
```

## Configuration

```bash
# Créer le .env à la racine
cp .env.example .env
```

Éditer le `.env` avec votre DATABASE_URL PostgreSQL.

## Lancement

**Terminal 1 - Serveur** :
```bash
cd apps/server
npm run dev
```

**Terminal 2 - Frontend** :
```bash
cd apps/web
npm run dev
```

Ouvrir http://localhost:3000

## Fonctionnalité Clé : Réponses Multiples

✅ Les joueurs peuvent soumettre **plusieurs réponses** par round
⏱️ **Cooldown de 2 secondes** après chaque mauvaise réponse
🎯 Une fois la bonne réponse trouvée, le joueur ne peut plus répondre

## UI/UX Moderne

- ⚫ Fond noir pur
- 💜 Accent violet clair (#D8B4FE)
- 🔤 Space Grotesk (titres) + Inter (corps)
- 🎨 Design minimaliste, boutons pills
- 📱 Mobile-first responsive
