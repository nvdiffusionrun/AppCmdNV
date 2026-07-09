import { 
    appState,
    CLIENT_FILENAME, ARTICLE_FILENAME, STOCK_FILENAME, NUANCE_DIR, KERAGOLD_FILENAME, SEPARATOR,
    ARTICLE_CODE_FIELD, ARTICLE_FAMILY_FIELD, ARTICLE_SUPPLIER_FIELD, 
    ARTICLE_DESIGNATION_FIELD, PRICE_BASE, PRICE_COIFFEUR_DOMICILE, 
    PRICE_PUBLIC, PRICE_ROBIN, STOCK_QUANTITY_FIELD, CLIENT_SECTEUR_FIELD, 
    CLIENT_CAT_TARIF_FIELD
} from './state-v2.js';

// =========================================================
// FONCTIONS DE LECTURE ET PARSING CSV
// =========================================================

async function loadCSV(filename, separator = SEPARATOR) {
    console.log(`[loadCSV] Tentative de chargement du fichier: ${filename}`);
    try {
        // Ajout d'un paramètre "cache-busting" uniquement pour le fichier de stock
        // pour forcer le rechargement à chaque fois et éviter les problèmes de cache sur mobile.
        const url = `${filename}?v=${new Date().getTime()}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[loadCSV] Erreur de chargement pour ${url}: Statut ${response.status}`);
            throw new Error(`Le fichier ${url} n'a pas pu être chargé (statut: ${response.status})`);
        }
        const csvText = await response.text();
        console.log(`[loadCSV] Fichier ${url} chargé. Taille: ${csvText.length} caractères.`);
        
        // Déterminer le type de parsing basé sur le répertoire
        const simpleFilename = filename.split('/').pop();
        if (filename.startsWith(NUANCE_DIR) && simpleFilename !== 'Keragold.csv') {
            const parsedData = parseNuanceCSV(csvText, filename);
            console.log(`[loadCSV] Fichier ${filename} parsé (nuance).`);
            return parsedData;
        } else {
            const parsedData = parseCSV(csvText, separator, filename);
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
    
    // Remove BOM if present
    csvText = csvText.replace(/^\uFEFF/, '');
    
    const result = [];
    let currentLine = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Double quote inside quoted field
                currentValue += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            // End of field
            currentLine.push(currentValue.trim());
            currentValue = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // End of line
            if (currentValue || currentLine.length > 0) {
                currentLine.push(currentValue.trim());
                result.push(currentLine);
            }
            currentLine = [];
            currentValue = '';
            // Handle \r\n
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
        } else {
            currentValue += char;
        }
    }
    
    // Push last line if exists
    if (currentValue || currentLine.length > 0) {
        currentLine.push(currentValue.trim());
        result.push(currentLine);
    }

    if (result.length === 0) {
        console.warn(`[parseCSV] Le fichier ${filename} est vide.`);
        return [];
    }

    const rawHeaders = result[0];
    
    const cleanHeader = (header, index) => {
        let cleaned = header.trim();
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
            if (upperCleaned.includes('QUANTITEPHYSIQUE') || upperCleaned === 'STOCK') {
                 return STOCK_QUANTITY_FIELD;
            }
        }

        if (upperCleaned === 'SECTEUR') return CLIENT_SECTEUR_FIELD; 
        if (upperCleaned.includes('CATÉGORIE TARIFAIRE')) return CLIENT_CAT_TARIF_FIELD;

        return cleaned; 
    };

    const headers = rawHeaders.map(cleanHeader);
    console.log(`[parseCSV] ${filename} - En-têtes nettoyés:`, headers);

    const data = [];
    for (let i = 1; i < result.length; i++) {
        const row = result[i];
        if (row.length !== headers.length) {
            // Filter out empty rows or mismatched columns
            if (row.length === 1 && row[0] === '') continue;
            console.warn(`[parseCSV] ${filename} - Ligne ${i+1} ignorée: colonnes=${row.length} vs headers=${headers.length}`);
            continue;
        }
        const item = {};
        for (let j = 0; j < headers.length; j++) {
            item[headers[j]] = row[j];
        }
        data.push(item);
    }
    
    console.log(`[parseCSV] Fin du parsing de ${filename}. ${data.length} lignes extraites.`);
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

export async function loadKeragoldData() {
    console.log(`[loadKeragoldData] Chargement des données Keragold depuis: ${KERAGOLD_FILENAME}`);
    try {
        const data = await loadCSV(KERAGOLD_FILENAME, ',');
        
        // Group by "Gamme"
        const groupedData = data.reduce((groups, item) => {
            const gamme = item['Gamme'] || 'Autre';
            const code = item['Code Article Machine'];
            
            // Si l'article n'existe pas dans la base principale, on l'ajoute
            // pour permettre l'ajout au panier.
            const existingArticle = appState.appData.articles.find(a => a[ARTICLE_CODE_FIELD] === code);
            if (!existingArticle && code) {
                const newArticle = {
                    [ARTICLE_CODE_FIELD]: code,
                    [ARTICLE_DESIGNATION_FIELD]: `${item['Produit']} ${item['Contenance']}`,
                    [ARTICLE_FAMILY_FIELD]: 'KERAGOLD',
                    [ARTICLE_SUPPLIER_FIELD]: 'KERAGOLD',
                    [PRICE_BASE]: item['Prix TTC'].replace('€', '').replace(',', '.').trim(), // On utilise le TTC du CSV comme base HT pour simplifier si absent
                    [STOCK_QUANTITY_FIELD]: '0' // Par défaut en rupture si pas dans StockRestant.csv
                };
                appState.appData.articles.push(newArticle);
            }

            if (!groups[gamme]) {
                groups[gamme] = {
                    name: gamme,
                    type: item['Type/Nom de Gamme'] || '',
                    benefits: item['Bénéfices'] || '',
                    products: []
                };
            }
            groups[gamme].products.push({
                name: item['Produit'],
                contenance: item['Contenance'],
                code: item['Code Article Machine'],
                priceTTC: item['Prix TTC']
            });
            return groups;
        }, {});
        
        appState.keragoldData = Object.values(groupedData);
        console.log(`[loadKeragoldData] Données Keragold chargées et groupées.`, appState.keragoldData);
        return appState.keragoldData;
    } catch (error) {
        console.error(`[loadKeragoldData] Erreur lors du chargement des données Keragold:`, error);
        return null;
    }
}
