import {
    GET_BLE_DEVICES, ADD_BLE_DEVICE, GET_BLE_MANAGER, SET_BLE_MANAGER,
    REMOVE_BLE_DEVICE, AUTH_REMOVE_USER, REMOVE_BLE_DEVICE_SIGNOUT_FROM_DEVICE,
    SENDING_PAYLOAD_TO_GATEWAY, REMOVE_BLE_DEVICE_SIGNOUT_FROM_GROWAREA, REGISTERED_DEVICE_COUNT
} from "../actions/actionTypes";

const initialState = {
    bleDevices: {},
    bleManager: null,
    disconnectBleFromDevice: '',
    registredDevice: 0,
    disconnectBleFromGrowarea: '',
    payLoadForInternalCloud: {}

};

const bleReducer = (state = initialState, action) => {
    let devices = {};
    let deviceId = null;

    switch (action.type) {
        case AUTH_REMOVE_USER:
            console.log('Resetting BLE Reducer...')
            return {
                ...state,
                bleDevices: {}
            }
        case GET_BLE_DEVICES:
            return {
                ...state,
            };
        case ADD_BLE_DEVICE:
            deviceId = action.device.id
            devices = state.bleDevices;
            devices[deviceId] = action.device;
            return {
                ...state,
                bleDevices: devices
            };
        case GET_BLE_MANAGER:
            return {
                ...state,
            }
        case SET_BLE_MANAGER:
            return {
                ...state,
                bleManager: action.bleManager
            }
        case REMOVE_BLE_DEVICE_SIGNOUT_FROM_DEVICE:
            console.log('action.device', action.device);

            return {
                ...state,
                disconnectBleFromDevice: action.device
            }
        case REMOVE_BLE_DEVICE_SIGNOUT_FROM_GROWAREA:
            console.log('action.device', action.device);

            return {
                ...state,
                disconnectBleFromGrowarea: action.device
            }
        case REMOVE_BLE_DEVICE:
            devices = state.bleDevices;
            delete devices[action.deviceId]
            return {
                ...state,
                bleDevices: devices
            }
        case REGISTERED_DEVICE_COUNT:
            console.log('in reducer-==========================', action.payload);

            return { ...state, registredDevice: action.payload }
        case SENDING_PAYLOAD_TO_GATEWAY:
            console.log('in reducer-==========================', action.payload);

            return { ...state, payLoadForInternalCloud: action.payload }

        default:
            return state;
    }
};

export default bleReducer;