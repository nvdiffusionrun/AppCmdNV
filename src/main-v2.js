import { setAppData, setFilteredClients } from './state-v2.js';
import { loadAllData } from './data-v2.js';
import { initListeners } from './listeners-v2.js';
import { displayCart, filterAndDisplayArticles, displayDeliveryDate } from './ui-v2.js';
import { calculateAndSetInitialDeliveryDate } from './date-v2.js';

async function initApp() {
    const debugStatus = document.getElementById('debug-status');
    try {
        const data = await loadAllData();
        
        // Vérification plus stricte des données chargées
        if (!data || !data.clients || !data.articles || data.clients.length === 0 || data.articles.length === 0) {
            throw new Error("Les fichiers CSV semblent être vides ou mal formatés. Aucune donnée client/article n'a été trouvée.");
        }
        
        setAppData(data);
        setFilteredClients(data.clients);

        initListeners();

        calculateAndSetInitialDeliveryDate();
        filterAndDisplayArticles();
        displayCart();

        console.log("Application initialisée avec succès.");

    } catch (error) {
        console.error("Erreur fatale lors de l'initialisation de l'application:", error);
        debugStatus.style.display = 'block';
        debugStatus.textContent = `Erreur critique : Impossible de démarrer l'application. ${error.message}. Assurez-vous d'exécuter l'application via un serveur web local et vérifiez la console pour plus de détails.`;
    }
}

initApp();
