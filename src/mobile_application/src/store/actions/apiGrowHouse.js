import { GET_ALL_GATEWAYS, REGISTERED_DEVICE_COUNT } from "./actionTypes";
import { uiUpdateRegistrationState, getGrowAreas, refreshSession, sessionExpired, sessionEstablished } from "./rootActions";
import * as Urls from '../../Urls';
import { apiDebug, debug } from '../../../app.json';
import { AsyncStorage } from 'react-native';
import * as RegistrationStates from '../../RegistrationStates';


export const registerGateway = (reqData, bleDevice, token, appleKey) => {

    let url = Urls.INTERNAL_GATEWAY_REGISTRATION_URL
    payload = JSON.stringify(reqData);
    console.log(url);
    console.log('payload-=-=-=-=', payload);

    if (apiDebug) {
        return dispatch => {
            dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_STARTED_TO_INTERNAL_CLOUD));
            setTimeout(() => {
                dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_SUCCESS_TO_INTERNAL_CLOUD));
            }, 1000);

            setTimeout(() => {
                console.log("Updating registration state");
                dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_PROCESS_COMPLETE));
            }, 2000);
        }
    }

    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
            console.log('getFacilities called:' + token);
            let headers = appleKey === 'true' ? {
                Authorization: token,
                'Content-Type': 'application/json',
                appleKey
            } : {
                    Authorization: token,
                    'Content-Type': 'application/json'
                };
            dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_STARTED_TO_INTERNAL_CLOUD));
            fetch(url,
                {
                    method: "POST",
                    headers,
                    body: payload
                })
                .catch((error) => {
                    console.log(error);
                    bleDevice.cancelConnection();
                    throw new Error("Network error!");
                })
                .then(res => {
                    console.log(res.status);
                    if (res.ok) {
                        if (res.status === 204) {
                            return [];
                        }
                        return res.json();
                    }
                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    }
                    else {
                        throw new Error("Something went wrong while registering to GrowHouse: \nStatusCode:" + res.status);
                    }
                })
                .then(parsedRes => {
                    console.log(url);
                    console.log("Updating registration state1");
                    dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_SUCCESS_TO_INTERNAL_CLOUD));
                    console.log("Updating registration state2");
                    setTimeout(() => {
                        console.log("Updating registration state");
                        dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_PROCESS_COMPLETE));
                        console.log("Getting growAreas:")
                        console.log("containerId:" + JSON.parse(payload).container.id);
                        dispatch(getGrowAreas(JSON.parse(payload).container.id), true)
                        dispatch(getGrowAreas(null, true));
                        dispatch(sessionEstablished());
                        console.log("Done");
                    }, 1000);
                })
                .catch(error => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            dispatch(sessionEstablished())
                            return null
                        } else {
                            if (appleKey === 'false') {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getGrowAreas(containerId, inBackground));
                            } 
                        }
                    } else {
                        bleDevice.cancelConnection();
                        alert(error.message);
                        dispatch(sessionEstablished());
                        dispatch(uiUpdateRegistrationState(RegistrationStates.REGISTRATION_FAILED_TO_INTERNAL_CLOUD));
                    }

                    alert(error.message);
                    console.log(error);
                });
        })
            .catch(error => {
                if (debug) alert("Token not found");
            });
    }
};


export const registerDevices = (device) => {

    let url = Urls.INTERNAL_DEVICE_REGISTRATION_URL;
    let payload = JSON.stringify(device);
    console.log(url);
    console.log(payload);

    if (apiDebug) {
        return dispatch => {
            console.log('Device registered..');
        }
    }

    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
            console.log('getFacilities called:' + token);
            let headers = appleKey === 'true' ? {
                Authorization: token,
                'Content-Type': 'application/json',
                appleKey
            } : {
                    Authorization: token,
                    'Content-Type': 'application/json'
                };
            fetch(url,
                {
                    method: "POST",
                    headers,
                    body: payload
                })
                .catch((error) => {
                    console.log(error);
                    throw new Error("Network error!");
                })
                .then(res => {
                    console.log(res.status);
                    if (res.ok) {
                        if (res.status === 204) {
                            return [];
                        }
                        return res.json();
                    }
                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    } else {
                        throw new Error("Something went wrong while registering Devices to GrowHouse: \nStatusCode:" + res.status);
                    }
                })
                .then(parsedRes => {
                    console.log(url);
                    console.log(JSON.stringify(parsedRes));
                    dispatch({ type: REGISTERED_DEVICE_COUNT, payload: 1 })
                    dispatch(sessionEstablished())
                })
                .catch(error => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            return null
                        } else {
                            if (appleKey === 'false') {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(registerDevices(device))
                            } 
                        }
                    } else {
                        console.log(error);
                        dispatch({ type: REGISTERED_DEVICE_COUNT, payload: -1 });
                        setTimeout(() => {
                            alert(error.message);
                        }, 500)

                    }
                });
        }).catch(error => {
            if (debug) alert("Token not found");
        });
    }
};

const getingAllGateways = (token) => {
    const url = Urls.GET_ALL_GROW_AREAS + '/all';

    return (dispatch) => {
        AsyncStorage.getItem('APPLE_LOGGED_IN').then((appleKey) => {
            let headers = appleKey === 'true' ? {
                Authorization: token,
                appleKey
            } : {
                    Authorization: token
                }
            fetch(url,
                {
                    method: "GET",
                    headers
                })
                .catch((error) => {
                    throw new Error("Network error!");
                })
                .then((res) => {
                    if (res.ok) {
                        if (res.status === 204) {
                            return [];
                        }
                        return res.json();
                    }
                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    }
                    else {
                        throw new Error("Something went wrong while fetching Gateways.. \nStatusCode:" + res.status);
                    }
                }).then((parsedRes) => {
                    console.log('parsedRes', Object.keys(parsedRes).length)
                    dispatch({ type: GET_ALL_GATEWAYS, payload: parsedRes });
                    dispatch(sessionEstablished())
                })
                .catch(async error => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            return null
                        } else {
                            if (appleKey === 'false') {
                                AsyncStorage.getItem('authToken').then((token) => {
                                    dispatch(sessionExpired());
                                    dispatch(refreshSession(appleKey))
                                    dispatch(getingAllGateways(token))
                                })
                            }
                        }
                    }
                    else {
                        alert(error.message);
                        console.log(error);
                    }
                });
        }).catch((e) => {
            console.log('error', e);

        })
    }
};

export const getAllGateways = (token, containerId, inBackground, appleKey) => {
    const url = Urls.GET_SERVER_VERSION;
    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey
        } : {
                Authorization: token
            }
        fetch(url,
            {
                method: "GET",
                headers
            })
            .catch((error) => {
                throw new Error("Network error!");
            })
            .then((res) => {
                if (res.ok) {
                    if (res.status === 204) {
                        return [];
                    }
                    return res.json();
                }
                else if (res.status === 401) {
                    throw new Error("Session Expired")
                }
                else if (res.status === 404) {
                    throw new Error("Old versoin")
                }
                else {
                    throw new Error("Something went wrong while fetching Gateways.. \nStatusCode:" + res.status);
                }
            }).then((parsedRes) => {
                console.log('parsedRes in version', Object.keys(parsedRes).length, parsedRes);
                let releaseVersion = parsedRes.releaseVersion;
                let version = parseInt(releaseVersion.split('.')[0]);
                console.log('version====', releaseVersion, version, typeof (releaseVersion), typeof (version));
                if (version >= 4) {
                    dispatch(getingAllGateways(token));
                    console.log('version greater or equal to then 4-==========================');

                } else {
                    dispatch(getGrowAreas(containerId, inBackground, true));
                    console.log('version less then 4--------=============');

                }
                dispatch(sessionEstablished())
            })
            .catch(async error => {
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getAllGateways(token, containerId, inBackground, appleKey))
                            })
                        }
                    }
                } else if (error.message === "Old versoin") {
                    dispatch(getGrowAreas(containerId, inBackground, true));
                    console.log('version less then 4--------=============');

                }
                else {
                    alert(error.message);
                    console.log(error);
                }
            });
        })
    }
}






