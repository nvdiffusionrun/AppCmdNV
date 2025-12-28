import { appState, setDeliveryDate, setInitialDeliveryDate } from './state-v2.js';
import { displayDeliveryDate } from './ui-v2.js';

export function calculateAndSetInitialDeliveryDate() {
    let nextDay = new Date();
    nextDay.setHours(0, 0, 0, 0);
    nextDay.setDate(nextDay.getDate() + 1);

    while (nextDay.getDay() === 0 || nextDay.getDay() === 1 || nextDay.getDay() === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    setDeliveryDate(new Date(nextDay));
    setInitialDeliveryDate(new Date(nextDay));
    displayDeliveryDate();
}

export function incrementDeliveryDate() {
    appState.deliveryDate.setDate(appState.deliveryDate.getDate() + 1);
    while (appState.deliveryDate.getDay() === 0 || appState.deliveryDate.getDay() === 1 || appState.deliveryDate.getDay() === 6) {
        appState.deliveryDate.setDate(appState.deliveryDate.getDate() + 1);
    }
    displayDeliveryDate();
}

export function decrementDeliveryDate() {
    let tempDate = new Date(appState.deliveryDate);
    tempDate.setDate(tempDate.getDate() - 1);

    while (tempDate.getDay() === 0 || tempDate.getDay() === 1 || tempDate.getDay() === 6) {
        tempDate.setDate(tempDate.getDate() - 1);
    }

    if (tempDate < appState.initialDeliveryDate) {
        setDeliveryDate(new Date(appState.initialDeliveryDate));
    } else {
        setDeliveryDate(tempDate);
    }
    displayDeliveryDate();
}