import { AUTH_SET_USER, AUTH_REMOVE_USER, OCCURED401, RESET401 } from "../actions/actionTypes";
import { authLogout } from '../actions/rootActions';
import { Alert, AsyncStorage } from 'react-native';
import { Navigation } from 'react-native-navigation';


const initialState = {
  user: null,
  retry401Count: 0,
  alertApeared: false
};
const authReducer = (state = initialState, action, dispatch) => {
  switch (action.type) {
    case AUTH_SET_USER:
      return {
        ...state,

        user: action.user
      };
    case AUTH_REMOVE_USER:
      console.log('Resetting AUTH Reducer...')
      return initialState;
    case OCCURED401:
      console.log('retry401Count', state.retry401Count);
      if (!state.alertApeared) {
        if (state.retry401Count < 20) {
          return ({ ...state, retry401Count: state.retry401Count + action.payload });
        } else {

          Alert.alert(
            'Session expired',
            'Please Sign-in again.',
            [
              {
                text: 'OK', onPress: async () => {
                  await AsyncStorage.setItem('accessToken', 'sign out');

                  Navigation.setRoot({
                    root: {
                      component: {
                        name: 'LoginScreen'
                      }
                    }
                  });
                }
              },
            ],
            { cancelable: false }
          )
          return ({ ...state, alertApeared: true, retry401Count: 20 });
        }
      } else {
        AsyncStorage.setItem('accessToken', 'sign out');
        console.log('else part of alert appeared............', state.retry401Count);

        return ({ ...state, retry401Count: 20 })
      }
    case RESET401:
      return { ...state, retry401Count: 0, alertApeared: false }
    default:
      return state;
  }
};

export default authReducer;