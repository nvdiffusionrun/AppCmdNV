// =========================================================
// CONSTANTES DE CONFIGURATION
// =========================================================

export const CLIENT_FILENAME = "BaseAppCmd/AnnuaireClients.csv"; 
export const ARTICLE_FILENAME = "BaseAppCmd/BaseArticleTarifs.csv";
export const STOCK_FILENAME = "BaseAppCmd/StockRestant.csv";
export const NUANCE_DIR = 'Nuanciers/'; // NOUVEAU

export const SEPARATOR = ";";    
export const TVA_RATE = 0.085; // 8.5% de TVA à la Réunion (taux réduit)

// Noms des colonnes clients (normalisés)
export const CLIENT_CODE_FIELD = 'Code'; 
export const CLIENT_NAME_FIELD = 'Nom';
export const CLIENT_SECTEUR_FIELD = 'Secteur'; 
export const CLIENT_CAT_TARIF_FIELD = 'Catégorie tarifaire'; 
export const CLIENT_ADDRESS_FIELD = 'Adresse'; 
export const CLIENT_CITY_FIELD = 'Commune'; 
export const CLIENT_EMAIL_FIELD = 'Email'; 

// Noms des colonnes articles (normalisés)
export const ARTICLE_CODE_FIELD = 'CodeArticle';
export const ARTICLE_FAMILY_FIELD = 'Famille'; 
export const ARTICLE_SUPPLIER_FIELD = 'Fournisseur';
export const ARTICLE_DESIGNATION_FIELD = 'Designation'; 

// Noms des colonnes des prix que nous allons gérer
export const PRICE_BASE = 'PrixHTPrincipal';
export const PRICE_COIFFEUR_DOMICILE = 'PrixCoiffeurDomicile';
export const PRICE_PUBLIC = 'PrixToutPublic';
export const PRICE_ROBIN = 'PrixRobin';
export const STOCK_QUANTITY_FIELD = 'StockQuantity';

// Mapping: Catégorie tarifaire client -> Colonne de prix article
export const PRICE_MAP = {
    'HT': PRICE_BASE, 
    'NPRO': PRICE_COIFFEUR_DOMICILE,
    'TP': PRICE_PUBLIC,
    'ROBIN': PRICE_ROBIN
};

// =========================================================
// ÉTAT DE L'APPLICATION
// =========================================================

// Centralisation de l'état pour une meilleure gestion
export const appState = {
    appData: { articles: [], clients: [], stock: [] },
    filteredClients: [],
    selectedClient: null,
    cart: [],
    deliveryDate: new Date(),
    initialDeliveryDate: new Date(),
    nuancesData: {}, // NOUVEAU: Pour stocker les données des nuanciers
};

// Fonctions pour muter l'état (mutateurs)
// Cela permet de s'assurer que l'état est modifié de manière prévisible.
export function setAppData(data) {
    appState.appData = data;
}

export function setFilteredClients(clients) {
    appState.filteredClients = clients;
}

export function setSelectedClient(client) {
    appState.selectedClient = client;
}

export function setCart(newCart) {
    appState.cart = newCart;
}

export function setDeliveryDate(newDate) {
    appState.deliveryDate = newDate;
}

export function setInitialDeliveryDate(newDate) {
    appState.initialDeliveryDate = newDate;
}
