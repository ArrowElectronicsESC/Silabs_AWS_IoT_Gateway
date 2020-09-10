import { AsyncStorage } from "react-native";
import { GoogleSignin, statusCodes } from 'react-native-google-signin';
import { AUTH_SET_USER, AUTH_REMOVE_USER, OCCURED401, RESET401 } from "./actionTypes";
//import { disconnectBleinGrowarea } from '../../screens/GrowAreasIOS';
import { disconnectBleinDevice } from '../../screens/Devices';
//import bleReducer from '../reducers/bleReducer';
import { uiStopLoading, uiStartLoading, } from "./rootActions";



export const authSetUser = (user, appleKey) => {
  return dispatch => {
    console.log('setting in asyncStorage', user, appleKey);
    if (!appleKey) {
      AsyncStorage.multiSet([
        ['accessToken', user.accessToken],
        ['userProfile', user.user.photo || ''],
        ['userEmail', user.user.email],
        ['userId', user.user.id]])
        .then(() => {
          dispatch(storeUser(user));
        })
        .catch((error) => {
          alert("Error while Login:" + error);
        });
    } else {
      console.log(' ', user, user.identityToken);

      AsyncStorage.multiSet([
        ['accessToken', user.identityToken],
        ['userProfile', user.userProfile],
        ['userEmail', user.email || 'sds@s.c'],
        ['userId', user.id]])
        .then(() => {
          dispatch(storeUser(user));
        })
        .catch((error) => {
          alert("Error while Login:" + error);
        });
    }
  }
};

export const authLogout = (inBackground) => {
 // console.log("Logout called", bleReducer.bleManager);
  return (dispatch) => {

    dispatch(uiStartLoading())
    AsyncStorage.clear()
      .then(() => {
        if (!inBackground) {
          console.log('start disconnecting');
          disconnectBleinDevice();
         // disconnectBleinGrowarea();
          console.log('end disconnecting');
        }
        dispatch(sessionEstablished())
        dispatch(uiStopLoading())
      }).catch((e) => {
        console.log('error in deleting devices', e.message);

      });
    GoogleSignin.revokeAccess().then(() => {
      GoogleSignin.signOut().catch(error => {
        console.log('error in google sign out', error);
      }).then((e) => {
        console.log('sucess of google sign out');
      })

    }).catch(error => {
      console.log('error in revock access', error);
    });

    dispatch(authRemoveToken());
  };
};

export const refreshSession = (appleKey) => {
  console.log("in method");
  return (dispatch) => {
    if (appleKey === 'false') {
      GoogleSignin.signInSilently().then((userInfo) => {
        console.log("SignInSilent success")
        Promise.resolve(authSetUser(userInfo))
        console.log('token-=-=-=-=-=-=-=-=-=', userInfo.accessToken);
        AsyncStorage.setItem('accessToken', userInfo.accessToken)
      }).catch(error => {
        console.log("Error:--------------" + error + "\nErrorCode:" + error.code);
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log("SIGN_IN_CANCELLED") // user cancelled the login flow
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log("IN_PROGRESS")  // operation (f.e. sign in) is in progress already
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log("PLAY_SERVICES_NOT_AVAILABLE")  // play services not available or outdated
          alert("Play services not available in your device.");
        } else {
          console.log("OTHER_REASON:\nErrorCode:" + error.code + "\nError:" + error.message);     // some other error happened
        }
      });
    } else {
      console.log('else in refreshSession', appleKey);

    }
  }
}

export const storeUser = (user) => {
  console.log("setting user object")
  return {
    type: AUTH_SET_USER,
    user: user
  }
}

export const authRemoveToken = () => {
  return {
    type: AUTH_REMOVE_USER
  };
};

export const sessionExpired = () => {
  return {
    type: OCCURED401,
    payload: 1
  }
}

export const sessionEstablished = () => {
  return {
    type: RESET401
  }
}
