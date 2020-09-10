import { SET_GATEWAY_KEYS, SET_GATEWAY_HID, SENDING_PAYLOAD_TO_GATEWAY } from "./actionTypes";
import { uiUpdateRegistrationState } from "./rootActions";
import * as Urls from '../../Urls';
import * as RegistrationStates from '../../RegistrationStates';
import { version as appVersion, displayName as appName, selene as seleneVersion, softwareName } from './../../../app.json';
import { Platform } from 'react-native';
import { registerGateway } from "./apiGrowHouse";




export const storeGatewayHId = (gatewayHId) => {
    return {
        type: SET_GATEWAY_HID,
        gatewayHId: gatewayHId
    }
}

export const storeKeys = (apiKey, apiSecretKey) => {
    return {
        type: SET_GATEWAY_KEYS,
        apiKey: apiKey,
        apiSecretKey: apiSecretKey
    }
}

export const registerGatewayToArrow = (payload, bleDevice, SeleneVersion) => {

    let url = Urls.ARROW_GATEWAY_REGISTRATION_URL
    payload['applicationHid'] = Urls.ARROW_APPLICATION_HID;
    payload['deviceType'] = 'Gateway';
    payload['softwareVersion'] = SeleneVersion != '' ? SeleneVersion : seleneVersion; // selene version
    console.log('seleneVersion=-=-=-=-=-=-=-12313', SeleneVersion != '' ? SeleneVersion : seleneVersion)
    payload['softwareName'] = softwareName; // softwareName
    payload['type'] = 'Local';
    payload['growhouseUrl'] = Urls.BASE_URL //base url
    payload['uid'] = payload.gatewayMacId;
    payload = JSON.stringify(payload);
    console.log(url);
    console.log(payload);
    console.log("Token:" + Urls.ARROW_X_AUTH_TOKEN);
    console.log("Hello world:" + payload);

    return dispatch => {
        dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_STARTED_TO_ARROW));
        fetch(url,
            {
                method: "POST",
                headers: {
                    'x-auth-token': Urls.ARROW_X_AUTH_TOKEN,
                    accept: "application/json",
                    'Content-Type': 'application/json'
                },
                body: payload
            })
            .catch((error) => {
                bleDevice.cancelConnection().catch((e) => {
                    console.log('error', e);

                });

                throw new Error("Network error!");
            })
            .then(res => {
                console.log(res.status);
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error("Something went wrong while registering to Arrow: \nStatusCode:" + res.status);
                }
            })
            .then(parsedRes => {
                console.log(url);
                dispatch(storeGatewayHId(parsedRes.hid));
                dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_SUCCESS_TO_ARROW));
                payload = JSON.parse(payload);
                payLoadForInternalCloud = {
                    description: payload.description,
                    gatewayName: payload.name,
                    gatewayHId: parsedRes.hid,
                    growAreaTypeId: payload.growAreaTypeId,
                    growAreaType: payload.growAreaType,
                    macId: payload.gatewayMacId,
                    containerId: payload.containerId,
                    facilityId: payload.facilityId,
                    uid: payload.uid,
                    users: payload.users
                }
                console.log("Calling fetchConfig with " + JSON.stringify(payLoadForInternalCloud));
                dispatch(fetchingCloudConfig(payLoadForInternalCloud, bleDevice));

            })
            .catch(error => {
                alert("Error:" + error.message);
                console.log(error);
                bleDevice.cancelConnection().catch(e => {
                    console.log('error', e);

                });
                dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_FAILED_TO_ARROW));
            });
    }
};

export const fetchingCloudConfig = (payload, bleDevice) => {

    let url = Urls.ARROW_GATEWAY_CONFIG_GET_URL
    if (payload.gatewayHId) {
        url = url.replace('{0}', payload.gatewayHId);
    }
    else {
        return dispatch => {
            dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_FAILED_TO_INTERNAL_CLOUD));
        }
    }

    console.log(url);
    console.log(payload);

    return dispatch => {
        dispatch(uiUpdateRegistrationState(RegistrationStates.FETCHING_CONFIG_FROM_ARROW_STARTED));
        fetch(url,
            {
                method: "GET",
                headers: {
                    'x-auth-token': Urls.ARROW_X_AUTH_TOKEN,
                    accept: "application/json",
                    'Content-Type': 'application/json'
                }
            })
            .catch((error) => {
                bleDevice.cancelConnection().catch((e) => {
                    console.log('error', e);

                });
                throw new Error("Network error!");
            })
            .then(res => {
                console.log(res.status);
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error("Something went wrong while fetching Config from Arrow: \nStatusCode:" + res.status);
                }
            })
            .then(parsedRes => {
                console.log(url);
                dispatch(storeKeys(parsedRes.key.apiKey, parsedRes.key.secretKey));
                console.log(JSON.stringify(payload));
                internalCloudPayload = {
                    description: payload.description,
                    grow_area_name: payload.gatewayName,
                    grow_area_hid: payload.gatewayHId,
                    grow_area_type: payload.growAreaType,
                    mac_id: payload.macId,
                    grow_area_uid: payload.uid,
                    container: {
                        id: payload.containerId
                    },
                    facility: {
                        id: payload.facilityId
                    },
                    users: payload.users
                }
                dispatch({ type: SENDING_PAYLOAD_TO_GATEWAY, payload: internalCloudPayload });
                dispatch(uiUpdateRegistrationState(RegistrationStates.FETCHING_CONFIG_FROM_ARROW_SUCCESS));

            })
            .catch(error => {

                alert("Error:" + error.message);
                bleDevice.cancelConnection();
                console.log(error);
                dispatch(uiUpdateRegistrationState(RegistrationStates.FETCHING_CONFIG_FROM_ARROW_FAILED));
            });
    }
};