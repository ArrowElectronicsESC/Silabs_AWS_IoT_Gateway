import {
    GET_HISTORICAL_DATA, GET_LEDCHANNEL_DATA, GET_DEVICE_PROPERTY, DELETE_DEVICES, IS_LED_PROFILE_DELETED,
    CLEAR_CURRENT_DATA, UI_START_LOADING_INDEVICE, GET_LED_PROFILE, SET_LED_INTENCITY, GET_RECENT_DATA, GET_CURRENT_VALUE_OF_LEDNODE
} from '../actions/actionTypes';


const initialState = {
    historicalData: [],
    deviceProperty: [],
    loading: false,
    ledProfiles: [],
    ledChannelsData: {},
    ledCurrentData: [],
    currentData: [],
    isDeviceDeleted: false,
    isProfileDeletedLoader: false
}

const deviceReducer = (state = initialState, action) => {
    switch (action.type) {
        case GET_HISTORICAL_DATA:
            console.log('log=====asdasdas historicalData', action.payload);

            return { ...state, historicalData: action.payload };
        case GET_DEVICE_PROPERTY:
            return { ...state, deviceProperty: action.payload };
        case UI_START_LOADING_INDEVICE:
            return { ...state, loading: action.payload };
        case GET_LED_PROFILE:
            return { ...state, ledProfiles: action.payload }
        case GET_LEDCHANNEL_DATA:
            return { ...state, ledChannelsData: action.payload }
        case GET_CURRENT_VALUE_OF_LEDNODE:
            return { ...state, ledCurrentData: action.payload }
        case SET_LED_INTENCITY:
            return { ...state, ledCurrentData: action.payload, loading: false }
        case GET_RECENT_DATA:
            return { ...state, currentData: action.payload }
        case DELETE_DEVICES:
            return { ...state, isDeviceDeleted: action.payload }
        case CLEAR_CURRENT_DATA:
            return { ...state, currentData: action.payload }
        case IS_LED_PROFILE_DELETED:
            return { ...state, isProfileDeletedLoader: action.payload, ledProfiles: [] }
        default:
            return state;
    }
};

export default deviceReducer;