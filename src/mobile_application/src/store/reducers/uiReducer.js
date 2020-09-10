import {
  UI_START_LOADING, UI_STOP_LOADING, UI_REGISTRATION_PROCESS, AUTH_REMOVE_USER,
  COUNT_UI_START_LOADING, COUNT_UI_STOP_LOADING
} from "../actions/actionTypes";

const initialState = {
  isLoading: false,
  countLoading: false,
  registrationState: 0,
  isMessage: ''
};

const uiReducer = (state = initialState, action) => {
  switch (action.type) {
    case AUTH_REMOVE_USER:
      console.log('Resetting UI Reducer...')
      return initialState;
    case UI_START_LOADING:
      return {
        ...state,
        isLoading: true,
        isMessage: action.payload
      };
    case UI_STOP_LOADING:
      return {
        ...state,
        isLoading: false
      };
    case COUNT_UI_START_LOADING:
      return {
        ...state,
        countLoading: true
      };
    case COUNT_UI_STOP_LOADING:
      return {
        ...state,
        countLoading: false
      };
    case UI_REGISTRATION_PROCESS:
      return {
        ...state,
        registrationState: action.registrationState
      };
    default:
      return state;
  }
};

export default uiReducer;