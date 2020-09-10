import { DELETE_GATEWAY } from "../actions/actionTypes";

const initialState = {
  isGatewayDeleted: false
};

const gatewayReducer = (state = initialState, action) => {
  switch (action.type) {
    case DELETE_GATEWAY:
      console.log('in reduces', action.type)

      return {
        ...state,
        isGatewayDeleted: action.payload
      };
    default:
      return state;
  }
};

export default gatewayReducer;