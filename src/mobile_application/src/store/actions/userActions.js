import { SET_USERS, SET_USERS_BY_FACILITY_ID, SET_USER_DETAILS, APPLE_LOGGED_IN } from "./actionTypes";
import { uiStartLoading, uiStopLoading, authLogout, refreshSession, sessionExpired, sessionEstablished, authSetUser } from "./rootActions";
import { apiDebug, debug } from '../../../app.json';
import { AsyncStorage, Alert, Platform } from 'react-native';
import * as Urls from '../../Urls';
import App from "../../../App";

export const setUsers = (users) => {
    users.sort(function (a, b) { return b.id - a.id })
    return {
        type: SET_USERS,
        users: users
    };
};

export const setUsersByFacilityId = (facilityId, usersByFacilityId) => {
    usersByFacilityId.sort(function (a, b) { return b.id - a.id })
    return {
        type: SET_USERS_BY_FACILITY_ID,
        usersByFacilityId: usersByFacilityId,
        facilityId: facilityId
    }
}

export const setUserDetails = (user) => {
    console.log('Set user details called', user);
    return {
        type: SET_USER_DETAILS,
        currentUser: user
    };
};

export const getUsers = (inBackground, token, appleKey) => {
    if (apiDebug) {
        return dispatch => {
            if (!inBackground) dispatch(uiStartLoading());
            let parsedRes = [{ "id": 1, "email_id": "yashkmochi007@gmail.com", 'username': 'Yash Mochi' },
            { "id": 2, "email_id": "yashkmochi1015@gmail.com", 'username': 'Yash Mochi' },
            { "id": 3, "email_id": "snapbricks.einfochips@gmail.com", 'username': 'Snapbricks Einfochips' },
            { "id": 4, "email_id": "urv131095@gmail.com", 'username': 'Urvisha Seladiya' },
            { "id": 5, "email_id": "yashkmochi54462@gmail.com", 'username': 'Yash Mochi' }]
            setTimeout(() => {
                dispatch(setUsers(parsedRes));
                if (!inBackground) dispatch(uiStopLoading());
            }, 1000);
        }
    }

    let url = Urls.GET_ALL_USERS

    return (dispatch) => {
        AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN']).then(response => {
            let token = response[0][1];
            let appleKey = response[1][1]
        console.log(url + token + appleKey);
        console.log('getUsers called:' + token, appleKey);
        let headers = appleKey === 'true' ? {
            Authorization: token,
            appleKey,
        } : {
                Authorization: token,
            };
        if (!inBackground) dispatch(uiStartLoading());
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
                }
                else {
                    throw new Error("Something went wrong while fetching Users.. \nStatusCode:" + res.status);
                }
            })
            .then(parsedRes => {
                console.log(url);
                console.log(JSON.stringify(parsedRes));
                dispatch(setUsers(parsedRes));
                if (!inBackground) dispatch(uiStopLoading());
                dispatch(sessionEstablished())
            })
            .catch(error => {
                if (error.message === "Session Expired") {
                    if (token === 'sign out') {
                        dispatch(uiStopLoading());
                        return null
                    } else {
                        if (appleKey === 'false') {
                            AsyncStorage.getItem('authToken').then((token) => {
                                console.log('getting token in getUser l;l;l;l;l;l;l;', token);
                                
                                dispatch(sessionExpired());
                                dispatch(refreshSession(appleKey))
                                dispatch(getUsers(inBackground, token, appleKey))
                            })
                        }
                    }
                } else {
                    if (!inBackground) {
                        alert(error.message);
                    }
                    console.log(error);
                    if (!inBackground) dispatch(uiStopLoading());
                }


            });
        });
    }
};

export const verifyUser = (token, inBackground, appleKey) => {

    console.log('VerifyUser called', token, appleKey);
    if (apiDebug) {
        return dispatch => {
            if (!inBackground) dispatch(uiStartLoading());
            let parsedRes = { "id": 1, "email_id": "sombabu.gunithi@einfochips.com", 'username': 'Sombabu Gunithi', "role": 'Admin', "user_role": { "id": 1, "role_name": "Admin" } }
            setTimeout(() => {
                dispatch(setUserDetails(parsedRes));
                if (!inBackground) dispatch(uiStopLoading());
                App();
            }, 1000);
        }
    }

    let url = Urls.VERIFY_USER;
    let headers = appleKey !== undefined ? {
        Authorization: token,
        appleKey
    } : {
            Authorization: token
        }

    return dispatch => {
        console.log(url);
        console.log('verifyUser called:' + token, JSON.stringify(headers));
        if (!inBackground) dispatch(uiStartLoading());
        fetch(url,
            {
                method: "GET",
                headers: headers
            })
            .catch((error) => {
                throw new Error("Network error!");
            })
            .then(res => {
                if (res.ok) {
                    if (res.status === 204) {
                        throw new Error("User not found.. \nStatusCode:" + res.status);
                    }
                    return res.json();
                }
                else if (res.status === 401) {
                    throw new Error("Session Expired")
                }
                else {
                    throw new Error("Authentication failed. \nStatusCode:" + res.status);
                }
            })
            .then(parsedRes => {
                console.log(url);
                console.log(JSON.stringify(parsedRes));
                if (parsedRes.user_role && parsedRes.user_role.role_name && parsedRes.user_role.role_name === 'Admin') {
                    dispatch(setUserDetails(parsedRes));
                    if (!inBackground) dispatch(uiStopLoading());
                    console.log(parsedRes.username, 'user in verify process', parsedRes, appleKey);
                    if (appleKey) {
                        dispatch(authSetUser({ 'identityToken': token, 'email': parsedRes.email_id, 'id': parsedRes.id.toString(), userProfile: '' }, appleKey));

                    }
                    let APPLE_LOGGED_IN_VALUE = appleKey ? 'true' : 'false'
                    console.log('type of', typeof (APPLE_LOGGED_IN_VALUE), APPLE_LOGGED_IN_VALUE);

                    AsyncStorage.multiSet([['userName', parsedRes.username], ['APPLE_LOGGED_IN', APPLE_LOGGED_IN_VALUE]]).then(() => {
                        App(0);
                    }).catch((error) => {
                        console.log('error in saving name', error);
                    })
                    dispatch(sessionEstablished())
                }
                else {
                    throw Error("You don't have access to use this application")
                }
            })
            .catch(error => {
                if (error.message === "Session Expired") {
                    AsyncStorage.removeItem('accessToken').then(() => {
                        console.log('successfully removed');
                        if (!inBackground) {
                            dispatch(uiStopLoading());
                            Alert.alert('Authentication Failed', 'This email id is not registered on Growhouse Cloud.');
                        }
                        dispatch(authLogout(true));
                        console.log('In valid user');

                    }).catch((error) => {
                        console.log('error in removing account', error);

                    })

                } else {
                    if (!inBackground) {
                        alert(error);
                    }
                    if (!inBackground) dispatch(uiStopLoading());
                    dispatch(authLogout(true));
                    console.log(error.message);
                }
            });
    }
};
