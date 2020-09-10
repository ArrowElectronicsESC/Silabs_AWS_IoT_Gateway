import { SET_GROWAREAS, SET_GROWAREAS_BY_CONTAINER_ID, DELETE_GATEWAY, GET_ALL_GATEWAYS, SET_GROWAREA_TYPES, SET_COUNT_BY_GROWAREA_ID } from "./actionTypes";
import { uiStartLoading, uiStopLoading, countUiStartLoading, countUiStopLoading, refreshSession, sessionExpired, sessionEstablished } from "./rootActions";
import { AsyncStorage } from 'react-native';
import * as Urls from '../../Urls';
import { apiDebug } from '../../../app.json';


export const deleteGateway = (payload) => {
    let url = Urls.DELETE_GROWAREA;
    console.log("payload for gateway delete ---:"+JSON.stringify(payload));
    finalPayload=JSON.stringify(payload);
    return (dispatch) => {
            fetch(url,
                {
                    method: "POST",
                    body: finalPayload
                }).catch((error) => {
                    console.log("in network exception");
                    throw new Error("Network error!");
                   // reject(new Error("Network error!"));
                })
                .then((res) => {
                    console.log("in res---"+res);
                    if (res.ok) {
                        if (res.status === 204) {
                            return {};
                        }
                        return res;
                        //resolve(res);
                    }

                    else if (res.status === 401) {
                        throw new Error("Session Expired")
                    }
                    else {
                        throw new Error("Something went wrong while Deleting Grow Area.. \nStatusCode:" + res.status);
                       //reject(new Error("something wrong"))
                    }
                }).then((res) => {
                    console.log('Gateway was successfully deleted', DELETE_GATEWAY, res);
               // })
                }).catch(error => {
                    console.log('error in gateway deletion', error);
                    throw new Error("Something went wrong while Deleting Grow Area.");
                      // reject(new Error("Something went wrong while Deleting Grow Area."));
                    });
        
    }
    
}