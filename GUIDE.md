# Lab : guide de mise en route

Il faut compter environ 20 minutes, une seule fois.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html`, `styles.css`, `app.js` | L'appli (écrans + fonctionnement) |
| `config.example.js` | Modèle à copier en `config.js` : **le seul fichier à modifier**, avec l'adresse et la clé de votre projet Supabase (`config.js` n'est pas mis sur GitHub) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Ce qui rend l'appli installable (et le menu « Partager » sur Android) |
| `supabase-setup.sql` | À coller une fois dans Supabase |

Tant que `config.js` n'est pas rempli, l'appli tourne en **mode démo** : elle s'affiche normalement, mais rien ne quitte l'appareil.

---

## Étape 1 : créer le relais (Supabase, gratuit)

1. Créez un compte sur **supabase.com**, puis cliquez sur **New project**. Donnez-lui un nom (par ex. `lab`), choisissez un mot de passe de base de données (gardez-le quelque part) et la région **Europe**.
2. Une fois le projet prêt, ouvrez **SQL Editor** puis **New query**. Collez tout le contenu de `supabase-setup.sql` et cliquez sur **Run**. Le message « Success » doit s'afficher.
3. Copiez `config.example.js` en `config.js`. Ouvrez **Project Settings > API** (ou « Data API ») et copiez :
   - **Project URL**, à mettre dans `supabaseUrl`
   - **anon public key**, à mettre dans `supabaseAnonKey`

   dans le fichier `config.js`.

## Étape 2 : mettre l'appli en ligne (Netlify, gratuit)

1. Créez un compte sur **netlify.com**.
2. Allez dans **Sites**, puis **Add new site > Deploy manually**, et **glissez le dossier `lab`** dans la zone.
3. Netlify vous donne une adresse du type `https://quelque-chose.netlify.app`. Vous pouvez la renommer dans *Site configuration > Change site name* (ex. `mon-lab.netlify.app`).

> Pour toute modification future, glissez de nouveau le dossier dans *Deploys*.

## Étape 3 : relier les deux

Dans Supabase, ouvrez **Authentication > URL Configuration** :
- **Site URL** : votre adresse Netlify (ex. `https://mon-lab.netlify.app`)
- **Redirect URLs** : ajoutez la même adresse

*(Facultatif)* Dans **Authentication > Sign In / Providers > Email**, vous pouvez désactiver « Confirm email » pour éviter l'e-mail de confirmation à l'inscription.

## Étape 4 : installer l'appli

| Appareil | Comment faire |
|---|---|
| **iPhone** | Ouvrez l'adresse dans **Safari**, appuyez sur le bouton Partager, puis **Sur l'écran d'accueil** |
| **Android** | Ouvrez l'adresse dans **Chrome**, menu ⋮, puis **Installer l'application** |
| **Ordinateur** | Ouvrez l'adresse dans **Chrome** ou **Edge**, puis cliquez sur l'icône d'installation à droite de la barre d'adresse |

Créez votre compte au premier lancement. Chaque personne peut créer son propre compte : chacun ne voit que ses propres transferts.

## Étape 5 : le bouton « Partager »

**Android** : rien à faire. Une fois l'appli installée, **Lab** apparaît dans le menu Partager (liens et fichiers). L'appli s'ouvre avec le contenu prêt, il ne reste qu'à appuyer sur **Envoyer**.

**iPhone** : Apple ne laisse pas les web-apps apparaître dans le menu Partager. Il y a deux solutions :
- **Le plus simple** : copiez le lien, ouvrez Lab, collez-le et appuyez sur la flèche. Pour un fichier ou une photo, touchez la zone « Déposez vos fichiers ici » : l'iPhone propose Photos, Appareil photo ou Fichiers.
- **Raccourci pour les liens** (appli *Raccourcis*) :
  1. Créez un nouveau raccourci nommé « Envoyer à Lab ».
  2. Ouvrez les réglages du raccourci (ⓘ), activez **Afficher dans la feuille de partage** et choisissez les types **URL** et **Texte**.
  3. Ajoutez l'action **Encoder l'URL** (entrée : *Entrée du raccourci*).
  4. Ajoutez l'action **URL** avec : `https://VOTRE-ADRESSE.netlify.app/?send=1&text=` suivie de la variable *URL encodée*.
  5. Ajoutez l'action **Ouvrir les URL**.

  Le lien s'ouvre alors dans Safari et part tout seul. ⚠️ Sur iPhone, Safari et l'appli installée ne partagent pas la connexion : connectez-vous une fois dans Safari aussi.

## Bon à savoir

- **Limites du plan gratuit Supabase** : 50 Mo par fichier, 1 Go de stockage au total. Pensez à supprimer les vieux fichiers (bouton *Supprimer*).
- Un projet Supabase gratuit **se met en pause après 7 jours sans aucune utilisation**. Il suffit de le relancer d'un clic depuis le tableau de bord.
- **Connexion Google** : le bouton est prêt, mais il demande une configuration en plus (Google Cloud + Supabase > Providers > Google). En attendant, utilisez e-mail + mot de passe.
- La clé « anon » dans `config.js` peut être visible : la sécurité repose sur les règles du fichier SQL (chacun ne peut lire que ses données).
