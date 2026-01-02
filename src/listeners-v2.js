import { appState, setFilteredClients, setSelectedClient, CLIENT_ADDRESS_FIELD, CLIENT_POSTAL_CODE_FIELD, CLIENT_CITY_FIELD } from './state-v2.js';
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
    const fabCartBtn = document.getElementById('fab-cart-btn');
    const cartSection = document.getElementById('cart-section');
    const cartModalContent = document.getElementById('cart-modal-content');
    const cartPanel = document.querySelector('.cart-panel');

    fabCartBtn.addEventListener('click', () => {
        cartModalContent.appendChild(cartSection);
        cartOverlay.classList.remove('hidden');
    });

    const closeOverlay = () => {
        cartPanel.appendChild(cartSection);
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

export function setupArticleListeners() {
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
        console.log('[setupArticleListeners] articlesContainer trouvé:', articlesContainer);
        articlesContainer.addEventListener('click', (e) => {
            console.log('[setupArticleListeners] Clic détecté sur articlesContainer. Target:', e.target, 'Classes:', e.target.classList);
            if (e.target.classList.contains('add-to-cart-btn')) {
                const articleCode = e.target.dataset.code;
                const qtyInput = document.getElementById(`qty-${articleCode}`);
                const quantity = qtyInput ? qtyInput.value : 1; 
                console.log(`[setupArticleListeners] Clic sur 'Ajouter'. Code: ${articleCode}, Quantité: ${quantity}, Client sélectionné:`, appState.selectedClient);
                const success = addToCart(articleCode, quantity);
                if (success) {
                    console.log(`[setupArticleListeners] Article ${articleCode} ajouté au panier avec succès. Mise à jour de l'UI.`);
                    displayCart();
                    animateCartIcon();
                } else {
                    console.log(`[setupArticleListeners] Échec de l'ajout de l'article ${articleCode} au panier.`);
                }
            }
        });
        console.log('[setupArticleListeners] Écouteur de clic attaché à articlesContainer.');
    } else {
        console.warn('[setupArticleListeners] articlesContainer non trouvé. L\'écouteur de clic ne sera pas attaché.');
    }
    
    const cartContainer = document.getElementById('cart-container');
    cartContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-from-cart-btn')) {
            console.log(`[setupArticleListeners] Clic sur 'Retirer'. Code: ${e.target.dataset.code}`);
            removeFromCart(e.target.dataset.code);
            displayCart();
        }
        if (e.target.classList.contains('qty-control-btn')) {
            const code = e.target.dataset.code;
            const action = e.target.dataset.action;
            console.log(`[setupArticleListeners] Clic sur 'Qté'. Code: ${code}, Action: ${action}`);
            updateCartQuantity(code, action);
            displayCart(); // Rerender cart after quantity change
        }
    });
}

function setupArticleSearch() {
    const input = document.getElementById('article-search-input');
    input.addEventListener('input', () => filterAndDisplayArticles()); 
}

function setupDefaultQtyListener() {
    const input = document.getElementById('default-qty-input');
    input.addEventListener('input', () => filterAndDisplayArticles());
}

function setupToggleFilters() {
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const advancedFilters = document.getElementById('advanced-filters');

    if (toggleBtn && advancedFilters) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = advancedFilters.classList.toggle('visible');
            toggleBtn.textContent = isVisible ? 'Moins de filtres' : 'Filtres';
        });
    }
}

function setupColorsFilter() {

    const colorsBtn = document.getElementById('colors-filter-btn');

    const colorsDropdown = document.getElementById('colors-dropdown');



    if (colorsBtn && colorsDropdown) {

        colorsBtn.addEventListener('click', (event) => {

            console.log('[setupColorsFilter] Clic sur le bouton "Couleurs".');

            colorsDropdown.classList.toggle('visible');

            console.log('[setupColorsFilter] Visibilité du dropdown Couleurs:', colorsDropdown.classList.contains('visible'));

        });



        colorsDropdown.addEventListener('click', async (event) => {

            if (event.target.classList.contains('brand-btn')) {

                const brand = event.target.dataset.brand;

                console.log(`[setupColorsFilter] Clic sur la marque: ${brand}`);

                colorsDropdown.classList.remove('visible');



                const articlesContainer = document.getElementById('articles-container');

                const nuanceGridContainer = document.getElementById('main-nuance-grid-container');



                articlesContainer.style.display = 'none';

                nuanceGridContainer.style.display = 'block';

                nuanceGridContainer.innerHTML = `<p>Chargement des nuances pour ${brand}...</p>`;

                

                try {

                    const nuancesData = await loadNuancesData(brand);

                    displayNuanceGrid(brand, nuancesData);



                    const backBtn = document.getElementById('back-to-brands-btn');

                    if (backBtn) {

                        backBtn.addEventListener('click', () => {

                            nuanceGridContainer.style.display = 'none';

                            nuanceGridContainer.innerHTML = ''; // Clean up

                            articlesContainer.style.display = 'block';

                        }, { once: true });

                    }

                } catch (error) {

                    console.error(`[setupColorsFilter] Erreur lors du chargement des nuances pour ${brand}:`, error);

                    nuanceGridContainer.innerHTML = `<p>Impossible de charger les nuances pour ${brand}.</p>`;

                }

            }

        });

    }

}



function setupDefaultQtyControls() {



    const defaultQtyInput = document.getElementById('default-qty-input');



    const decrementBtn = document.getElementById('decrement-default-qty-btn');



    const incrementBtn = document.getElementById('increment-default-qty-btn');







    if (defaultQtyInput && decrementBtn && incrementBtn) {



        decrementBtn.addEventListener('click', () => {



            let currentValue = parseInt(defaultQtyInput.value, 10);



            if (!isNaN(currentValue) && currentValue > 1) { // Ensure min is 1



                defaultQtyInput.value = currentValue - 1;



                filterAndDisplayArticles(); // Refresh article list



            }



        });







        incrementBtn.addEventListener('click', () => {



            let currentValue = parseInt(defaultQtyInput.value, 10);



            if (!isNaN(currentValue)) {



                defaultQtyInput.value = currentValue + 1;



                filterAndDisplayArticles(); // Refresh article list



            }



        });







        // Also ensure that direct input change still triggers filter



        defaultQtyInput.addEventListener('change', () => {



            let currentValue = parseInt(defaultQtyInput.value, 10);



            if (isNaN(currentValue) || currentValue < 1) {



                defaultQtyInput.value = 1; // Enforce minimum 1



            }



            filterAndDisplayArticles(); // Refresh article list



        });



    }



}



function makeFabDraggable() {



    const fabBtn = document.getElementById('fab-cart-btn');



    if (!fabBtn) return;







    let isDragging = false;



    let offsetX, offsetY; // Store the offset from mouse click to element's top-left







    // Ensure position is fixed and has a high z-index



    fabBtn.style.position = 'fixed';



    fabBtn.style.zIndex = '9999';







    // Get initial (or default) position from computed styles



    const computedStyle = getComputedStyle(fabBtn);



    let currentLeft = parseInt(computedStyle.left);



    let currentTop = parseInt(computedStyle.top);







    // If left/top are not explicitly set (e.g., using 'bottom'/'right'), calculate them



    if (computedStyle.left === 'auto' && computedStyle.right !== 'auto') {



        currentLeft = window.innerWidth - parseInt(computedStyle.right) - fabBtn.offsetWidth;



    }



    if (computedStyle.top === 'auto' && computedStyle.bottom !== 'auto') {



        currentTop = window.innerHeight - parseInt(computedStyle.bottom) - fabBtn.offsetHeight;



    }







    // Load saved position from localStorage if available



    const savedLeft = localStorage.getItem('fabBtnLeft');



    const savedTop = localStorage.getItem('fabBtnTop');







    if (savedLeft !== null && savedTop !== null) {



        fabBtn.style.left = savedLeft + 'px';



        fabBtn.style.top = savedTop + 'px';



    } else {



        // Apply initial calculated position if no saved position



        fabBtn.style.left = currentLeft + 'px';



        fabBtn.style.top = currentTop + 'px';



    }



    



    function dragStart(e) {



        // Only allow dragging with left mouse button or touch



        if (e.type === "touchstart" || e.button === 0) {



            isDragging = true;



            



            // Get current mouse/touch position



            const clientX = e.clientX || e.touches[0].clientX;



            const clientY = e.clientY || e.touches[0].clientY;







            // Calculate offset from the element's current position to the mouse/touch point



            // This is crucial: it keeps the mouse relative to the clicked point on the button



            const rect = fabBtn.getBoundingClientRect();



            offsetX = clientX - rect.left; 



            offsetY = clientY - rect.top; 



            



            fabBtn.style.cursor = 'grabbing';



            window.addEventListener('mousemove', drag);



            window.addEventListener('mouseup', dragEnd);



            window.addEventListener('touchmove', drag);



            window.addEventListener('touchend', dragEnd);



        }



    }







    function dragEnd() {



        isDragging = false;



        fabBtn.style.cursor = 'grab';



        window.removeEventListener('mousemove', drag);



        window.removeEventListener('mouseup', dragEnd);



        window.removeEventListener('touchmove', drag);



        window.removeEventListener('touchend', dragEnd);



        



        // Save final position (pixel values)



        localStorage.setItem('fabBtnLeft', parseInt(fabBtn.style.left));



        localStorage.setItem('fabBtnTop', parseInt(fabBtn.style.top));



    }







    function drag(e) {



        if (isDragging) {



            e.preventDefault(); 



            const clientX = e.clientX || e.touches[0].clientX;



            const clientY = e.clientY || e.touches[0].clientY;







            // Calculate new position of the element's top-left corner



            let newLeft = clientX - offsetX;



            let newTop = clientY - offsetY;







            // Constrain movement within the viewport



            const fabRect = fabBtn.getBoundingClientRect(); 



            if (newLeft < 0) newLeft = 0;



            if (newTop < 0) newTop = 0;



            if (newLeft + fabRect.width > window.innerWidth) newLeft = window.innerWidth - fabRect.width;



            if (newTop + fabRect.height > window.innerHeight) newTop = window.innerHeight - fabRect.height;



            



            fabBtn.style.left = newLeft + 'px';



            fabBtn.style.top = newTop + 'px';



        }



    }







    fabBtn.addEventListener('mousedown', dragStart);



    fabBtn.addEventListener('touchstart', dragStart);



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
        // Console log after setting up article listeners
        const articlesContainer = document.getElementById('articles-container');
        if (articlesContainer) {
            console.log('[initListeners] articlesContainer trouvé pour écouteur:', articlesContainer);
        } else {
            console.warn('[initListeners] articlesContainer non trouvé pour écouteur!');
        }
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
        console.log('[window.click] Clic global détecté. Target:', event.target, 'ID:', event.target.id, 'Classes:', event.target.classList);
        // Cible pour le bouton "Couleurs"
        const colorsBtn = document.getElementById('colors-filter-btn');
        const colorsDropdown = document.getElementById('colors-dropdown');

        // Gérer le dropdown "Couleurs"
        if (colorsDropdown && colorsBtn) {
            // Si le dropdown est visible et que le clic n'est ni sur le bouton ni à l'intérieur du dropdown
            if (colorsDropdown.classList.contains('visible') && event.target !== colorsBtn && !colorsBtn.contains(event.target) && !colorsDropdown.contains(event.target)) {
                colorsDropdown.classList.remove('visible');
                console.log('[window.click] Fermeture du dropdown Couleurs.');
            }
        }

        // Gérer le dropdown "Filtres" (avancés)
        const toggleBtn = document.getElementById('toggle-filters-btn');
        const advancedFilters = document.getElementById('advanced-filters');
        if (advancedFilters && toggleBtn) {
            // Si le dropdown est visible et que le clic n'est ni sur le bouton ni à l'intérieur du dropdown
            if (advancedFilters.classList.contains('visible') && event.target !== toggleBtn && !toggleBtn.contains(event.target) && !advancedFilters.contains(event.target)) {
                advancedFilters.classList.remove('visible');
                toggleBtn.textContent = 'Filtres'; // Réinitialiser le texte du bouton
                console.log('[window.click] Fermeture du dropdown Filtres Avancés.');
            }
        }
        // ... (autres éléments à fermer si besoin)
    });
}