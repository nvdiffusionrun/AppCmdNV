import pandas as pd
import subprocess
import os
from datetime import datetime

# --- CONFIGURATION ---
# Nom du fichier Excel exporté d'ISAFACT
EXCEL_INPUT = "export_isafact.xlsx" 
# Chemin du fichier de destination
CSV_OUTPUT = "BaseAppCmd/AnnuaireClients.csv"

# --- MAPPING DES COLONNES ---
# À GAUCHE : Le nom de la colonne dans votre Excel ISAFACT
# À DROITE : Le nom attendu par l'application
MAPPING = {
    "Code Client": "Code",
    "Code": "Code",
    "Raison Sociale": "Nom",
    "Nom": "Nom",
    "Type": "Famille",
    "Famille": "Famille",
    "Prénom": "Prénom",
    "Adresse 1": "Adresse",
    "Adresse": "Adresse",
    "CP": "Code postal",
    "Code postal": "Code postal",
    "Ville": "Commune",
    "Commune": "Commune",
    "Commercial": "Représentant",
    "Représentant": "Représentant",
    "Dernière Facture": "Date de dernier document",
    "Date de dernier document": "Date de dernier document",
    "Téléphone": "Tél fixe",
    "Tél fixe": "Tél fixe",
    "Tél mobile": "Tél mobile",
    "Email": "Email",
    "Zone": "SECTEUR",
    "SECTEUR": "SECTEUR",
    "Tarif": "Catégorie tarifaire",
    "Catégorie tarifaire": "Catégorie tarifaire"
}

def update_clients():
    print(f"--- Démarrage de la mise à jour ({datetime.now().strftime('%H:%M:%S')}) ---")

    if not os.path.exists(EXCEL_INPUT):
        print(f"Erreur : Le fichier {EXCEL_INPUT} est introuvable.")
        return

    try:
        # 1. Lecture de l'Excel
        print(f"Lecture de {EXCEL_INPUT}...")
        df = pd.read_excel(EXCEL_INPUT)

        # 2. Transformation
        # On ne garde que les colonnes dont on a besoin et on les renomme
        # Si une colonne manque dans l'Excel, on crée une colonne vide
        final_columns = ["Code", "Nom", "Famille", "Prénom", "Adresse", "Code postal", 
                         "Commune", "Représentant", "Date de dernier document", 
                         "Tél fixe", "Tél mobile", "Email", "SECTEUR", "Catégorie tarifaire"]
        
        # Application du mapping
        df_mapped = df.rename(columns=MAPPING)
        
        # Ajout des colonnes manquantes avec des valeurs vides
        for col in final_columns:
            if col not in df_mapped.columns:
                df_mapped[col] = ""

        # Sélection et ordre final des colonnes
        df_final = df_mapped[final_columns]

        # 3. Sauvegarde en CSV (format point-virgule, encodage UTF-8)
        print(f"Génération de {CSV_OUTPUT}...")
        df_final.to_csv(CSV_OUTPUT, sep=';', index=False, encoding='utf-8-sig')

        # 4. Automatisation Git (Push vers GitHub)
        print("Envoi vers GitHub...")
        commands = [
            ["git", "add", CSV_OUTPUT],
            ["git", "commit", "-m", f"Auto-update clients: {datetime.now().strftime('%Y-%m-%d %H:%M')}"],
            ["git", "push", "origin", "main"] # ou 'master' selon votre branche
        ]

        for cmd in commands:
            subprocess.run(cmd, check=True)

        print("--- Succès ! Votre application est à jour. ---")

    except Exception as e:
        print(f"Une erreur est survenue : {e}")

if __name__ == "__main__":
    update_clients()
