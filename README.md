<img src="logo.png" alt="Lab" width="140">

# Lab

En fait, j'ai pas WhatsApp sur mon ordi. Du coup, à chaque fois que je voulais passer un lien ou un fichier de mon téléphone à mon ordi, j'étais obligée de me l'envoyer par mail. Donc j'ai fait ma propre appli pour ça.

Tu colles un lien, tu écris un message ou tu mets un fichier, tu appuies sur Envoyer, et ça arrive direct sur tes autres appareils. Voilà, c'est tout.

Je l'utilise sur mon iPhone et mon ordi, et mon père l'utilise aussi sur son Android. Chacun a son compte, donc on voit pas les trucs de l'autre.

## Ce que ça fait

- Envoyer des liens, des messages et des fichiers (photos, PDF, etc.)
- Ça arrive en direct sur les autres appareils connectés au même compte
- Ça s'installe comme une vraie appli, sans passer par l'App Store ou le Play Store
- Sur Android, Lab apparaît dans le menu « Partager »
- Sur l'ordi, on peut glisser un fichier ou coller une capture d'écran (Ctrl+V)

## Comment c'est fait

- **HTML, CSS, JavaScript**, sans framework
- **PWA** : c'est ce qui permet de l'installer sur le téléphone (manifest + service worker)
- **Supabase** pour les comptes, la base de données, le stockage des fichiers et le temps réel
- **Netlify** pour l'hébergement

La sécurité est gérée côté base de données, avec des règles (RLS) : un compte ne peut lire que ses propres transferts et ses propres fichiers. C'est dans `supabase-setup.sql`.

## Si tu veux l'installer chez toi

1. Crée un projet sur [Supabase](https://supabase.com) et lance `supabase-setup.sql` dans le SQL Editor.
2. Copie `config.example.js` en `config.js` et mets ton URL Supabase et ta clé publique dedans.
3. Mets le dossier en ligne (Netlify, ou autre).

Tout est expliqué étape par étape dans [GUIDE.md](GUIDE.md).

Sans `config.js`, l'appli tourne en mode démo, ça permet de voir à quoi elle ressemble.
