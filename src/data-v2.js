import { 
    appState,
    CLIENT_FILENAME, ARTICLE_FILENAME, STOCK_FILENAME, NUANCE_DIR, SEPARATOR,
    ARTICLE_CODE_FIELD, ARTICLE_FAMILY_FIELD, ARTICLE_SUPPLIER_FIELD, 
    ARTICLE_DESIGNATION_FIELD, PRICE_BASE, PRICE_COIFFEUR_DOMICILE, 
    PRICE_PUBLIC, PRICE_ROBIN, STOCK_QUANTITY_FIELD, CLIENT_SECTEUR_FIELD, 
    CLIENT_CAT_TARIF_FIELD
} from './state-v2.js';

// =========================================================
// FONCTIONS DE LECTURE ET PARSING CSV
// =========================================================

async function loadCSV(filename) {
    console.log(`[loadCSV] Tentative de chargement du fichier: ${filename}`);
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            console.error(`[loadCSV] Erreur de chargement pour ${filename}: Statut ${response.status}`);
            throw new Error(`Le fichier ${filename} n'a pas pu être chargé (statut: ${response.status})`);
        }
        const csvText = await response.text();
        console.log(`[loadCSV] Fichier ${filename} chargé. Taille: ${csvText.length} caractères.`);
        
        // Déterminer le type de parsing basé sur le répertoire
        const simpleFilename = filename.split('/').pop();
        if (filename.startsWith(NUANCE_DIR)) {
            const parsedData = parseNuanceCSV(csvText, filename);
            console.log(`[loadCSV] Fichier ${filename} parsé (nuance).`);
            return parsedData;
        } else {
            const parsedData = parseCSV(csvText, SEPARATOR, filename);
            console.log(`[loadCSV] Fichier ${filename} parsé (standard). Nombre de lignes: ${parsedData.length}`);
            return parsedData;
        }
    } catch (error) {
        console.error(`[loadCSV] Problème critique lors du chargement ou du parsing de ${filename}:`, error);
        throw error;
    }
}

function parseCSV(csvText, separator, filename) {
    console.log(`[parseCSV] Début du parsing de ${filename}.`);
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
        console.warn(`[parseCSV] Le fichier ${filename} est vide.`);
        return [];
    }

    const cleanHeader = (header, index) => {
        let cleaned = header.trim().replace(/\r/g, ''); 
        const upperCleaned = cleaned.toUpperCase();
        
        const simpleFilename = filename.split('/').pop();

        if (simpleFilename === 'BaseArticleTarifs.csv') {
            if (index === 0) return ARTICLE_CODE_FIELD; 
            if (index === 1) return ARTICLE_FAMILY_FIELD;
            if (index === 2) return ARTICLE_SUPPLIER_FIELD;
            if (index === 3) return ARTICLE_DESIGNATION_FIELD;
            if (index === 4) return PRICE_BASE;

            if (upperCleaned.includes('|NPRO')) return PRICE_COIFFEUR_DOMICILE; 
            if (upperCleaned.includes('|TP')) return PRICE_PUBLIC;
            if (upperCleaned.includes('|ROBIN')) return PRICE_ROBIN;
        }

        if (simpleFilename === 'StockRestant.csv') {
            if (index === 0) return ARTICLE_CODE_FIELD;
            if (upperCleaned.includes('QUANTITEPHYSIQUE')) {
                 return STOCK_QUANTITY_FIELD;
            }
        }

        if (upperCleaned === 'SECTEUR') return CLIENT_SECTEUR_FIELD; 
        if (upperCleaned.includes('CATÉGORIE TARIFAIRE')) return CLIENT_CAT_TARIF_FIELD;

        return cleaned; 
    };

    const rawHeaders = lines[0].split(separator);
    const headers = rawHeaders.map(cleanHeader); 
    console.log(`[parseCSV] ${filename} - En-têtes nettoyés:`, headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator);
        const trimmedValues = values.map(value => value.trim().replace(/\r/g, ''));

        if (trimmedValues.length !== headers.length) {
            console.warn(`[parseCSV] ${filename} - Ligne ${i+1} ignorée: nombre de colonnes (${trimmedValues.length}) ne correspond pas aux en-têtes (${headers.length}). Contenu: "${lines[i]}"`);
            continue; 
        }

        const item = {};
        for (let j = 0; j < headers.length; j++) {
            item[headers[j]] = trimmedValues[j];
        }
        data.push(item);
    }
    console.log(`[parseCSV] Fin du parsing de ${filename}. ${data.length} lignes de données extraites.`);
    return data;
}

function parseNuanceCSV(csvText, filename) {
    console.log(`[parseNuanceCSV] Début du parsing de ${filename}.`);
    
    // Remove BOM (Byte Order Mark) if present, often found in CSVs from Excel
    csvText = csvText.replace(/^\uFEFF/, '');
    
    if (!csvText || csvText.trim() === '') {
        console.warn(`[parseNuanceCSV] Le fichier ${filename} est vide ou ne contient que des espaces/BOM.`);
        return [];
    }

    const lines = csvText.trim().split(/\r\n?|\n/);
    console.log(`[parseNuanceCSV] ${filename} - Nombre total de lignes (après split): ${lines.length}.`);

    if (lines.length <= 1) {
        console.warn(`[parseNuanceCSV] Le fichier ${filename} ne contient pas de données après l'en-tête.`);
        return [];
    }

    const headers = lines[0].split(SEPARATOR).map(h => h.trim().replace(/\r/g, ''));
    console.log(`[parseNuanceCSV] ${filename} - En-têtes détectés:`, headers);

    const nuances = [];
    for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine || rawLine.trim() === '') {
            console.log(`[parseNuanceCSV] ${filename} - Ligne ${i+1} ignorée (vide ou espaces).`);
            continue;
        }

        const values = rawLine.split(SEPARATOR).map(v => v.trim().replace(/\r/g, ''));
        
        const category = values[0] ? values[0].trim() : '';
        const shades = [];
        
        for (let j = 1; j < values.length; j++) {
            if (values[j]) { // Check if value is not undefined/null
                values[j].split(',').forEach(part => {
                    const trimmedPart = part.trim();
                    if (trimmedPart) {
                        const [shadeName, articleCode] = trimmedPart.toString().split(':');
                        shades.push({
                            name: shadeName,
                            code: articleCode
                        });
                    }
                });
            }
        }
        
        // Only add a nuance row if it has a category OR at least one shade
        if (category || shades.length > 0) {
            nuances.push({ category: category, shades: shades });
        } else {
            console.log(`[parseNuanceCSV] ${filename} - Ligne ${i+1} ignorée (pas de catégorie ni de nuances valides): "${rawLine}".`);
        }
    }
    console.log(`[parseNuanceCSV] Fin du parsing de ${filename}. ${nuances.length} catégories/lignes de nuances extraites.`);
    return nuances;
}


export async function loadAllData() {
    console.log("[loadAllData] Début du chargement de toutes les données.");

    const articles = await loadCSV(ARTICLE_FILENAME);
    const clients = await loadCSV(CLIENT_FILENAME);
    const rawStock = await loadCSV(STOCK_FILENAME);

    console.log("[loadAllData] Données brutes chargées. Articles:", articles ? articles.length : 0, "Clients:", clients ? clients.length : 0, "Stock:", rawStock ? rawStock.length : 0);

    const stockMap = new Map(rawStock.map(item => {
        let cleanedQty = item[STOCK_QUANTITY_FIELD] || '0';
        cleanedQty = cleanedQty.replace(',', '.').replace(/\s/g, ''); 
        return [item[ARTICLE_CODE_FIELD], cleanedQty]; 
    }));

    const mergedArticles = articles.map(article => {
        const stockQty = stockMap.get(article[ARTICLE_CODE_FIELD]) || '0'; 
        return { ...article, [STOCK_QUANTITY_FIELD]: stockQty };
    });

    const finalData = {
        articles: mergedArticles || [],
        clients: clients || [],
        stock: rawStock || []
    };
    console.log("[loadAllData] Fin du chargement de toutes les données. Final Data:", finalData);
    return finalData;
}

export async function loadNuancesData(brandName) {
    console.log(`[loadNuancesData] Chargement du nuancier pour la marque: ${brandName}`);
    const filename = `${NUANCE_DIR}${brandName}-${brandName}.csv`; // Convention de nommage
    try {
        const nuances = await loadCSV(filename);
        appState.nuancesData[brandName] = nuances; // Stocker dans l'état global
        console.log(`[loadNuancesData] Nuancier ${brandName} chargé et stocké.`, nuances);
        return nuances;
    } catch (error) {
        console.error(`[loadNuancesData] Erreur lors du chargement du nuancier pour ${brandName}:`, error);
        return null;
    }
}
