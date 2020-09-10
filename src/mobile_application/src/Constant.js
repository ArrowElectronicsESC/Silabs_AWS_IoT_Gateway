import { bleDebug } from '../app.json';
import { Platform } from 'react-native';
 
export const PRIMARY_COLOR= '#f7f7f7'
export const RED_COLOR= '#d91f2b'
export const WHITE_COLOR= '#f2f2f2'
export const BLACK_COLOR= '#555555'
export const BLUE_COLOR= '#3a84d2'
export const GREY_COLOR = '#737373'
export const GREY_OUT_RED_COLOR = '#d91f2b80'


export const LIGHT_GREY_COLOR = '#ebebeb'
export const WHITE_BACKGROUND_COLOR = '#F5FCFF'
export const WHITE_TEXT_COLOR = '#FFFFFF'
export const ORANGE_COLOR = '#f4be00'
export const DARK_GREY_COLOR = '#787878'
export const GREY_TEXT_COLOR = '#B6B6B6'
export const LIGHT_SILVER_COLOR = '#D0D0D0'
export const CHART_COLOR = '#54A0FF' // PRIMARY_COLOR //'#3cba9f' //#54a0ff

export const NAVIGATION_BACK_COLOR = PRIMARY_COLOR
export const NAVIGATION_TEXT_COLOR = '#ffffff'
export const NAVIGATION_BACK_BUTTON_COLOR = WHITE_BACKGROUND_COLOR
export const ADD_NEW_GATEWAY_BUTTON_COLOR = RED_COLOR;
export const REGISTER_BUTTON_COLOR = '#9ee470';

export const TABBAR_BUTTON_COLOR = LIGHT_GREY_COLOR
export const TABBAR_BUTTON_SELECTED_COLOR = PRIMARY_COLOR

export const BLE_PAYLOAD_PREFIX = '---BEGIN BLE DATA---'
export const BLE_PAYLOAD_SUFFIX = '----END BLE DATA----'
export const BLE_RESPONSE_STATUS = 'success'
export const SENSOR_TYPE = 'sentimate'
export const GATEWAY_TYPE = 'gateway'



export const DEVICES_COUNT = 'devices_count';
export const DEVICE_TYPE_COUNT = 'devicetype_count';
export const SCM_DEVICE_COUNT = 'scms_count';
export const SOIL_NODE_COUNT = 'soil_nodes_count';
export const LIGHT_NODE_COUNT = 'light_nodes_count';
export const HUMINITY_NODE_COUNT = 'humidity_nodes_count';
export const LIGHT_SHIELD_COUNT = 'light_shields_count';

export const DEVICE_TYPE_GATEWAY='gateway';
export const GATEWAY_SUCCESS_MSG = 'Successfully Registered Gateway'

export const DEFAULT_DEVICE_COUNT = '-'

export const KNOWN_BLE_SERVICES = {
  SERVICE_GATEWAY_PROVISION_UUID: bleDebug ? '0000fff0' : '00003a35',
  SERVICE_DEVICE_PROVISION_UUID: bleDebug ? '0000fff0' : '00003a35'
}

export const KNOWN_BLE_CHARACTERISTICS = {
  CHAR_GATEWAY_ACCOUNT_UUID: bleDebug ? '0000fff4' : '00003a39',
  CHAR_GATEWAY_WIFI_MAC_UUID: bleDebug ? '0000fff1' : '00003a27',
  CHAR_DEVICE_DISCOVER_COMMAND_UUID: bleDebug ? '0000fff1' : '00003a36',
  CHAR_DEVICE_DISCOVER_PROVISION_UUID: bleDebug ? '0000fff2' : '00003a37',
  CHAR_DEVICE_PROVISION_CALLBACK_UUID: bleDebug ? '0000fff4' : '00003a39',
  CHAR_GATEWAY_CONNECTIVITY: bleDebug ? '0000fff4' : '00003a39',
  CHAR_GATEWAY_DELETION: bleDebug ? '0000fff4' : '00003a40'
}


export const DEFAULT_NAVIGATOR_STYLE = {
  topBar: {
    visible: true,
    animate: true,
    elevation: 0,
    shadowOpacity: 0,
    drawBehind: false,
    hideOnScroll: false,
    background: {
      color: NAVIGATION_BACK_COLOR,
    },
    backButton: {
      color: '#fff',
    },
    title: {
      color: '#fff',
    }
  },
  layout: {
    orientation: ['portrait'] // An array of supported orientations
  },
  sideMenu: {
    left: {
      visible: false,
      enabled: Platform.OS === 'android',
    }
  }
};


export const CONNECTION_TIMEOUT = 60000;

export const  propertyList = ["temperature","CO2","PIR","humidity"];
export const TEMPERATURE = 'temperature';
export const CO2 = 'CO2';
export const HUMIDITY = 'humidity';
export const PIR = 'PIR';

export const INITIAL_MSG = 'No live data available';


export const rootStack = {
  0: 'FACILITY',
  1: 'CONTAINER',
  2: 'GROWAREA',
  3: 'GROWSECTION',
  4: 'DEVICES'
};