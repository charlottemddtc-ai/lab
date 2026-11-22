<img src="logo.png" alt="Lab" width="140">

# Lab

Lab est une application web que j'ai créée pour envoyer des liens, des messages et des fichiers entre mon téléphone et mon ordinateur. Je n'ai pas WhatsApp sur mon ordinateur, et je passais par l'e-mail à chaque fois que je voulais transférer quelque chose. J'ai voulu un outil plus simple, que je contrôle entièrement.

On colle un lien, on écrit un message ou on ajoute un fichier, puis on appuie sur Envoyer. Le contenu apparaît aussitôt sur les autres appareils connectés au même compte.

**Démo :** https://frabjous-lamington-b3bf7a.netlify.app

## Fonctionnalités

- Envoi de liens, de messages et de fichiers (photos, PDF, documents)
- Synchronisation en temps réel entre les appareils d'un même compte
- Comptes individuels : chaque utilisateur ne voit que ses propres transferts
- Installation sur iPhone, Android et ordinateur, sans passer par l'App Store ou le Play Store
- Intégration au menu « Partager » d'Android
- Sur ordinateur : glisser-déposer de fichiers et collage de captures d'écran (Ctrl+V)

## Technologies

- **HTML, CSS et JavaScript**, sans framework
- **PWA** (manifest et service worker) pour l'installation et le démarrage rapide
- **Supabase** pour l'authentification, la base de données PostgreSQL, le stockage des fichiers et le temps réel
- **Netlify** pour l'hébergement

La sécurité repose sur les règles d'accès de la base de données (Row Level Security) : un compte ne peut lire, ajouter ou supprimer que ses propres données et ses propres fichiers. Ces règles sont dans `supabase-setup.sql`.

## Installation

1. Créer un projet sur [Supabase](https://supabase.com) et exécuter `supabase-setup.sql` dans le SQL Editor.
2. Copier `config.example.js` en `config.js`, puis y renseigner l'URL du projet et la clé publique.
3. Déployer le dossier sur un hébergeur statique (Netlify, par exemple).

Le détail de chaque étape est dans [GUIDE.md](GUIDE.md). Sans `config.js`, l'application fonctionne en mode démo, ce qui permet de voir l'interface sans rien configurer.
