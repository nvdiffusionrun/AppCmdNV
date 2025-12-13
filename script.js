// =========================================================
// CONFIGURATION GLOBALE ET CONSTANTES
// =========================================================

const CLIENT_FILENAME = "BaseAppCmd/AnnuaireClients.csv"; 
const ARTICLE_FILENAME = "BaseAppCmd/BaseArticleTarifs.csv";
const STOCK_FILENAME = "BaseAppCmd/StockRestant.csv";

const SEPARATOR = ";";    
const TVA_RATE = 0.085; // 8.5% de TVA à la Réunion (taux réduit)

// Variables globales pour stocker les données et l'état
let appData = { articles: [], clients: [], stock: [] };
let filteredClients = []; 
let selectedClient = null; 
let cart = []; // Panier de commande [{ code, designation, prixHT, quantite, total }]
let deliveryDate = new Date(); // NOUVEAU: Date de livraison

// Noms des colonnes clients (normalisés)
const CLIENT_CODE_FIELD = 'Code'; 
const CLIENT_NAME_FIELD = 'Nom';
const CLIENT_SECTEUR_FIELD = 'Secteur'; 
const CLIENT_CAT_TARIF_FIELD = 'Catégorie tarifaire'; 
const CLIENT_ADDRESS_FIELD = 'Adresse'; 
const CLIENT_CITY_FIELD = 'Commune'; 
const CLIENT_EMAIL_FIELD = 'Email'; 

// Noms des colonnes articles (normalisés)
const ARTICLE_CODE_FIELD = 'CodeArticle';
const ARTICLE_FAMILY_FIELD = 'Famille'; 
const ARTICLE_DESIGNATION_FIELD = 'Designation'; 

// Noms des colonnes des prix que nous allons gérer
const PRICE_BASE = 'PrixHTPrincipal';
const PRICE_COIFFEUR_DOMICILE = 'PrixCoiffeurDomicile';
const PRICE_PUBLIC = 'PrixToutPublic';
const STOCK_QUANTITY_FIELD = 'StockQuantity'; // Nom normalisé pour la quantité en stock

// Mapping: Catégorie tarifaire client -> Colonne de prix article
const PRICE_MAP = {
    'HT': PRICE_BASE, 
    'NPRO': PRICE_COIFFEUR_DOMICILE,
    'TP': PRICE_PUBLIC
};


// =========================================================
// FONCTIONS DE LECTURE ET PARSING CSV
// =========================================================

async function loadCSV(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Erreur de chargement du fichier ${filename}: ${response.statusText}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText, SEPARATOR, filename);

    } catch (error) {
        console.error("Problème lors du chargement des données:", error);
        return null;
    }
}

function parseCSV(csvText, separator, filename) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    const cleanHeader = (header, index) => {
        let cleaned = header.trim().replace(/\r/g, ''); 
        const upperCleaned = cleaned.toUpperCase();
        
        const simpleFilename = filename.split('/').pop();

        if (simpleFilename === 'BaseArticleTarifs.csv') {
            if (index === 0) return ARTICLE_CODE_FIELD; 
            if (index === 1) return ARTICLE_FAMILY_FIELD;
            if (index === 2) return ARTICLE_DESIGNATION_FIELD;
            if (index === 3) return PRICE_BASE; 

            if (upperCleaned.includes('|NPRO')) return PRICE_COIFFEUR_DOMICILE; 
            if (upperCleaned.includes('|TP')) return PRICE_PUBLIC; 
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

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator);
        const trimmedValues = values.map(value => value.trim().replace(/\r/g, ''));

        if (trimmedValues.length !== headers.length) continue; 

        const item = {};
        for (let j = 0; j < headers.length; j++) {
            item[headers[j]] = trimmedValues[j];
        }
        data.push(item);
    }
    return data;
}

// =========================================================
// LOGIQUE DE DATE DE LIVRAISON
// =========================================================

/** Affiche la date de livraison formatée dans l'UI. */
function displayDeliveryDate() {
    const displayEl = document.getElementById('delivery-date-display');
    if (!displayEl) return;

    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    displayEl.textContent = deliveryDate.toLocaleDateString('fr-FR', options);
}

/** Calcule et définit la date de livraison initiale. */
function calculateAndSetInitialDeliveryDate() {
    let nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1); // Jour suivant

    // Si demain est un samedi (6), on reporte au mardi (+3 jours)
    if (nextDay.getDay() === 6) { 
        nextDay.setDate(nextDay.getDate() + 3);
    } 
    // Si demain est un dimanche (0), on reporte au lundi (+1 jour)
    else if (nextDay.getDay() === 0) { 
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    deliveryDate = nextDay;
    displayDeliveryDate();
}

/** Incrémente la date de livraison, en sautant les week-ends. */
function incrementDeliveryDate() {
    deliveryDate.setDate(deliveryDate.getDate() + 1);

    // Si on tombe sur un samedi, on saute au lundi (+2 jours)
    if (deliveryDate.getDay() === 6) {
        deliveryDate.setDate(deliveryDate.getDate() + 2);
    } 
    // Si on tombe sur un dimanche, on saute au lundi (+1 jour)
    else if (deliveryDate.getDay() === 0) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    displayDeliveryDate();
}


// =========================================================
// LOGIQUE DU PANIER ET DES PRIX
// =========================================================

function getArticlePrice(article, client) {
    if (!client || !client[CLIENT_CAT_TARIF_FIELD]) {
        const priceString = article[PRICE_BASE] ? article[PRICE_BASE].replace(',', '.').replace(/[^\d.]/g, '') : '0.00';
        return parseFloat(priceString) || '0.00'; 
    }

    const clientCategory = client[CLIENT_CAT_TARIF_FIELD].trim().toUpperCase();
    const priceColumn = PRICE_MAP[clientCategory];

    if (priceColumn && article[priceColumn] && article[priceColumn].trim() !== '') {
        const priceString = article[priceColumn].replace(',', '.').replace(/[^\d.]/g, '');
        return parseFloat(priceString) || '0.00';
    }

    const priceString = article[PRICE_BASE] ? article[PRICE_BASE].replace(',', '.').replace(/[^\d.]/g, '') : '0.00';
    return parseFloat(priceString) || '0.00';
}

function addToCart(articleCode, quantity) {
    if (!selectedClient) {
        alert("Veuillez sélectionner un client avant d'ajouter des articles au panier.");
        return;
    }

    const article = appData.articles.find(a => a[ARTICLE_CODE_FIELD] === articleCode);
    if (!article) return;

    const qty = parseInt(quantity, 10) || 1;
    const currentStock = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0; 
    const isBackorder = currentStock <= 0;

    if (currentStock > 0 && qty > currentStock) {
        alert(`Attention: Impossible d'ajouter ${qty} unité(s). Le stock disponible pour ${article[ARTICLE_DESIGNATION_FIELD]} est de ${currentStock}.`);
        return;
    }

    const priceHT = parseFloat(getArticlePrice(article, selectedClient));
    const itemTotal = priceHT * qty;

    const existingItemIndex = cart.findIndex(item => item.code === articleCode);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantite = qty;
        cart[existingItemIndex].total = itemTotal;
    } else {
        cart.push({
            code: articleCode,
            designation: article[ARTICLE_DESIGNATION_FIELD],
            prixHT: priceHT,
            quantite: qty,
            total: itemTotal,
            isBackorder: isBackorder
        });
    }

    displayCart();
}

function removeFromCart(articleCode) {
    cart = cart.filter(item => item.code !== articleCode);
    displayCart();
}

function updateCartQuantity(articleCode, action) {
    const itemIndex = cart.findIndex(item => item.code === articleCode);

    if (itemIndex > -1) {
        let newQuantity = cart[itemIndex].quantite;
        const article = appData.articles.find(a => a[ARTICLE_CODE_FIELD] === articleCode);
        const currentStock = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0;

        if (action === 'increase') {
            newQuantity += 1;
        } else if (action === 'decrease' && newQuantity > 1) {
            newQuantity -= 1;
        } else if (action === 'decrease' && newQuantity === 1) {
            removeFromCart(articleCode);
            return;
        } else {
            return; 
        }

        if (currentStock > 0 && newQuantity > currentStock) {
            alert(`Attention: Impossible d'aller au-delà de ${currentStock}. Veuillez modifier la quantité dans la liste des articles si vous souhaitez tenter une autre valeur.`);
            return;
        }

        cart[itemIndex].quantite = newQuantity;
        cart[itemIndex].total = cart[itemIndex].prixHT * newQuantity;
        displayCart();
    }
}

function generateMailBody(client, cart, totalHT, tvaAmount, totalTTC, formattedDateTime, deliveryDate) {
    const HEADER_LINE = "=========================================================================\n";
    const ARTICLE_SEPARATOR = "-------------------------------------------------------------------------\n";
    const DESIGNATION_LENGTH = 45;

    const totalArticlesInCart = cart.reduce((sum, item) => sum + item.quantite, 0);

    const address = client[CLIENT_ADDRESS_FIELD] || 'Non spécifiée';
    const city = client[CLIENT_CITY_FIELD] || 'Non spécifiée';
    const email = client[CLIENT_EMAIL_FIELD] || 'Non spécifié';
    const tvaRatePercentage = (TVA_RATE * 100).toFixed(1);
    const formattedDeliveryDate = deliveryDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    let body = `${totalArticlesInCart} article(s) pour ${totalTTC.toFixed(2)} € TTC\n`;
    body += `Date & Heure : ${formattedDateTime}\n`;
    body += `Client      : ${client[CLIENT_NAME_FIELD]} (Code: ${client[CLIENT_CODE_FIELD]})\n`;
    body += `Adresse     : ${address} - ${city}\n`;
    body += `Email       : ${email}\n`;
    body += `Tarif appliqué: ${client[CLIENT_CAT_TARIF_FIELD]}\n`;
    body += `LIVRAISON SOUHAITÉE POUR : ${formattedDeliveryDate.toUpperCase()}\n`;
    body += "\n";

    body += HEADER_LINE;
    body += "DÉTAIL DES ARTICLES\n";
    body += ARTICLE_SEPARATOR;
    body += "Qté | Code              | Désignation".padEnd(26 + DESIGNATION_LENGTH) + "| P.U. HT | Total HT\n";
    body += ARTICLE_SEPARATOR;

    cart.forEach(item => {
        const qte = String(item.quantite).padEnd(3);
        const code = String(item.code).padEnd(17);
        const backorderText = item.isBackorder ? " (Attente)" : "";
        const designation = (String(item.designation) + backorderText).substring(0, DESIGNATION_LENGTH).padEnd(DESIGNATION_LENGTH); 
        const prixHT = item.prixHT.toFixed(2).padEnd(7);
        const totalHT = item.total.toFixed(2).padEnd(8);

        body += `${qte} | ${code} | ${designation} | ${prixHT} € | ${totalHT} €\n`;
    });

    body += ARTICLE_SEPARATOR;
    body += "\n";
    body += "RÉCAPITULATIF DES MONTANTS\n";
    body += ARTICLE_SEPARATOR;

    const alignLength = 20; 

    body += `Total HT            : ${totalHT.toFixed(2).padStart(alignLength)} €\n`;
    body += `TVA (${tvaRatePercentage}%)             : ${tvaAmount.toFixed(2).padStart(alignLength)} €\n`;
    body += `TOTAL TTC           : ${totalTTC.toFixed(2).padStart(alignLength)} €\n`;

    body += HEADER_LINE;
    body += "Merci pour votre commande.\n";

    return body;
}

function displayCart() {
    const container = document.getElementById('cart-container');
    const totalInfo = document.getElementById('cart-total-info');
    const clientName = document.getElementById('client-cart-name');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartItemCount = document.getElementById('cart-item-count');

    const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0);
    cartItemCount.textContent = totalItems;

    clientName.textContent = selectedClient ? selectedClient[CLIENT_NAME_FIELD] : "Aucun client sélectionné";

    if (cart.length === 0) {
        container.innerHTML = `<p>Le panier est vide.</p>`;
        totalInfo.innerHTML = '';
        checkoutBtn.disabled = true;
        return;
    }

    let cartHTML = `
        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>PU HT</th>
                    <th>Quantité</th>
                    <th>Total HT</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalHT = 0;

    cart.forEach(item => {
        totalHT += item.total;
        const rowClass = item.isBackorder ? 'class="cart-backorder"' : '';
        const backorderLabel = item.isBackorder ? '<span class="backorder-label"> (En attente)</span>' : '';

        cartHTML += `
            <tr ${rowClass}>
                <td>${item.code}</td>
                <td>${item.designation}${backorderLabel}</td>
                <td>${item.prixHT.toFixed(2)} €</td>
                <td>
                    <div class="cart-qty-control">
                        <button data-code="${item.code}" data-action="decrease" class="qty-control-btn">-</button>
                        <span class="cart-qty-value">${item.quantite}</span>
                        <button data-code="${item.code}" data-action="increase" class="qty-control-btn">+</button>
                    </div>
                </td>
                <td>${item.total.toFixed(2)} €</td>
                <td><button data-code="${item.code}" class="remove-from-cart-btn">Retirer</button></td>
            </tr>
        `;
    });

    cartHTML += '</tbody></table>';
    container.innerHTML = cartHTML;

    const tvaAmount = totalHT * TVA_RATE;
    const totalTTC = totalHT + tvaAmount;

    totalInfo.innerHTML = `
        <div class="cart-summary">
            <p>Total HT du panier : <strong>${totalHT.toFixed(2)} €</strong></p>
            <p>TVA (${(TVA_RATE * 100).toFixed(1)}%) : <strong>${tvaAmount.toFixed(2)} €</strong></p>
            <h3>Total TTC : <strong>${totalTTC.toFixed(2)} €</strong></h3>
        </div>
    `;

    checkoutBtn.disabled = false;

    document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            removeFromCart(e.target.dataset.code);
        });
    });

    document.querySelectorAll('.qty-control-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const code = e.target.dataset.code;
            const action = e.target.dataset.action;
            updateCartQuantity(code, action);
        });
    });
}

function checkoutOrder() {
    if (cart.length === 0) {
        alert("Le panier est vide.");
        return;
    }
    if (!selectedClient) {
        alert("Veuillez sélectionner un client.");
        return;
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    });
    const formattedDate = now.toLocaleDateString('fr-FR');
    const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const totalHT = cart.reduce((sum, item) => sum + item.total, 0);
    const tvaAmount = totalHT * TVA_RATE;
    const totalTTC = totalHT + tvaAmount;

    const summary = generateMailBody(selectedClient, cart, totalHT, tvaAmount, totalTTC, formattedDateTime, deliveryDate);

    const simpleSummary = `Commande pour ${selectedClient[CLIENT_NAME_FIELD]} (${selectedClient[CLIENT_CITY_FIELD]}).\nTotal TTC: ${totalTTC.toFixed(2)} €`;
    const confirmation = confirm(
        `--- Récapitulatif de la commande ---\n\n${simpleSummary}\n` +
        `\n\nConfirmez-vous la commande et souhaitez l'envoyer par e-mail ?`
    );

    if (confirmation) {
        const body = encodeURIComponent(summary);
        const subject = encodeURIComponent(`CMD ${selectedClient[CLIENT_NAME_FIELD]} [${formattedDate} ${formattedTime}]`); 

        const mailToLink = `mailto:nvdiffusion97419@gmail.com?subject=${subject}&body=${body}`;

        window.location.href = mailToLink;

        alert("Le client de messagerie a été ouvert. Veuillez vérifier que le récapitulatif est lisible avant d'envoyer l'e-mail. La commande va maintenant être réinitialisée.");

        cart = [];
        document.getElementById('client-search-input').value = '';
        updateSelectedClientInfo(null);
        filterAndDisplayArticles(null, null); 
        displayCart();
    } else {
        alert("La commande n'a pas été envoyée. Vous pouvez continuer à ajouter des articles.");
    }
}

// =========================================================
// FILTRES ET AFFICHAGE
// =========================================================

function setupFilters(data, fieldName, selectId, filterFunction) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="ALL">Toutes les ${fieldName}</option>`;
    const uniqueValues = [...new Set(data.map(item => item[fieldName]).filter(val => val && val.trim() !== ''))].sort();
    uniqueValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
    select.removeEventListener('change', filterFunction);
    select.addEventListener('change', (e) => filterFunction(e.target.value));
}

function filterClientsBySector(sector) {
    if (sector === 'ALL') {
        filteredClients = appData.clients;
    } else {
        filteredClients = appData.clients.filter(client => client[CLIENT_SECTEUR_FIELD] === sector);
    }
    document.getElementById('client-search-input').value = '';
    if (selectedClient && !filteredClients.some(c => c[CLIENT_CODE_FIELD] === selectedClient[CLIENT_CODE_FIELD])) {
        updateSelectedClientInfo(null);
    } else if (selectedClient) {
        updateSelectedClientInfo(selectedClient);
    } else {
        updateSelectedClientInfo(null);
    }
}

function filterAndDisplayArticles(family = null, query = null) {
    const currentFamily = family || document.getElementById('famille-select').value;
    const currentQuery = (query || document.getElementById('article-search-input').value).toUpperCase();
    let articlesToDisplay = appData.articles;

    if (currentFamily !== 'ALL') {
        articlesToDisplay = articlesToDisplay.filter(article => article[ARTICLE_FAMILY_FIELD] === currentFamily);
    }

    if (currentQuery) {
        articlesToDisplay = articlesToDisplay.filter(article => {
            const codeText = article[ARTICLE_CODE_FIELD] || '';
            const designationText = article[ARTICLE_DESIGNATION_FIELD] || '';
            const codeMatch = codeText.toUpperCase().includes(currentQuery);
            const designationMatch = designationText.toUpperCase().includes(currentQuery);
            return codeMatch || designationMatch;
        });
    }

    const container = document.getElementById('articles-container');
    if (articlesToDisplay.length === 0) {
        container.innerHTML = `<p>Aucun article trouvé pour les critères sélectionnés.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Prix HT</th>
                    <th>Stock</th> 
                    <th>Qté</th>
                    <th>Action</th>
                </tr>
            </thead>
        <tbody>
    `;
    articlesToDisplay.forEach(article => {
        const prixDynamique = getArticlePrice(article, selectedClient);
        const stockQty = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0;
        const isBackorder = stockQty <= 0;
        const rowClass = isBackorder ? 'class="low-stock"' : ''; 
        const stockText = isBackorder ? `<span style="color: red;">Rupture / En Attente</span>` : stockQty;
        const buttonText = isBackorder ? 'Mettre en attente' : 'Ajouter';
        html += `
            <tr ${rowClass}>
                <td>${article[ARTICLE_CODE_FIELD]}</td>
                <td>${article[ARTICLE_DESIGNATION_FIELD]}</td>
                <td>${parseFloat(prixDynamique).toFixed(2)} €</td>
                <td>${stockText}</td>
                <td><input type="number" value="1" min="1" class="article-qty-input" id="qty-${article[ARTICLE_CODE_FIELD]}"></td>
                <td><button data-code="${article[ARTICLE_CODE_FIELD]}" class="add-to-cart-btn">${buttonText}</button></td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    setupArticleListeners(); 
}

// =========================================================
// LOGIQUE D'AUTOCOMPLÉTION & ÉVÉNEMENTS
// =========================================================

function updateSelectedClientInfo(client) {
     selectedClient = client; 
     const clientInfoElement = document.getElementById('selected-client-info');
     if (client) {
         const clientCommune = client[CLIENT_CITY_FIELD] ? ` - ${client[CLIENT_CITY_FIELD]}` : '';
         clientInfoElement.textContent = `${client[CLIENT_NAME_FIELD]}${clientCommune} (Code: ${client[CLIENT_CODE_FIELD]}, Catégorie: ${client[CLIENT_CAT_TARIF_FIELD]})`;
     } else {
         clientInfoElement.textContent = "Aucun";
     }
     if (!client) {
         cart = [];
     } else {
         cart.forEach(item => {
             const articleBase = appData.articles.find(a => a[ARTICLE_CODE_FIELD] === item.code);
             if (articleBase) {
                 const newPriceHT = parseFloat(getArticlePrice(articleBase, selectedClient));
                 item.prixHT = newPriceHT;
                 item.total = newPriceHT * item.quantite;
             }
         });
     }
     filterAndDisplayArticles(null, null); 
     displayCart();
}

function setupClientSearch() {
    const input = document.getElementById('client-search-input');
    const suggestionsContainer = document.getElementById('client-suggestions');
    input.addEventListener('input', function(e) {
        const value = this.value.toUpperCase();
        suggestionsContainer.innerHTML = ""; 
        if (!value) return false;
        const matches = filteredClients.filter(client => {
            if (!client || !client[CLIENT_NAME_FIELD] || !client[CLIENT_CODE_FIELD]) return false; 
            const clientName = client[CLIENT_NAME_FIELD].toUpperCase();
            const clientCode = client[CLIENT_CODE_FIELD].toUpperCase();
            return clientName.includes(value) || clientCode.includes(value);
        }).slice(0, 10); 
        matches.forEach(client => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            const clientCommune = client[CLIENT_CITY_FIELD] ? ` - ${client[CLIENT_CITY_FIELD]}` : '';
            item.innerHTML = `<strong>${client[CLIENT_NAME_FIELD]}</strong> (${client[CLIENT_CODE_FIELD]}${clientCommune})`;
            item.addEventListener('click', function(e) {
                input.value = client[CLIENT_NAME_FIELD];
                suggestionsContainer.innerHTML = "";
                updateSelectedClientInfo(client); 
            });
            suggestionsContainer.appendChild(item);
        });
    });
    document.addEventListener("click", function (e) {
        if (!e.target.matches('#client-search-input')) {
            suggestionsContainer.innerHTML = "";
        }
    });
}

function setupArticleListeners() {
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const articleCode = e.target.dataset.code;
            const qtyInput = document.getElementById(`qty-${articleCode}`);
            const quantity = qtyInput ? qtyInput.value : 1; 
            addToCart(articleCode, quantity);
        });
    });
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutOrder);
    }
}

function setupArticleSearch() {
    const input = document.getElementById('article-search-input');
    input.addEventListener('input', function(e) {
        filterAndDisplayArticles(null, this.value); 
    });
}

function adjustStickyHeader() {
    const controls = document.getElementById('article-controls');
    if (!controls) return;
    const controlsHeight = controls.offsetHeight;
    const headers = document.querySelectorAll('#articles-container th');
    headers.forEach(th => {
        th.style.top = `${controlsHeight}px`;
    });
}

// =========================================================
// INITIALISATION DE L'APPLICATION
// =========================================================

async function initApp() {
    console.log("Chargement des bases de données...");

    const articles = await loadCSV(ARTICLE_FILENAME);
    const clients = await loadCSV(CLIENT_FILENAME);
    const rawStock = await loadCSV(STOCK_FILENAME);

    const stockMap = new Map(rawStock.map(item => {
        let cleanedQty = item[STOCK_QUANTITY_FIELD] || '0';
        cleanedQty = cleanedQty.replace(',', '.').replace(/\s/g, ''); 
        return [item[ARTICLE_CODE_FIELD], cleanedQty]; 
    }));
    const mergedArticles = articles.map(article => {
        const stockQty = stockMap.get(article[ARTICLE_CODE_FIELD]) || '0'; 
        return { ...article, [STOCK_QUANTITY_FIELD]: stockQty };
    });

    appData = {
        articles: mergedArticles || [],
        clients: clients || [],
        stock: rawStock || []
    };

    filteredClients = appData.clients;

    if (appData.clients.length > 0) {
        setupFilters(appData.clients, CLIENT_SECTEUR_FIELD, 'secteur-select', filterClientsBySector);
        setupClientSearch(); 
        filterClientsBySector('ALL'); 
    }

    if (appData.articles.length > 0) {
        setupFilters(appData.articles, ARTICLE_FAMILY_FIELD, 'famille-select', (family) => filterAndDisplayArticles(family, null));
        setupArticleSearch();
        filterAndDisplayArticles(null, null); 
    }

    if (appData.articles.length === 0) {
        document.getElementById('articles-container').innerHTML = `<p>Attention: Aucune donnée d'article n'a été chargée. Vérifiez l'encodage de ${ARTICLE_FILENAME}.</p>`;
    }

    displayCart();
    
    // Logique de date
    calculateAndSetInitialDeliveryDate();
    document.getElementById('increment-date-btn').addEventListener('click', incrementDeliveryDate);

    // Ajustement du header sticky
    adjustStickyHeader();
    window.addEventListener('resize', adjustStickyHeader);
}

initApp();