Présentation du Projet : NV Diffusion
Cette application web permet la création et la gestion des commandes clients pour la société NV Diffusion. Conçue spécifiquement pour les commerciaux de terrain, elle permet de sélectionner un client, d'ajouter des articles au panier et de générer automatiquement un e-mail récapitulatif de commande.

L'application est développée en HTML5, CSS3 et JavaScript pur (Vanilla JS), sans bibliothèques ni frameworks externes. Les données sont extraites dynamiquement de trois fichiers CSV : AnnuaireClients.csv, BaseArticleTarifs.csv et StockRestant.csv.

Disponible à l'adresse : https://nvdiffusionrun.github.io/AppCmdNV/

Fonctionnalités Clés
👥 Gestion des Clients

Filtrage avancé : Recherche par secteur, par nom ou par code client.

Sélection rapide : La touche "Entrée" sélectionne automatiquement la première suggestion.

Fiche Infos : Accès aux coordonnées complètes (adresse, tel, email) avec boutons de copie d'adresse et lien direct vers Google Maps.

📦 Catalogue d'Articles

Filtres dynamiques : Tri par famille de produits et par Fournisseur.

Interface optimisée : Les contrôles de filtrage sont "stickys" (fixation en haut de page) sur desktop et mobile.

Quantité par défaut : Définition d'une quantité standard pour tous les articles de la liste via des boutons + / -.

Nuanciers interactifs : Sélection visuelle des nuances (MODA, GTC, Solfine, etc.) avec retour visuel immédiat (coche verte).

💰 Tarification et Stock

Prix Dynamiques : Calcul automatique basé sur la catégorie tarifaire du client (gestion spécifique pour la catégorie "ROBIN").

Suivi de Stock : Affichage de l'état des stocks et possibilité de commander des articles en reliquat (backorder).

🛒 Panier de Commande

Expérience Utilisateur : Animation visuelle lors de l'ajout d'un article et badge de décompte dans l'en--tête.

Visibilité constante : Panier fixe sur le côté en version bureau.

Optimisation Mobile : Bouton de panier flottant (FAB) repositionnable sur le coin inférieur gauche pour ne pas gêner la navigation.

📧 Validation et Livraison

Date de livraison : Sélection intelligente excluant les week-ends et les dates passées.

Génération d'E-mail : Création automatique d'un mail pré-rempli avec :

Objet formaté selon les standards NV Diffusion.

Corps détaillé (nombre d'articles, total TTC, date de livraison souhaitée).

Descriptions d'articles étendues pour éviter les troncatures.

Installation et Lancement
Ce projet est une application statique. Il ne nécessite aucune étape de compilation (build). Pour fonctionner correctement (notamment pour le chargement des fichiers CSV via fetch), les fichiers doivent être servis par un serveur local.

Lancer l'application avec Python

Bash
python3 -m http.server
Ensuite, ouvrez votre navigateur sur http://localhost:8000.

[!TIP]
Pour tester l'application sur mobile alors que l'appareil n'est pas sur le même réseau Wi-Fi, vous pouvez utiliser un outil comme ngrok pour créer un tunnel public temporaire.

Configuration des données

L'application requiert une structure de dossiers spécifique :

Les fichiers CSV doivent se trouver dans un répertoire nommé BaseAppCmd à la racine.

Fichiers requis : AnnuaireClients.csv, BaseArticleTarifs.csv (doit contenir une colonne "Fournisseur"), et StockRestant.csv.

Conventions de Développement
Architecture : Le code JavaScript suit un style procédural et utilise des variables globales pour la gestion de l'état (state management).

Organisation : Transition d'un script.js unique vers une structure modulaire dans le dossier src/.

Design : Approche "Mobile-First" pour garantir une utilisation fluide sur tablettes et smartphones.

Zéro Dépendance : Aucun framework (ni React, ni jQuery, etc.) pour une légèreté et une compatibilité maximales.

Journal des Modifications (Changelog)
Améliorations du Cœur & Initialisation

Correction des erreurs de chemins de fichiers CSV au démarrage.

Refactorisation modulaire du code JavaScript.

Parsing CSV plus robuste (gestion des différents formats de fins de ligne).

Ajout de messages d'erreurs explicites en cas de fichiers manquants.

Système de Nuanciers

Nouveau filtre "Couleurs" affichant une grille de sélection.

Automatisation du mapping entre nuances et codes articles pour les gammes majeures (ICARE, ILIGHT, etc.).

Synchronisation bidirectionnelle entre les clics sur nuances et le panier.

Corrections et UI

Correction du bug de génération d'e-mail (ReferenceError).

Réinitialisation complète de l'interface après chaque commande.

Amélioration de l'ergonomie des boutons de quantité sur mobile.
