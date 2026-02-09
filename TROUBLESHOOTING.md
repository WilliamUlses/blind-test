# 🔧 Résolution des problèmes

## CSS ne se charge pas

Si le CSS ne s'applique pas sur la page :

### 1. Redémarrer le serveur Next.js

```bash
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis relancer
cd apps/web
npm run dev
```

### 2. Vérifier les dépendances

```bash
cd apps/web
npm install
```

### 3. Nettoyer le cache Next.js

```bash
cd apps/web
rm -rf .next
npm run dev
```

### 4. Vérifier que Tailwind est bien configuré

Fichiers à vérifier :
- ✅ `tailwind.config.js` existe
- ✅ `postcss.config.js` existe
- ✅ `styles/globals.css` contient les directives @tailwind
- ✅ `app/layout.tsx` importe `../styles/globals.css`

## Problème de connexion Socket.io

Si "Créer la room" ne fait rien :

1. Vérifier que le serveur backend tourne sur le port 3001
2. Vérifier dans la console du navigateur s'il y a des erreurs
3. Ouvrir l'onglet Network et chercher des requêtes vers `localhost:3001`

## Port déjà utilisé

### Serveur (port 3001)

```bash
lsof -ti:3001 | xargs kill -9
```

### Frontend (port 3000)

```bash
lsof -ti:3000 | xargs kill -9
```

## Problème de packages

Si les imports ne fonctionnent pas :

```bash
# Backend
cd apps/server
rm -rf node_modules package-lock.json
npm install

# Frontend
cd apps/web
rm -rf node_modules package-lock.json
npm install
```
