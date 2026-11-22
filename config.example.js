// =============================================================
//  Configuration de Lab
//  Remplacez les deux valeurs ci-dessous par celles de votre
//  projet Supabase (Project Settings > API).
//  Tant qu'elles ne sont pas remplies, l'appli tourne en "mode démo".
//
//  La clé "anon" peut être publique : la sécurité est assurée par
//  les règles (RLS) du fichier supabase-setup.sql.
// =============================================================
window.LAB_CONFIG = {
  supabaseUrl: "VOTRE_URL_SUPABASE",       // ex : https://abcdxyz.supabase.co
  supabaseAnonKey: "VOTRE_CLE_PUBLIQUE", // clé publique (jamais la clé secrète)
  maxFileSizeMB: 50                        // limite du plan gratuit Supabase
};
