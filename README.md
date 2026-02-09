# 🎵 Blind Test Musical Multijoueur

Application web de blind test musical en temps réel avec système de **réponses multiples** et **cooldown de 2 secondes** après chaque erreur.

## ✨ Fonctionnalités Principales

### 🎯 Système de Réponses Multiples avec Cooldown

**Nouvelle fonctionnalité clé** : Les joueurs peuvent soumettre plusieurs réponses par round !

- ✅ **Tentatives illimitées** pendant le round
- ⏱️ **Cooldown de 2 secondes** après chaque mauvaise réponse
- 🎯 **Une fois la bonne réponse trouvée**, le joueur ne peut plus répondre
- 📊 **Tracking des tentatives** pour analytics
- 🔒 **Anti-spam** avec limite de 50 tentatives par round

#### Comment ça marche ?

1. Le joueur soumet une réponse
2. **Si correcte** :
   - Points ajoutés selon la rapidité (bonus temps)
   - Bonus de position (1er/2ème/3ème)
   - Bonus de streak (réponses consécutives)
   - Le joueur ne peut plus répondre ce round
3. **Si incorrecte** :
   - Cooldown de 2 secondes activé
   - Barre de progression visuelle dans l'input
   - Reset du streak
   - Peut réessayer après le cooldown

### 🎮 Gameplay

- **Rooms multijoueurs** (2-8 joueurs)
- **Synchronisation audio** parfaite via Socket.io
- **Timer circulaire** avec changement de couleur
- **Classement en temps réel** avec animations
- **Podium final** avec effets spectaculaires

### 🎨 Design

- **Thème "Neon Noir"** immersif
- **Animations Framer Motion** fluides
- **Vinyle rotatif** pendant la lecture
- **Feedback visuel** (shake, glow, confettis)
- **Mobile-first** responsive

## 📁 Structure du Projet

```
blind-test/
├── apps/
│   ├── server/              # Backend Node.js + Socket.io
│   │   ├── src/
│   │   │   ├── app.ts                    # Point d'entrée
│   │   │   ├── services/
│   │   │   │   ├── GameManager.ts        # State machine du jeu
│   │   │   │   ├── AnswerChecker.ts      # Fuzzy matching Levenshtein
│   │   │   │   └── ScoreCalculator.ts    # Système de scoring
│   │   │   ├── handlers/
│   │   │   │   ├── roomHandler.ts        # Gestion des rooms
│   │   │   │   └── gameHandler.ts        # Gestion du gameplay
│   │   │   └── middlewares/
│   │   │       └── rateLimiter.ts        # Anti-spam
│   │   └── prisma/
│   │       └── schema.prisma             # Schéma BDD
│   │
│   └── web/                 # Frontend Next.js 14
│       ├── app/                          # App Router
│       ├── components/
│       │   └── game/
│       │       ├── AnswerInput.tsx       # Input avec cooldown visuel
│       │       ├── MusicPlayer.tsx       # Vinyle rotatif
│       │       ├── Timer.tsx             # Timer circulaire
│       │       ├── Countdown321.tsx      # Compte à rebours
│       │       ├── ScoreBoard.tsx        # Classement
│       │       └── FinalPodium.tsx       # Podium final
│       ├── hooks/
│       │   ├── useGameSocket.ts          # Hook Socket.io
│       │   └── useAudioPlayer.ts         # Hook Howler.js
│       └── stores/
│           └── gameStore.ts              # Store Zustand
│
└── packages/
    └── shared/
        └── types.ts                      # Types partagés
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Clone et installation

```bash
# Cloner le repo
git clone <repo-url>
cd blind-test

# Installer les dépendances du serveur
cd apps/server
npm install

# Installer les dépendances du frontend
cd ../web
npm install
```

### 2. Configuration

```bash
# À la racine du projet
cp .env.example .env

# Éditer .env avec vos valeurs
# Notamment la DATABASE_URL PostgreSQL
```

### 3. Base de données

```bash
cd apps/server

# Générer le client Prisma
npm run prisma:generate

# Créer la base de données et appliquer les migrations
npm run prisma:migrate
```

### 4. Lancement

**Terminal 1 - Serveur** :
```bash
cd apps/server
npm run dev
```

Le serveur démarre sur `http://localhost:3001`

**Terminal 2 - Frontend** :
```bash
cd apps/web
npm run dev
```

Le frontend démarre sur `http://localhost:3000`

## 🎯 Système de Scoring

### Points de base
- **1000 points** pour une bonne réponse

### Bonus de temps
```
bonus = (temps_restant / temps_total) × 2 × 1000
```
- Réponse en 3s → ~1800 pts bonus
- Réponse en 15s → 1000 pts bonus
- Réponse en 28s → 133 pts bonus

### Bonus de position
- **1er à trouver** : +200 pts
- **2ème à trouver** : +100 pts
- **3ème à trouver** : +50 pts

### Bonus de streak
- **2 bonnes réponses consécutives** : 0 pts
- **3 consécutives** : +100 pts
- **4 consécutives** : +200 pts
- **5 consécutives** : +300 pts
- **6+ consécutives** : +500 pts

### Exemple
Réponse en 3s, premier à trouver, streak de 3 :
```
1000 (base) + 1800 (temps) + 200 (position) + 100 (streak) = 3100 points
```

## 🔐 Sécurité & Anti-triche

- ✅ **Le serveur est la source de vérité** (scores, timer, validation)
- ✅ **Validation des timestamps** (pas de réponses avant le début du round)
- ✅ **Rate limiting** (50 tentatives max par round)
- ✅ **Fuzzy matching** côté serveur (pas de triche possible)
- ✅ **Sanitization** des pseudos et messages
- ✅ **Reconnexion** possible dans les 60 secondes

## 🧪 Tests

### Test du système de cooldown

1. Lancer le serveur et le frontend
2. Créer une room
3. Démarrer une partie (solo possible pour tester)
4. Soumettre une **mauvaise réponse**
5. Observer :
   - ✅ Message "Attends 2s avant de réessayer..."
   - ✅ Barre de progression jaune au bas de l'input
   - ✅ Input désactivé pendant 2 secondes
   - ✅ Après 2s, possibilité de réessayer

## 📋 TODO

- [ ] Intégration API Deezer pour les morceaux réels
- [ ] Service de playlist personnalisée
- [ ] Chat in-game
- [ ] Historique des parties
- [ ] Achievements et badges
- [ ] Mode solo contre IA
- [ ] PWA pour installation mobile

## 🛠️ Stack Technique

### Backend
- Node.js + Express
- Socket.io (temps réel)
- TypeScript strict
- PostgreSQL + Prisma ORM

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript strict
- Zustand (state management)
- Framer Motion (animations)
- Howler.js (audio)
- Tailwind CSS

### Communication
- Socket.io (bidirectionnel temps réel)
- Types partagés front/back

## 📝 Fichiers Clés

### Système de cooldown

**Serveur** :
- `apps/server/src/services/GameManager.ts:175-235` - Logique du cooldown
- `apps/server/src/middlewares/rateLimiter.ts` - Anti-spam

**Client** :
- `apps/web/components/game/AnswerInput.tsx` - UI du cooldown
- `apps/web/stores/gameStore.ts` - État du cooldown
- `packages/shared/types.ts` - Types `cooldownUntil`, `hasAnsweredCorrectly`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

---

**Made with ❤️ and 🎵**
