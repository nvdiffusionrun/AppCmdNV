import { 
    appState, setCart, setSelectedClient, 
    ARTICLE_CODE_FIELD, STOCK_QUANTITY_FIELD, ARTICLE_DESIGNATION_FIELD, 
    CLIENT_CAT_TARIF_FIELD, CLIENT_NAME_FIELD, CLIENT_CITY_FIELD, 
    CLIENT_ADDRESS_FIELD, CLIENT_EMAIL_FIELD, CLIENT_CODE_FIELD, 
    TVA_RATE, PRICE_BASE, PRICE_MAP 
} from './state-v2.js';
import { getArticlePrice } from './utils-v2.js';
import { updateSelectedClientInfo } from './ui-v2.js';

export function removeFromCart(articleCode) {
    const newCart = appState.cart.filter(item => item.code !== articleCode);
    setCart(newCart);
}

export function addToCart(articleCode, quantity) {
    if (!appState.selectedClient) {
        alert("Veuillez sélectionner un client avant d'ajouter des articles au panier.");
        return false;
    }

    const article = appState.appData.articles.find(a => a[ARTICLE_CODE_FIELD] === articleCode);
    if (!article) return false;

    const qty = parseInt(quantity, 10) || 1;
    const currentStock = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0; 
    const isBackorder = currentStock <= 0;

    if (currentStock > 0 && qty > currentStock) {
        alert(`Attention: Impossible d'ajouter ${qty} unité(s). Le stock disponible pour ${article[ARTICLE_DESIGNATION_FIELD]} est de ${currentStock}.`);
        return false;
    }

    const priceHT = parseFloat(getArticlePrice(article, appState.selectedClient));
    const itemTotal = priceHT * qty;

    const newCart = [...appState.cart];
    const existingItemIndex = newCart.findIndex(item => item.code === articleCode);

    if (existingItemIndex > -1) {
        newCart[existingItemIndex].quantite = qty;
        newCart[existingItemIndex].total = itemTotal;
    } else {
        newCart.push({
            code: articleCode,
            designation: article[ARTICLE_DESIGNATION_FIELD],
            prixHT: priceHT,
            quantite: qty,
            total: itemTotal,
            isBackorder: isBackorder
        });
    }
    setCart(newCart);
    return true; // Return success
}

export function updateCartQuantity(articleCode, action) {
    const itemIndex = appState.cart.findIndex(item => item.code === articleCode);

    if (itemIndex > -1) {
        let newQuantity = appState.cart[itemIndex].quantite;
        const article = appState.appData.articles.find(a => a[ARTICLE_CODE_FIELD] === articleCode);
        const currentStock = parseInt(article[STOCK_QUANTITY_FIELD], 10) || 0;

        if (action === 'increase') {
            newQuantity += 1;
        } else if (action === 'decrease' && newQuantity > 1) {
            newQuantity -= 1;
        } else if (action === 'decrease' && newQuantity === 1) {
            removeFromCart(articleCode);
            return; // Important to return here as removeFromCart handles the state update
        } else {
            return; 
        }

        if (currentStock > 0 && newQuantity > currentStock) {
            alert(`Attention: Impossible d'aller au-delà de ${currentStock}. Veuillez modifier la quantité dans la liste des articles si vous souhaitez tenter une autre valeur.`);
            return;
        }
        
        const newCart = [...appState.cart];
        newCart[itemIndex].quantite = newQuantity;
        newCart[itemIndex].total = newCart[itemIndex].prixHT * newQuantity;
        setCart(newCart);
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
    body += `Client      : ${client[CLIENT_NAME_FIELD]} (Code: ${client[CLIENT_CODE_FIELD]})
`;
    body += `Adresse     : ${address} - ${city}\n`;
    body += `Email       : ${email}\n`;
    body += `Tarif appliqué: ${client[CLIENT_CAT_TARIF_FIELD]}
`;
    body += `LIVRAISON SOUHAITÉE POUR : ${formattedDeliveryDate.toUpperCase()}\n\n`;
    body += `${HEADER_LINE}DÉTAIL DES ARTICLES\n${ARTICLE_SEPARATOR}`;
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

    body += `${ARTICLE_SEPARATOR}\n`;
    body += "RÉCAPITULATIF DES MONTANTS\n";
    body += ARTICLE_SEPARATOR;
    const alignLength = 20; 
    body += `Total HT            : ${totalHT.toFixed(2).padStart(alignLength)} €\n`;
    body += `TVA (${tvaRatePercentage}%)             : ${tvaAmount.toFixed(2).padStart(alignLength)} €\n`;
    body += `TOTAL TTC           : ${totalTTC.toFixed(2).padStart(alignLength)} €\n`;
    body += `${HEADER_LINE}Merci pour votre commande.\n`;
    return body;
}

export function checkoutOrder() {
    if (appState.cart.length === 0) {
        alert("Le panier est vide.");
        return;
    }
    if (!appState.selectedClient) {
        alert("Veuillez sélectionner un client.");
        return;
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const formattedDate = now.toLocaleDateString('fr-FR');
    const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    const totalHT = appState.cart.reduce((sum, item) => sum + item.total, 0);
    const tvaAmount = totalHT * TVA_RATE;
    const totalTTC = totalHT + tvaAmount;

    const summary = generateMailBody(appState.selectedClient, appState.cart, totalHT, tvaAmount, totalTTC, formattedDateTime, appState.deliveryDate);
    const simpleSummary = `Commande pour ${appState.selectedClient[CLIENT_NAME_FIELD]} (${appState.selectedClient[CLIENT_CITY_FIELD]}).\nTotal TTC: ${totalTTC.toFixed(2)} €`;
    const confirmation = confirm(`--- Récapitulatif de la commande ---\n\n${simpleSummary}\n\nConfirmez-vous la commande et souhaitez l'envoyer par e-mail ?`);

    if (confirmation) {
        const body = encodeURIComponent(summary);
        const subject = encodeURIComponent(`CMD ${appState.selectedClient[CLIENT_NAME_FIELD]} [${formattedDate} ${formattedTime}]`); 
        const mailToLink = `mailto:nvdiffusion97419@gmail.com?subject=${subject}&body=${body}`;
        window.location.href = mailToLink;

        alert("Le client de messagerie a été ouvert. Veuillez vérifier que le récapitulatif est lisible avant d'envoyer l'e-mail. La commande va maintenant être réinitialisée.");

        // Reset filters and state
        document.getElementById('secteur-select').value = 'ALL';
        document.getElementById('famille-select').value = 'ALL';
        document.getElementById('fournisseur-select').value = 'ALL';
        document.getElementById('article-search-input').value = '';
        document.getElementById('default-qty-input').value = '1';
        document.getElementById('client-search-input').value = '';
        
        setCart([]);
        updateSelectedClientInfo(null); // This updates both state and UI
        
        // Hide mobile cart overlay if it exists
        const cartOverlay = document.getElementById('cart-overlay');
        if (cartOverlay) {
            cartOverlay.classList.add('hidden');
        }

        // Manually trigger UI updates
        filterAndDisplayArticles();
        displayCart();
    } else {
        alert("La commande n'a pas été envoyée. Vous pouvez continuer à ajouter des articles.");
    }
}
