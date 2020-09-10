import { UI_START_LOADING, UI_STOP_LOADING, UI_REGISTRATION_PROCESS, COUNT_UI_START_LOADING, COUNT_UI_STOP_LOADING } from './actionTypes';

export const uiStartLoading = (message) => {
    return {
        type: UI_START_LOADING,
        payload: message
    };
};

export const uiStopLoading = () => {
    return {
        type: UI_STOP_LOADING
    };
};

export const countUiStartLoading = () => {
    return {
        type: COUNT_UI_START_LOADING
    }
}

export const countUiStopLoading = () => {
    return {
        type: COUNT_UI_STOP_LOADING
    }
}

export const uiUpdateRegistrationState = (registrationState) => {
    return {
        type: UI_REGISTRATION_PROCESS,
        registrationState: registrationState
    }
}; 