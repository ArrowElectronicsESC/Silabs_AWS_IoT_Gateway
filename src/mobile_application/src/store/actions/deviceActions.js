import {
    SET_DEVICES, SET_DEVICES_BY_GROWSECTION_ID, SET_DEVICES_BY_GROWAREA_ID, IS_LED_PROFILE_DELETED,
    SET_DEVICE_TYPES, GET_DEVICE_PROPERTY, GET_HISTORICAL_DATA, UI_START_LOADING_INDEVICE, CLEAR_CURRENT_DATA,
    GET_LEDCHANNEL_DATA, GET_LED_PROFILE, GET_CURRENT_VALUE_OF_LEDNODE, SET_LED_INTENCITY, GET_RECENT_DATA, DELETE_DEVICES
} from "./actionTypes";
import { uiStartLoading, uiStopLoading, authGetToken, refreshSession, sessionExpired, sessionEstablished } from "./rootActions";
import { authLogout } from './authActions';
import { AsyncStorage, Alert, Platform } from 'react-native';
import { apiDebug } from '../../../app.json';
import * as Urls from "../../Urls";

this.data = {}


export const setDevices = (devices) => {
    devices.sort(function (a, b) { return b.id - a.id })
    return {
        type: SET_DEVICES,
        devices: devices
    };
};

export const setDevicesByGrowSectionId = (growSectionId, devicesByGrowSectionId) => {
    devicesByGrowSectionId.sort(function (a, b) { return b.id - a.id })
    return {
        type: SET_DEVICES_BY_GROWSECTION_ID,
        devicesByGrowSectionId: devicesByGrowSectionId,
        growSectionId: growSectionId
    }
}

export const setDevicesByGrowAreaId = (growAreaId, devicesByGrowAreaId) => {
    devicesByGrowAreaId.sort(function (a, b) { return b.id - a.id })
    return {
        type: SET_DEVICES_BY_GROWAREA_ID,
        devicesByGrowAreaId: devicesByGrowAreaId,
        growAreaId: growAreaId
    }
}
export const getDevices = (token, growAreaId, inBackground) => {

    if (apiDebug) {
        if (false) {
//            return dispatch => {
//                if (!inBackground) dispatch(uiStartLoading());
//                let parsedRes = []
//                setTimeout(() => {
//                    dispatch(setDevicesByGrowSectionId(growSectionId, parsedRes));
//                    if (!inBackground) dispatch(uiStopLoading());
//                }, 1000);
//            }
        }
        else if (growAreaId) {
            return dispatch => {
                if (!inBackground) dispatch(uiStartLoading());
                let parsedRes = []
                setTimeout(() => {
                    dispatch(setDevicesByGrowAreaId(growAreaId, parsedRes));
                    if (!inBackground) dispatch(uiStopLoading());
                }, 1000);
            }
        }
        else {
            return dispatch => {
                if (!inBackground) dispatch(uiStartLoading());
                let parsedRes = [{ "id": 1, "device_name": "Section1Device", "device_type": { "id": 1, "device_type_name": "SoilNode" } }, { "id": 2, "device_name": "Section1Device", "device_type": { "id": 1, "device_type_name": "SoilNode" } }, { "id": 3, "device_name": "Area1Device", "device_type": { "id": 1, "device_type_name": "SoilNode" } }, { "id": 4, "device_name": "Area2Device", "device_type": { "id": 1, "device_type_name": "SoilNode" } }, { "id": 5, "device_name": "Area3Device", "device_type": { "id": 1, "device_type_name": "SoilNode" } }]
                setTimeout(() => {
                    dispatch(setDevices(parsedRes));
                    if (!inBackground) dispatch(uiStopLoading());
                }, 1000);
            }
        }
    }

    let url = Urls.GET_ALL_DEVICES
    if (false) {
        url = url + "/growsection/" + growSectionId;
    } else if (growAreaId) {
        url = url + "/growareas/" + growAreaId;
    }

    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
//            if (!inBackground) dispatch(uiStartLoading());
            let headers = appleKey === 'true' ? {
                Authorization: token,
                appleKey
            } : {
                    Authorization: token
                };

            fetch(url,
                {
                    method: "GET",
                    headers
                })
                .catch((error) => {
                    throw new Error("Network error!");
                })
                .then(res => {
                    console.log(url);
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
                        throw new Error("Something went wrong while fetching Devices.. \nStatusCode:" + res.status);
                    }
                })
                .then(parsedRes => {
                    console.log(url);
                    console.log(JSON.stringify(parsedRes));
                    if (growSectionId) {
                        dispatch(setDevicesByGrowSectionId(growSectionId, parsedRes));
                    }
                    else if (growAreaId) {
                        dispatch(setDevicesByGrowAreaId(growAreaId, parsedRes));
                    }
                    else {
                        dispatch(setDevices(parsedRes));
                    }
                    if (!inBackground) dispatch(uiStopLoading());
                    dispatch(sessionEstablished())
                })
                .catch(async error => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            dispatch(uiStopLoading());
                            return null
                        } else {
                            if (appleKey === 'false') {
                                AsyncStorage.getItem('authToken').then((token) => {
                                    dispatch(sessionExpired());
                                    dispatch(refreshSession(appleKey))
                                    dispatch(getDevices(token, growAreaId, inBackground))
                                })
                            }
                        }
                    }
                    else {
                        if (!inBackground) {
                            alert(error.message);
                        }
                        console.log(error);
                        if (!inBackground) dispatch(uiStopLoading());
                    }
                });
        }).catch((e) => {
            console.log('errorr', e);

        })

    }
};

export const setDeviceTypes = (deviceTypes) => {
    return {
        type: SET_DEVICE_TYPES,
        deviceTypes: deviceTypes
    }
}


export const getDeviceTypes = (token, inBackground) => {
    console.log('token in getDeviceTypes', token);

    if (apiDebug) {
        return dispatch => {
//            if (!inBackground) dispatch(uiStartLoading());
            let parsedRes = [{ "id": 1, "device_type_name": "Soil Node" },
            { "id": 2, "device_type_name": "Light Shield" },
            { "id": 3, "device_type_name": "Led Node" },
            { "id": 4, "device_type_name": "SCM Node" }]
            setTimeout(() => {
                console.log(JSON.stringify(parsedRes));
                dispatch(setDeviceTypes(parsedRes));
                if (!inBackground) dispatch(uiStopLoading());
            }, 1000);
        }
    }

    let url = Urls.GET_ALL_DEVICE_TYPES

    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
            let headers = appleKey === 'true' ? {
                Authorization: token,
                appleKey
            } : {
                    Authorization: token
                };
//            if (!inBackground) dispatch(uiStartLoading());
            fetch(url,
                {
                    method: "GET",
                    headers

                })
                .catch((error) => {
                    throw new Error("Network error!");
                })
                .then(res => {
                    if (res.ok) {
                        if (res.status === 204) {
                            return [];
                        }
                        return res.json();
                    }
                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    } else {
                        throw new Error("Something went wrong while fetching Device Types.. \nStatusCode:" + res.status);
                    }
                })
                .then(parsedRes => {
                    console.log(url);
                    console.log(JSON.stringify(parsedRes));
                    dispatch(setDeviceTypes(parsedRes));
                    if (!inBackground) dispatch(uiStopLoading());
                    dispatch(sessionEstablished())
                })
                .catch(async error => {
                    // dispatch(sessionExpired());
                    console.log('token-=-=-=-=-=-=-=-=-=-=-=-=', token);

                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            dispatch(uiStopLoading());
                            return null
                        } else {
                            if (appleKey === 'false') {
                                // AsyncStorage.getItem('authToken').then((token) => {
                                    dispatch(sessionExpired());
                                    dispatch(refreshSession(appleKey))
                                    dispatch(getDeviceTypes(token, inBackground));
                                // })
                            }
                        }
                    }
                    else {
                        if (!inBackground) {
                            alert(error.message);
                        }
                        console.log(error);
                        if (!inBackground) dispatch(uiStopLoading());
                    }
                });
        }).catch((e) => {
            console.log('error recevied', e);

        })
    }
};


//To fomate time string to maintain AM/PM consistency in both apps.
var formatStandardTime = (date) => {

    let time = date.toLocaleTimeString();
    time = time.split(':'); // convert to array

    // fetch
    var hours = Number(time[0]);
    var minutes = Number(time[1]);
    var seconds = Number(time[2]);

    // calculate
    var timeValue;

    if (hours > 0 && hours <= 12) {
        timeValue = "" + hours;
    } else if (hours > 12) {
        timeValue = "" + (hours - 12);
    } else if (hours == 0) {
        timeValue = "12";
    }
    timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
    timeValue += Platform.OS === 'ios' ? ':' + time[2] : (seconds < 10) ? ":0" + seconds : ":" + seconds;  // get seconds
    timeValue += Platform.OS === 'ios' ? '' : (hours >= 12) ? " PM" : " AM";  // get AM/PM

    return timeValue
}

formatDate = (value) => {
    return value.getMonth() + 1 + "/" + value.getDate() + "/" + value.getFullYear();
}

// diffrenciating response for chartjs to show
var gettingChartData = (historicalData) => {
    var labels = []
    var dataList = []


    historicalData.map((data) => {
        var dateLable = this.formatDate(new Date(data.timestamp))
            + " " + formatStandardTime(new Date(data.timestamp));
        labels.push(dateLable);

        dataList.push(data.value);

    });
    var response = [];
    response.push({ labels: labels });
    response.push({ dataList: dataList });
    console.log('SA NM, MS,CNS CASCNB ASCN ANC A', response[0], response[1]);

    return response;
}

// api for getting historical data for specific device
export const getHistoricalData = (toDate, fromDate, deviceHid, property, token, appleKey) => {
    let url = Urls.BASE_URL + `/telemetry/device/${deviceHid}?fromTimestamp=${fromDate}&toTimestamp=${toDate}&propertyName=${property}`;

    console.log("url-------------", url);
    console.log("token---------", token);
    return (dispatch) => {
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey
        } : {
                Authorization: token
            };
        console.log('parameters', toDate, fromDate, property, deviceHid, token)
        dispatch(isScreenLoading(true));
        fetch(url,
            {
                method: "GET",
                headers
            })
            .catch((error) => {
                throw new Error("Network error!");
            })
            .then(res => {
                if (res.ok) {
                    if (res.status === 204) {
                        console.log('204');

                        throw new Error("Device telementry not available");
                    }
                    return res.json();
                }
                else if (res.status === 401) {
                    throw new Error("Session Expired")
                }
                else {
                    dispatch({ type: GET_HISTORICAL_DATA, payload: [{ "statusCode": "500" }] })
                    throw new Error("Something went wrong while fetching Historical Data.. \nStatusCode:" + res.status);
                }
            })
            .then(async (historicalData) => {
                const chartData = await gettingChartData(historicalData);
                console.log("chartData", chartData.length, chartData[0], chartData[1]);
                dispatch({ type: GET_HISTORICAL_DATA, payload: chartData })
                dispatch(isScreenLoading(false));
                dispatch(sessionEstablished())
            }).catch((error) => {
                if (error.message === "Session Expired") {

                    if (token === 'sign out') {
                        dispatch(isScreenLoading(false));
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getHistoricalData(toDate, fromDate, deviceHid, property, token, appleKey))
                            })
                        }
                    }
                } else if (error.message === "Device telementry not available") {
                    dispatch({ type: GET_HISTORICAL_DATA, payload: [{ "statusCode": "204" }] })
                    dispatch(isScreenLoading(false));

                }
                else {

                    alert(error.message);
                    dispatch(isScreenLoading(false));
                }
            });
    }
};

// api for getting device property of specific device
export const getDeviceProperty = (token, deviceId) => {
    let url = Urls.BASE_URL + `/devices/properties/device/${deviceId}`
    return (dispatch) => {
        AsyncStorage.getItem('APPLE_LOGGED_IN').then((appleKey) => {
            let headers = appleKey === 'true' ? {
                Authorization: token,
                appleKey
            } : {
                    Authorization: token
                };
            fetch(url,
                {
                    method: "GET",
                    headers
                })
                .catch((error) => {
                    throw new Error("Network error!");
                })
                .then(res => {
                    if (res.ok) {
                        if (res.status === 204) {
                            return [];
                        }
                        return res.json();
                    }
                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    } else {
                        throw new Error("Something went wrong while fetching Device Property.. \nStatusCode:" + res.status);
                    }
                })
                .then((propertyList) => {
                    dispatch({ type: GET_DEVICE_PROPERTY, payload: propertyList });
                    dispatch(sessionEstablished());
                }).catch((error) => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            dispatch(isScreenLoading(false));
                            return null
                        } else {
                            if (appleKey === 'false') {
                                AsyncStorage.getItem('authToken').then((token) => {
                                    dispatch(sessionExpired());
                                    dispatch(refreshSession(appleKey))
                                    dispatch(getDeviceProperty(token, deviceId))
                                })
                            }  
                        }
                    } else {
                        alert(error.message);
                    }
                });
        }).catch((e) => {
            console.log('error', e);

        })
    }
}

// api for getting  led profile for specific LED
export const getLedProfiles = (deviceId, token, appleKey) => {
    console.log("get profiled called")
    let url = Urls.BASE_URL + `/devices/lednode/${deviceId}/profile`
    console.log("-hrfghfyhytuuty" + token);
    return (dispatch) => {
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey
        } : {
                Authorization: token
            };
        fetch(url,
            {
                method: "GET",
                headers
            })
            .catch((error) => {
                console.log("get profiled called5")
                throw new Error("Network error!");
            })
            .then(res => {
                console.log("get profiled called:" + 2);
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
                    throw new Error("Something went wrong while fetching LED Profiles.. \nStatusCode:" + res.status);
                }
            })
            .then((profiles) => {
                console.log("get profiled called3")
                console.log("profiles", profiles);
                console.log("Getting property");
                dispatch({ type: GET_LED_PROFILE, payload: profiles })
                dispatch(isScreenLoading(false));
                dispatch(sessionEstablished())
            }).catch((error) => {
                console.log("get profiled called4")
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        dispatch(isScreenLoading(false));
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getLedProfiles(deviceId, token, appleKey))
                            })
                        } 
                    }
                } else {

                    alert(error.message);
                    dispatch(isScreenLoading(false));
                }

            });
    }
}

// api for getting specific LED's channel
export const getLedChannels = (deviceId, token, appleKey) => {
    console.log('token', token);

    let url = Urls.BASE_URL + `/devices/lednode/${deviceId}/channelconfiguration`
    return (dispatch) => {
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey
        } : {
                Authorization: token
            };
        fetch(url,
            {
                method: "GET",
                headers
            })
            .catch((error) => {
                throw new Error("Network error!");
            })
            .then(res => {
                if (res.ok) {
                    if (res.status === 204) {
                        return [];
                    }
                    return res.json();
                } else if (res.status === 401) {
                    throw new Error("Session Expired")
                }
                else {
                    throw new Error("Something went wrong while fetching LED Control Data.. \nStatusCode:" + res.status);
                }
            })
            .then((ledChannels) => {
                console.log("ledChannels", ledChannels);
                console.log("Getting property");
                dispatch({ type: GET_LEDCHANNEL_DATA, payload: ledChannels })
                dispatch(sessionEstablished())
            }).catch((error) => {
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getLedChannels(deviceId, token, appleKey))
                            })
                        }
                    }

                } else {
                    alert(error.message);
                }
            });
    }
}
// api for set new channel configuration
export const setLedControls = (reqData, token, appleKey) => {
    reqData = JSON.stringify(reqData)
    let url = Urls.BASE_URL + `/devices/lednodevalue/history`
    return (dispatch) => {
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey,
            'accept': "application/json",
            'Content-Type': 'application/json'
        } : {
                'Authorization': token,
                'accept': "application/json",
                'Content-Type': 'application/json'
            };
        dispatch({ type: UI_START_LOADING_INDEVICE, payload: true });
        fetch(url,
            {
                method: "POST",
                headers,
                body: reqData
            })
            .catch((error) => {
                console.log('error', error);

                throw new Error("Network error!");
            })
            .then(res => {
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
                    throw new Error("Something went wrong while seting LED Control.. \nStatusCode:" + res.status);
                }
            })
            .then((response) => {
                console.log(response);
                console.log(JSON.stringify(response));
                var res = [
                    { 'led1': response.ch1 },
                    { 'led2': response.ch2 },
                    { 'led3': response.ch3 },
                    { 'led4': response.ch4 },
                    { 'led5': response.ch5 },
                    { 'led6': response.ch6 }
                ]
                console.log('res----------', res);
                dispatch({ type: SET_LED_INTENCITY, payload: res });

                setTimeout((() => {
                    Alert.alert('Device set', 'Set Channel Configuration Values Successfully');
                    dispatch(isScreenLoading(false));
                }), 500);
                dispatch(sessionEstablished())
            }).catch((error) => {
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        dispatch(isScreenLoading(false));
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(setLedControls(reqData, token, appleKey))
                            })
                        } 
                    }

                } else {
                    alert(error.message);
                    dispatch(isScreenLoading(false));
                }
            });
    }
}

// api for adding new profile for specific  profile
export const addProfile = (payload, token, appleKey) => {
    var reqData = JSON.stringify(payload)
    let url = Urls.BASE_URL + `/devices/lednode/profile`;

    return (dispatch) => {
        dispatch(isScreenLoading(true));
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey,
            'accept': "application/json",
            'Content-Type': 'application/json'
        } : {
                'Authorization': token,
                'accept': "application/json",
                'Content-Type': 'application/json'
            };
        fetch(url,
            {
                method: "POST",
                headers,
                body: reqData
            })
            .catch((error) => {
                console.log('error', error);

                throw new Error("Network error!");
            })
            .then(async res => {
                if (res.ok) {
                    return;
                }
                else if (res.status === 401) {
                    throw new Error("Session Expired")
                } else if (res.status === 400) {
                    let errorJson = await res.json()
                    let message = await errorJson.message;
                    throw new Error(`${message}`);
                }
                else {
                    throw new Error("Something went wrong while seting LED Control Profile.. \nStatusCode:" + res.status);
                }
            })
            .then(() => {
                dispatch(getLedProfiles(payload.device.id, token));
                dispatch(isScreenLoading(false));
                dispatch(sessionEstablished())
            }).catch((error) => {

                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        dispatch(isScreenLoading(false));
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(addProfile(payload, token, appleKey))
                            })
                        } 
                    }
                } else {

                    alert(error.message);
                    dispatch(isScreenLoading(false));
                }
            });
    }
}
export const lastTelementry = (telemntry, lengthOfDevices, deviceHid) => {
    return (dispatch) => {
        this.data[deviceHid] = telemntry;
        if (Object.keys(this.data).length === lengthOfDevices) {
            console.log('in same length', lengthOfDevices);

            dispatch({ type: GET_RECENT_DATA, payload: data });
            dispatch(uiStopLoading())
        }
    }


}

// api for get current value of intencity of specific device
export const getCurrentValue = (deviceHid, token, lengthOfDevices, appleKey) => {
    let url = Urls.BASE_URL + `/devices/${deviceHid}/telemtry/last`    
    console.log("Url:" + url + token + appleKey);
    return (dispatch) => {
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey,
        } : {
                'Authorization': token,
            };
        fetch(url,
            {
                method: "GET",
                headers
            })
            .catch((error) => {
                console.log('error', error);

                throw new Error("Network error!");
            })
            .then(res => {
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
                    throw new Error("Something went wrong while getting latest data.. \nStatusCode:" + res.status);
                }
            })
            .then((currentValueOfLedNode) => {
                console.log('in api call');

                if (lengthOfDevices) {
                    return dispatch(lastTelementry(currentValueOfLedNode, lengthOfDevices, deviceHid));
                } else {
                    let currentValueOfLedNodeResponse = {}
                    currentValueOfLedNode.map((channel) => {
                        if (channel.name === 'led1') {
                            currentValueOfLedNodeResponse.led1 = channel.value
                        }
                        if (channel.name === 'led2') {
                            currentValueOfLedNodeResponse.led2 = channel.value
                        }
                        if (channel.name === 'led3') {
                            currentValueOfLedNodeResponse.led3 = channel.value
                        }
                        if (channel.name === 'led4') {
                            currentValueOfLedNodeResponse.led4 = channel.value
                        }
                        if (channel.name === 'led5') {
                            currentValueOfLedNodeResponse.led5 = channel.value
                        }
                        if (channel.name === 'led6') {
                            currentValueOfLedNodeResponse.led6 = channel.value
                        }
                    })
                    dispatch({ type: GET_CURRENT_VALUE_OF_LEDNODE, payload: currentValueOfLedNodeResponse });
                    dispatch(sessionEstablished())
                }
            }).catch((error) => {

                if (error.message === "Session Expired") {
                    if (!token || token === 'sign out') {
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getCurrentValue(deviceHid, token, lengthOfDevices, appleKey));
                            })
                        } 

                    }

                } else {
                    if (lengthOfDevices) {
                        return dispatch(lastTelementry([{}], lengthOfDevices, deviceHid));
                    }
                    alert(error.message);
                }
            });

    }
}

//code to start/stop loading
export const isScreenLoading = (isLoading) => {
    return (
        {
            type: UI_START_LOADING_INDEVICE,
            payload: isLoading
        }
    )
}

export const getRecentData = (devices, token) => {
    return (dispatch) => {
//        dispatch(uiStartLoading())
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
            devices.map(async (device, i) => {
                await dispatch(getCurrentValue(device.deviceHid, token, devices.length, appleKey));
                console.log('deviceHid in devices', device.deviceHid);
            })
        }).catch((e) => {
            console.log('error in getting apple logged in', e.message);

        })

    }

}

export const deleteDevice = (deviceId, token) => {
    let url = Urls.DELETE_DEVICE + `/${deviceId}`;
    console.log('url delete', url);

    return (dispatch, ) => {
        AsyncStorage.getItem('APPLE_LOGGED_IN').then((appleKey) => {
            let headers = appleKey === 'true' ? {
                Authorization: token,
                appleKey,
            } : {
                    Authorization: token
                };
            fetch(url,
                {
                    method: "DELETE",
                    headers

                }).catch((error) => {
                    throw new Error("Network error!");
                })
                .then(res => {
                    if (res.ok) {
                        if (res.status === 204) {
                            return {};
                        }
                        return res.json();
                    }

                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    }
                    else {
                        throw new Error("Something went wrong while deleting Device.. \nStatusCode:" + res.status);
                    }
                }).then((res) => {
                    dispatch(uiStopLoading());
                    console.log('Delete was successfully deleted', DELETE_DEVICES, res);
                    dispatch(deleteDeviceResponse(true));

                }).catch(error => {
                    if (error.message === "Session Expired") {
                        if (token === 'sign out') {
                            return null
                        } else {
                            if (appleKey === 'false') {
                                AsyncStorage.getItem('authToken').then((token) => {
                                    dispatch(sessionExpired());
                                    dispatch(refreshSession(appleKey))
                                    dispatch(deleteDevice(deviceId, token));
                                })
                            }  
                        }
                    } else {
                        dispatch(uiStopLoading());
                        console.log('error in gateway deletion', error);
                        setTimeout(() => {
                            alert('Something went wrong while deleting Device');
                        }, 200);
                    }
                });
        }).catch((e) => {
            console.log('error', e);

        })
    }
};

export const deleteDeviceResponse = (flag) => {
    return {
        type: DELETE_DEVICES,
        payload: flag
    }
}

export const clearCurrentData = () => {
    return {
        type: CLEAR_CURRENT_DATA,
        payload: []
    }
}

export const deleteProfile = (token, id, appleKey) => {
    let url = Urls.DELETE_DEVICE + `/lednode/profile/${id}`;
    console.log('url delete', url);
    console.log('token ----.>', token);


    return dispatch => {
        dispatch(isScreenLoading(true));
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey,
        } : {
                Authorization: token
            };
        fetch(url,
            {
                method: "DELETE",
                headers

            }).catch((error) => {
                console.log('error --------> ', error, error.message);

                throw new Error("Network error!");
            })
            .then(res => {
                if (res.ok) {
                    if (res.status === 204) {
                        return {};
                    }
                    return {};
                }

                else if (res.status === 401) {
                    throw new Error("Session Expired")
                }
                else {
                    throw new Error("Something went wrong while deleting Device.. \nStatusCode:" + res.status);
                }
            }).then((res) => {
                console.log('Delete was successfully deleted', DELETE_DEVICES, res);
                dispatch(isScreenLoading(false));
                dispatch(isProfileDeleted(true));
                dispatch(sessionEstablished())
            }).catch(error => {
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(deleteProfile(token, id, appleKey));
                            })
                        }
                    }
                } else {
                    dispatch(uiStopLoading());
                    console.log('error in LED Profile deletion', error, error.message);
                    setTimeout(() => {
                        alert('Something went wrong while deleting profile..');
                    }, 200);
                }
            });
    }
}

export const isProfileDeleted = (flag) => {
    return dispatch => {
        dispatch({ type: IS_LED_PROFILE_DELETED, payload: flag });
    }
}
