import { Alert, AsyncStorage } from 'react-native'
import {
    GET_FACILITIES, SET_FACILITIES,
    GET_CONTAINERS, SET_CONTAINERS, SET_CONTAINERS_BY_FACILITY_ID,
    GET_GROWAREAS, SET_GROWAREAS, SET_GROWAREAS_BY_CONTAINER_ID,
    GET_GROWSECTIONS, SET_GROWSECTIONS, SET_GROWSECTIONS_BY_GROWAREA_ID, SET_DEVICES_BY_GROWAREA_ID,
    GET_DEVICES, SET_DEVICES, SET_DEVICES_BY_GROWSECTION_ID, SET_DEVICE_TYPES,
    SET_GATEWAY_HID, SET_GATEWAY_KEYS, SET_GROWAREA_TYPES, AUTH_REMOVE_USER,
    SET_USERS, SET_USERS_BY_FACILITY_ID, SET_USER_DETAILS, SET_COUNT_BY_GROWAREA_ID, GET_ALL_GATEWAYS
} from "../actions/actionTypes";



const initialState = {
    facilities: [],
    containers: [],
    containersByFacilityId: {},
    growareas: [],
    growareasByContainerId: {},
    growAreaTypes: [],
    growsections: [],
    growsectionsByGrowAreaId: {},
    countsByGrowAreaId: {},
    devices: [],
    devicesByGrowSectionId: {},
    devicesByGrowAreaId: {},
    deviceTypes: {},
    gatewayHId: null,
    apiKey: null,
    apiSecretKey: null,
    users: [],
    usersByFacilityId: {},
    currentUser: {},
    allProvisionedGateways: {},
};

const rootReducer = (state = initialState, action) => {

    switch (action.type) {
        case AUTH_REMOVE_USER:
            console.log('Resetting ROOT Reducer...')
            return initialState;
        case GET_FACILITIES:
            return {
                ...state,
            };
        case GET_CONTAINERS:
            return {
                ...state,
            };
        case GET_GROWAREAS:
            return {
                ...state,
            };
        case GET_GROWSECTIONS:
            return {
                ...state,
            };
        case GET_DEVICES:
            return {
                ...state,
            };
        case SET_FACILITIES:
            return {
                ...state,
                facilities: action.facilities
            };
        case SET_CONTAINERS:
            return {
                ...state,
                containers: action.containers
            };
        case SET_CONTAINERS_BY_FACILITY_ID:
            let facilityId = action.facilityId
            let containers = state.containersByFacilityId;
            containers[facilityId] = action.containersByFacilityId;
            if (action.showAlert) {
                Alert.alert('No Containers found for this facility.', 'Please create one.')
            }
            return {
                ...state,
                containersByFacilityId: containers
            };
        case SET_GROWAREAS:
            return {
                ...state,
                growareas: action.growareas
            };
        case SET_GROWAREAS_BY_CONTAINER_ID:
            let containerId = action.containerId
            let growAreas = state.growareasByContainerId;
            growAreas[containerId] = action.growareasByContainerId;
            return {
                ...state,
                growareasByContainerId: growAreas
            };
        case SET_GROWAREA_TYPES:
            return {
                ...state,
                growAreaTypes: action.growAreaTypes
            };
        case SET_GROWSECTIONS:
            return {
                ...state,
                growsections: action.growsections
            };
        case SET_GROWSECTIONS_BY_GROWAREA_ID:
            let growAreaId = action.growAreaId
            let growSections = state.growsectionsByGrowAreaId;
            growSections[growAreaId] = action.growsectionsByGrowAreaId;
            return {
                ...state,
                growsectionsByGrowAreaId: growSections
            };
        case SET_COUNT_BY_GROWAREA_ID:
            let gAId = action.growAreaId;
            let countObj = state.countsByGrowAreaId;
            countObj[gAId] = action.countsByGrowAreaId;
            return {
                ...state,
                countsByGrowAreaId: countObj
            }
        case SET_DEVICES:
            return {
                ...state,
                devices: action.devices
            };
        case SET_DEVICES_BY_GROWSECTION_ID:
            let growSectionId = action.growSectionId
            let devices = state.devicesByGrowSectionId;
            devices[growSectionId] = action.devicesByGrowSectionId;
            return {
                ...state,
                devicesByGrowSectionId: devices
            };
        case SET_DEVICES_BY_GROWAREA_ID:
            let id = action.growAreaId
            let deviceList = state.devicesByGrowAreaId;
            deviceList[id] = action.devicesByGrowAreaId;
            return {
                ...state,
                devicesByGrowAreaId: deviceList
            };
        case SET_DEVICE_TYPES:
            let deviceTypeObj = {}
            action.deviceTypes.forEach(deviceType => {
                deviceTypeObj[deviceType.device_type_name] = deviceType.id
            });
            return {
                ...state,
                deviceTypes: deviceTypeObj
            };
        case SET_GATEWAY_HID:
            return {
                ...state,
                gatewayHId: action.gatewayHId
            }
        case SET_GATEWAY_KEYS:
            return {
                ...state,
                apiKey: action.apiKey,
                apiSecretKey: action.apiSecretKey
            }
        case SET_USERS:
            return {
                ...state,
                users: action.users
            };
        case SET_USERS_BY_FACILITY_ID:
            let uFacilityId = action.facilityId
            let users = state.usersByFacilityId;
            users[uFacilityId] = action.usersByFacilityId;
            return {
                ...state,
                usersByFacilityId: users
            };
        case SET_USER_DETAILS:
            return {
                ...state,
                currentUser: action.currentUser
            }
        case GET_ALL_GATEWAYS:
            return {
                ...state,
                allProvisionedGateways: action.payload
            }
        default:
            return state;
    }
};

export default rootReducer;