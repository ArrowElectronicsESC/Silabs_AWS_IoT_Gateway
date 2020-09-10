import {
    GET_BLE_DEVICES, ADD_BLE_DEVICE, GET_BLE_MANAGER, SET_BLE_MANAGER,
    REMOVE_BLE_DEVICE, REMOVE_BLE_DEVICE_SIGNOUT_FROM_DEVICE, REMOVE_BLE_DEVICE_SIGNOUT_FROM_GROWAREA
} from "./actionTypes";

export const addBleDevice = (device) => {
    console.log("Device added to redux", device)
    return {
        type: ADD_BLE_DEVICE,
        device: device
    };
};

export const removeBleDevicefromDevice = (device) => {
    console.log("Removing device");
    return (dispatch) => {
        dispatch({ type: REMOVE_BLE_DEVICE_SIGNOUT_FROM_DEVICE, device: device });
    }
}

export const removeBleDevicefromGrowarea = (device) => {
    console.log("Removing device");
    return (dispatch) => {
        dispatch({ type: REMOVE_BLE_DEVICE_SIGNOUT_FROM_GROWAREA, device: device });
    }
}

export const removeBleDevice = (deviceId) => {
    console.log("Removing device");
    return {
        type: REMOVE_BLE_DEVICE,
        deviceId: deviceId
    }
}

export const getBleDevices = () => {
    return {
        type: GET_BLE_DEVICES
    }
}

export const getBleManager = () => {
    return {
        type: GET_BLE_MANAGER
    }
}

export const setBleManager = (bleManager) => {
    console.log("BLE Manager added to redux")
    return {
        type: SET_BLE_MANAGER,
        bleManager: bleManager
    }
}