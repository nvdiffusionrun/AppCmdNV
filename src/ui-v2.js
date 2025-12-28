import { 
    appState, setSelectedClient,
    CLIENT_NAME_FIELD, CLIENT_CITY_FIELD, CLIENT_CODE_FIELD, CLIENT_CAT_TARIF_FIELD,
    ARTICLE_CODE_FIELD, ARTICLE_FAMILY_FIELD, ARTICLE_SUPPLIER_FIELD, ARTICLE_DESIGNATION_FIELD,
    STOCK_QUANTITY_FIELD, TVA_RATE, PRICE_BASE, PRICE_MAP
} from './state-v2.js';
import { getArticlePrice } from './utils-v2.js';
import { setupArticleListeners, setupNuanceGridListeners } from './listeners-v2.js';

export function displayDeliveryDate() {
    const displayEl = document.getElementById('delivery-date-display');
    if (!displayEl) return;

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    let formattedDate = appState.deliveryDate.toLocaleDateString('fr-FR', options);
    // Supprimer le point final que certains navigateurs ajoutent pour les abréviations
    if (formattedDate.endsWith('.')) {
        formattedDate = formattedDate.slice(0, -1);
    }
    displayEl.textContent = formattedDate;
}

export function animateCartIcon() {
    const elementsToAnimate = [
        document.getElementById('cart-status'),
        document.getElementById('fab-cart-btn')
    ];

    elementsToAnimate.forEach(el => {
        if (el) {
            el.classList.add('cart-pulse-animation');
            el.addEventListener('animationend', () => {
                el.classList.remove('cart-pulse-animation');
            }, { once: true });
        }
    });
}

function updateCartItemCount() {
    const totalItems = appState.cart.reduce((sum, item) => sum + item.quantite, 0);
    const headerCount = document.getElementById('cart-item-count');
    const fabCount = document.getElementById('fab-cart-item-count');
    if (headerCount) headerCount.textContent = totalItems;
    if (fabCount) fabCount.textContent = totalItems;
}

export function displayCart() {
    const container = document.getElementById('cart-container');
    const totalInfo = document.getElementById('cart-total-info');
    const clientName = document.getElementById('client-cart-name');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    updateCartItemCount();
    console.log('[displayCart] appState.selectedClient:', appState.selectedClient);

    clientName.textContent = appState.selectedClient ? appState.selectedClient[CLIENT_NAME_FIELD] : "Aucun client sélectionné";

    if (appState.cart.length === 0) {
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
    appState.cart.forEach(item => {
        totalHT += item.total;
        const rowClass = item.isBackorder ? 'class="cart-backorder"' : '';
        const backorderLabel = item.isBackorder ? '<span class="backorder-label"> (En attente)</span>' : '';

        cartHTML += `
            <tr ${rowClass}>
                <td data-label="Code">${item.code}</td>
                <td data-label="Désignation">${item.designation}${backorderLabel}</td>
                <td data-label="PU HT">${item.prixHT.toFixed(2)} €</td>
                <td data-label="Quantité">
                    <div class="cart-qty-control">
                        <button data-code="${item.code}" data-action="decrease" class="qty-control-btn">-</button>
                        <span class="cart-qty-value">${item.quantite}</span>
                        <button data-code="${item.code}" data-action="increase" class="qty-control-btn">+</button>
                    </div>
                </td>
                <td data-label="Total HT">${item.total.toFixed(2)} €</td>
                <td data-label="Action"><button data-code="${item.code}" class="remove-from-cart-btn">Retirer</button></td>
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
}

export function filterAndDisplayArticles() {
    console.log('[filterAndDisplayArticles] Début du filtrage et affichage des articles.');
    const currentFamily = document.getElementById('famille-select').value;
    const currentSupplier = document.getElementById('fournisseur-select').value;
    const currentQuery = document.getElementById('article-search-input').value.toUpperCase();
    const defaultQty = document.getElementById('default-qty-input').value;

    console.log(`[filterAndDisplayArticles] Filtres actuels: Famille=${currentFamily}, Fournisseur=${currentSupplier}, Recherche=${currentQuery}, Qté par défaut=${defaultQty}`);

    let articlesToDisplay = appState.appData.articles;

    if (currentFamily !== 'ALL') {
        articlesToDisplay = articlesToDisplay.filter(article => article[ARTICLE_FAMILY_FIELD] === currentFamily);
    }

    if (currentSupplier !== 'ALL') {
        articlesToDisplay = articlesToDisplay.filter(article => article[ARTICLE_SUPPLIER_FIELD] === currentSupplier);
    }

    if (currentQuery) {
        const keywords = currentQuery.split(' ').filter(k => k); // Sépare la recherche en mots-clés
        articlesToDisplay = articlesToDisplay.filter(article => {
            const codeText = (article[ARTICLE_CODE_FIELD] || '').toUpperCase();
            const designationText = (article[ARTICLE_DESIGNATION_FIELD] || '').toUpperCase();
            
            // Vérifie que TOUS les mots-clés sont présents soit dans le code, soit dans la désignation
            return keywords.every(keyword => {
                return codeText.includes(keyword) || designationText.includes(keyword);
            });
        });
    }

    const container = document.getElementById('articles-container');
    if (articlesToDisplay.length === 0) {
        container.innerHTML = `<p>Aucun article trouvé pour les critères sélectionnés.</p>`;
        console.log('[filterAndDisplayArticles] Aucun article à afficher après filtrage.');
        return;
    }

    console.log(`[filterAndDisplayArticles] Affichage de ${articlesToDisplay.length} articles.`);

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
        const prixDynamique = getArticlePrice(article, appState.selectedClient);
        const stockQty = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0;
        const isBackorder = stockQty <= 0;
        const rowClass = isBackorder ? 'class="low-stock"' : ''; 
        const stockText = isBackorder ? `<span style="color: red;">Rupture / En Attente</span>` : stockQty;
        const buttonText = isBackorder ? 'Mettre en attente' : 'Ajouter';
        html += `
            <tr ${rowClass}>
                <td data-label="Code">${article[ARTICLE_CODE_FIELD]}</td>
                <td data-label="Désignation">${article[ARTICLE_DESIGNATION_FIELD]}</td>
                <td data-label="Prix HT">${parseFloat(prixDynamique).toFixed(2)} €</td>
                <td data-label="Stock">${stockText}</td>
                <td data-label="Qté"><input type="number" value="${defaultQty}" min="1" class="article-qty-input" id="qty-${article[ARTICLE_CODE_FIELD]}"></td>
                <td data-label="Action"><button data-code="${article[ARTICLE_CODE_FIELD]}" class="add-to-cart-btn">${buttonText}</button></td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    setupArticleListeners(); // Ré-attache les écouteurs après la mise à jour du DOM
}

export function displayNuanceGrid(brand, nuancesData) {
    const mainNuanceContainer = document.getElementById('main-nuance-grid-container'); // Nouveau conteneur principal
    if (!mainNuanceContainer) {
        console.error("Conteneur principal pour la grille de nuances non trouvé.");
        return;
    }

    // Effacer le contenu précédent
    mainNuanceContainer.innerHTML = '';
    mainNuanceContainer.style.display = 'block'; // Afficher le conteneur principal

    let html = `<h3>Nuances ${brand}</h3>`;
    html += `<button id="back-to-brands-btn">Retour aux Marques</button>`; // Bouton de retour

    if (!nuancesData || nuancesData.length === 0) {
        html += `<p>Aucune nuance trouvée pour ${brand}.</p>`;
        mainNuanceContainer.innerHTML = html;
        return;
    }

    nuancesData.forEach(row => {
        if (row.category) {
            html += `<h4>${row.category}</h4>`;
        }
        html += `<div class="nuance-row">`;
        row.shades.forEach(shadeObj => {
            // If shade has a mapped code, the button is active. Otherwise, it's disabled.
            if (shadeObj.code) {
                const isInCart = appState.cart.some(item => item.code === shadeObj.code);
                const selectedClass = isInCart ? ' selected-nuance' : '';
                html += `<button class="nuance-btn${selectedClass}" data-code="${shadeObj.code}">${shadeObj.name}</button>`;
            } else {
                html += `<button class="nuance-btn disabled" disabled title="Code article non défini">${shadeObj.name}</button>`;
            }
        });
        html += `</div>`;
    });

    mainNuanceContainer.innerHTML = html;
}


export function updateSelectedClientInfo(client) {
    console.log('[updateSelectedClientInfo] Client reçu:', client);
    setSelectedClient(client);
    console.log('[updateSelectedClientInfo] appState.selectedClient après mise à jour:', appState.selectedClient);
    const clientInfoElement = document.getElementById('selected-client-info');
     if (client) {
         const clientCommune = client[CLIENT_CITY_FIELD] ? ` - ${client[CLIENT_CITY_FIELD]}` : '';
         clientInfoElement.textContent = `${client[CLIENT_NAME_FIELD]}${clientCommune} (Code: ${client[CLIENT_CODE_FIELD]}, Catégorie: ${client[CLIENT_CAT_TARIF_FIELD]})`;
     } else {
         clientInfoElement.textContent = "Aucun";
     }
     
     filterAndDisplayArticles(); 
     displayCart();
}