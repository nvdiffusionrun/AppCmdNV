import { appState, setFilteredClients, setSelectedClient, CLIENT_ADDRESS_FIELD, CLIENT_POSTAL_CODE_FIELD, CLIENT_CITY_FIELD, setCurrentNuanceBrand } from './state-v2.js';
import { filterAndDisplayArticles, updateSelectedClientInfo, displayCart, animateCartIcon, displayNuanceGrid, showClientDetailsModal, hideClientDetailsModal } from './ui-v2.js';
import { addToCart, updateCartQuantity, removeFromCart, checkoutOrder } from './cart-v2.js';
import { incrementDeliveryDate, decrementDeliveryDate, calculateAndSetInitialDeliveryDate } from './date-v2.js';
import { loadNuancesData } from './data-v2.js';

function setupClientDetailsModalListeners() {
    const clientInfoBtn = document.getElementById('client-info-btn');
    const modal = document.getElementById('client-details-modal');
    const closeModalBtn = modal ? modal.querySelector('.close-modal-btn') : null;

    if (clientInfoBtn) {
        clientInfoBtn.addEventListener('click', () => {
            if (appState.selectedClient) {
                showClientDetailsModal(appState.selectedClient);
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideClientDetailsModal);
    }

    if (modal) {
        // Close modal if clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideClientDetailsModal();
            }
        });
    }

    // --- Add listeners for Copy and Maps buttons ---
    const copyAddressBtn = document.getElementById('copy-address-btn');
    const openInMapsBtn = document.getElementById('open-in-maps-btn');

    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', () => {
            console.log('[setupClientDetailsModalListeners] Copy address button clicked.');
            if (appState.selectedClient) {
                const client = appState.selectedClient;
                const fullAddress = `${client[CLIENT_ADDRESS_FIELD] || ''}, ${client[CLIENT_POSTAL_CODE_FIELD] || ''} ${client[CLIENT_CITY_FIELD] || ''}`.trim().replace(/,\s*$/, '');
                if (fullAddress) {
                    navigator.clipboard.writeText(fullAddress).then(() => {
                        alert('Adresse copiée dans le presse-papiers !');
                    }).catch(err => {
                        console.error('Erreur lors de la copie de l\'adresse:', err);
                        alert('Impossible de copier l\'adresse.');
                    });
                } else {
                    alert('Adresse complète non disponible pour la copie.');
                }
            } else {
                alert('Aucun client sélectionné pour copier l\'adresse.');
            }
        });
    }

    if (openInMapsBtn) {
        openInMapsBtn.addEventListener('click', () => {
            console.log('[setupClientDetailsModalListeners] Open in Maps button clicked.');
            if (appState.selectedClient) {
                const client = appState.selectedClient;
                const fullAddress = `${client[CLIENT_ADDRESS_FIELD] || ''}, ${client[CLIENT_POSTAL_CODE_FIELD] || ''} ${client[CLIENT_CITY_FIELD] || ''}`.trim().replace(/,\s*$/, '');
                if (fullAddress) {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                    window.open(mapsUrl, '_blank');
                } else {
                    alert('Adresse complète non disponible pour l\'ouverture dans Maps.');
                }
            } else {
                alert('Aucun client sélectionné pour ouvrir l\'adresse dans Maps.');
            }
        });
    }
}

// Définir handleResize en tant que fonction de niveau supérieur
const handleResize = () => {
    const isMobile = window.innerWidth <= 1024;
    const cartPanel = document.querySelector('.cart-panel');
    const cartSection = document.getElementById('cart-section');
    if (!isMobile) {
        if (cartPanel && cartSection) {
            cartPanel.appendChild(cartSection);
        }
    }
};

function handleNuanceButtonClick(e) {
    const clickedButton = e.target.closest('.nuance-btn'); // Use closest for delegation
    if (clickedButton && !clickedButton.disabled) {
        e.preventDefault();
        const articleCode = clickedButton.dataset.code;
        console.log("Nuance button clicked:", clickedButton);
        console.log("Article code:", articleCode);
        if (!articleCode) {
            console.warn("No article code found for clicked nuance button.");
            return;
        }

        const isInCart = appState.cart.some(item => item.code === articleCode);
        console.log("isInCart (before action):", isInCart);

        if (isInCart) {
            // Remove from cart and update UI
            removeFromCart(articleCode);
            clickedButton.classList.remove('selected-nuance');
        } else {
            // Add to cart and update UI
            const defaultQty = document.getElementById('default-qty-input').value || 1;
            const success = addToCart(articleCode, parseInt(defaultQty, 10));
            if (success) {
                clickedButton.classList.add('selected-nuance');
                console.log(`[setupNuanceGridListeners] Added article ${articleCode} to cart and applied selected-nuance class.`);
                console.log(`[setupNuanceGridListeners] Current cart item count: ${appState.cart.length}`);
            } else {
                alert("Impossible d'ajouter l'article au panier. Avez-vous sélectionné un client ?");
            }
        }
        // Update cart display regardless of action
        displayCart();
        animateCartIcon();
    }
}

export function setupNuanceGridListeners() {
    const nuanceGridContainer = document.getElementById('main-nuance-grid-container');
    if (!nuanceGridContainer) return;

    // Attach the event listener ONCE using delegation
    // Using removeEventListener first to ensure it's attached only once if initListeners is called multiple times
    nuanceGridContainer.removeEventListener('click', handleNuanceButtonClick);
    nuanceGridContainer.addEventListener('click', handleNuanceButtonClick);
    console.log("[setupNuanceGridListeners] Nuance grid click listener attached.");
}

function setupMobileUI() {
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartPanel = document.querySelector('.cart-panel');

    const closeOverlay = () => {
        if (cartPanel) {
            cartPanel.appendChild(document.getElementById('cart-section'));
        }
        cartOverlay.classList.add('hidden');
    };

    closeCartBtn.addEventListener('click', closeOverlay);
    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            closeOverlay();
        }
    });
}

function setupFilters(data, fieldName, selectId, filterFunction) {
    const select = document.getElementById(selectId);
    let allOptionText = "";

    if (fieldName === 'Secteur') {
        allOptionText = "Tous les Secteurs";
    } else if (fieldName === 'Famille') {
        allOptionText = "Toutes les Familles";
    } else if (fieldName === 'Fournisseur') {
        allOptionText = "Tous les Fournisseurs";
    } else {
        allOptionText = `Toutes les ${fieldName}s`;
    }

    select.innerHTML = `<option value="ALL">${allOptionText}</option>`;
    const uniqueValues = [...new Set(data.map(item => item[fieldName]).filter(val => val && val.trim() !== ''))].sort();
    uniqueValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
    select.removeEventListener('change', filterFunction);
    select.addEventListener('change', filterFunction);
}

function filterClientsBySector(sector) {
    if (sector === 'ALL') {
        setFilteredClients(appState.appData.clients);
    } else {
        setFilteredClients(appState.appData.clients.filter(client => client['Secteur'] === sector));
    }
    document.getElementById('client-search-input').value = '';
    if (appState.selectedClient && !appState.filteredClients.some(c => c['Code'] === appState.selectedClient['Code'])) {
        updateSelectedClientInfo(null);
    } else if (appState.selectedClient) {
        updateSelectedClientInfo(appState.selectedClient);
    } else {
        updateSelectedClientInfo(null);
    }
}

function setupClientSearch() {
    const input = document.getElementById('client-search-input');
    const suggestionsContainer = document.getElementById('client-suggestions');
    let currentMatches = [];

    input.addEventListener('input', function(e) {
        const value = this.value.toUpperCase();
        suggestionsContainer.innerHTML = ""; 
        currentMatches = [];

        if (!value) return false;

        const matches = appState.filteredClients.filter(client => {
            if (!client || !client['Nom'] || !client['Code']) return false; 

            const clientName = client['Nom'].toUpperCase();
            const clientCode = client['Code'].toUpperCase();
            return clientName.includes(value) || clientCode.includes(value);
        }).slice(0, 10); 

        currentMatches = matches;

        matches.forEach(client => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            const clientCommune = client['Commune'] ? ` - ${client['Commune']}` : '';
            item.innerHTML = `<strong>${client['Nom']}</strong> (${client['Code']}${clientCommune})`;

            item.addEventListener('click', function(e) {
                input.value = client['Nom'];
                suggestionsContainer.innerHTML = "";
                updateSelectedClientInfo(client); 
            });

            suggestionsContainer.appendChild(item);
        });
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentMatches.length > 0) {
                const topClient = currentMatches[0];
                input.value = topClient['Nom'];
                suggestionsContainer.innerHTML = "";
                updateSelectedClientInfo(topClient);
            }
        }
    });

    document.addEventListener("click", function (e) {
        if (!e.target.matches('#client-search-input')) {
            suggestionsContainer.innerHTML = "";
        }
    });
}



const handleArticlesContainerClick = (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const articleCode = e.target.dataset.code;
        const qtyInput = document.getElementById(`qty-${articleCode}`);
        const quantity = qtyInput ? qtyInput.value : 1; 
        const success = addToCart(articleCode, quantity);
        if (success) {
            displayCart();
            animateCartIcon();
        }
    }
};

const handleCartContainerClick = (e) => {
    if (e.target.classList.contains('remove-from-cart-btn')) {
        removeFromCart(e.target.dataset.code);
        displayCart();
    }
    if (e.target.classList.contains('qty-control-btn')) {
        const code = e.target.dataset.code;
        const action = e.target.dataset.action;
        updateCartQuantity(code, action);
        displayCart(); // Rerender cart after quantity change
    }
};

export function initListeners() {
    console.log('[initListeners] Initialisation des écouteurs...');
    if (appState.appData.clients.length > 0) {
        setupFilters(appState.appData.clients, 'Secteur', 'secteur-select', (e) => filterClientsBySector(e.target.value));
        setupClientSearch(); 
        filterClientsBySector('ALL'); 
    }

    if (appState.appData.articles.length > 0) {
        setupFilters(appState.appData.articles, 'Famille', 'famille-select', () => filterAndDisplayArticles());
        setupFilters(appState.appData.articles, 'Fournisseur', 'fournisseur-select', () => filterAndDisplayArticles());
        setupArticleSearch();
        setupDefaultQtyListener();
        setupToggleFilters();
        setupColorsFilter();
        setupNuanceGridListeners(); // Attach nuance grid listener once
        setupDefaultQtyControls(); // NEW: Setup controls for default quantity
    }
    
    // Centralized event listeners for containers
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
        articlesContainer.removeEventListener('click', handleArticlesContainerClick);
        articlesContainer.addEventListener('click', handleArticlesContainerClick);
    }

    const cartContainer = document.getElementById('cart-container');
    if (cartContainer) {
        cartContainer.removeEventListener('click', handleCartContainerClick);
        cartContainer.addEventListener('click', handleCartContainerClick);
    }

    document.getElementById('increment-date-btn').addEventListener('click', incrementDeliveryDate);
    document.getElementById('decrement-date-btn').addEventListener('click', decrementDeliveryDate);
    document.getElementById('checkout-btn').addEventListener('click', checkoutOrder);
    
    adjustStickyHeader();
    window.addEventListener('resize', handleResize); // Attache l'écouteur de redimensionnement ici
    handleResize(); // Appelle-le une fois à l'initialisation

    setupMobileUI();
    makeFabDraggable(); // NEW: Make FAB draggable
    setupClientDetailsModalListeners(); // NEW: Setup listeners for client details modal
    
    window.addEventListener('click', function(event) {
        // ... (rest of the function is the same, not repeating for brevity)
    });
}