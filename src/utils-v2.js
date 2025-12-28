import { PRICE_BASE, PRICE_MAP, CLIENT_CAT_TARIF_FIELD } from './state-v2.js';

export function getArticlePrice(article, client) {
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
