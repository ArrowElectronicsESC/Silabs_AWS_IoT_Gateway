import React, { Component } from 'react';
import {
  RefreshControl, StyleSheet, Text, View, FlatList, ActivityIndicator, ScrollView,Dimensions,
  TouchableOpacity, Modal, Image, PermissionsAndroid, Alert, Platform, Button, Picker, AsyncStorage
} from 'react-native';
import  DialogInput  from 'react-native-dialog-input-custom';
import * as Constant from '../Constant';
import * as Urls from '../Urls';
import * as RegistrationStates from '../RegistrationStates';
import { gateway_discovery_name_prefix, displayName as appName, debug ,bleDebug} from './../../app.json';
import { connect } from 'react-redux';
import {
  deleteGateway, deleteGatewayResponse,uiStartLoading,uiStopLoading,
  uiUpdateRegistrationState, addBleDevice,removeBleDevicefromGrowarea
} from '../store/actions/rootActions';
import { BleManager } from 'react-native-ble-plx';
import { TextField } from 'react-native-material-textfield';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import { setBleManager } from '../store/actions/bleActions';
import Base64 from './../utils/Base64';
import { SearchBar } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MultiSelect from 'react-native-multiple-select';
import { Navigation } from 'react-native-navigation';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
import RadioForm, { RadioButton, RadioButtonInput, RadioButtonLabel } from 'react-native-simple-radio-button';
import DeviceInfo from 'react-native-device-info';
const { width, height } = Dimensions.get('window');

var radio_props = [
  { label: 'Hardware', value: 0 },
  { label: 'Software', value: 1 }
];

class GrowAreas extends Component {

  static get options() {
    return {
      ...Constant.DEFAULT_NAVIGATOR_STYLE
    };
  }
  gatewayCharacteristics = {};
  visible = false;
  bleDevice = null;
  alreadyRegistredGateways = [];
  reteyConnection = 0;
  reSendingPayloadCount = 0;
  errorCode = 0;
  provisionCallbackCharSubscription = null;
  timeoutValue=null;
  loading=false;
  isVisible=false;
  devicemacAddress = null;

  constructor(props) {
    super(props);
    Navigation.events().bindComponent(this);
    if (!this.props.bleManager) this.props.onSetBleManager(new BleManager());
    this.state = {
      refreshing: false,
      modalVisible: false,
      registrationModalVisible: false,
      redioModelVisible: false,
      swGatewayModelVisible: false,
      selectedRedioValue: 0,
      discoveredGateways: {},
      containerId: '',
      facilityId: '',
      gatewayId:'',
      bleMessage: '',
      bleError: '',
      gatewayUId: '',
      selectedUsers: [],
      isContanerFetched: false,
      users: [],
      gateways: [],
      sensors:[],
      curerentUser: '',
      email:'',
      seleneVersion: '',
      selectedGateway:'',
      editedItem : '',
      isGotAlreadyRegistredGateway: false

    };
  }

  componentDidAppear() {
    this._onRefresh();
    this.props.bleManager.destroy()
    this.props.onSetBleManager(new BleManager());
    this.visible = true;
    this.forceUpdate();

    AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN', 'userEmail','email','sensorList','emailNotify','SmsNotify']).then(response => {
      let token = response[0][1];
      let appleKey = response[1][1];
      let currentUser = response[2][1];
      let email = response[3][1];
      let sensors = JSON.parse(response[4][1]);
      let emailState = JSON.parse(response[5][1]);
      let smsState = JSON.parse(response[6][1]);

      this.setState({ token, appleKey, currentUser,email,sensors,emailState,smsState}, () => {

       
      });
    }).catch((e) => {
      console.log('error in geting asyncStorage\'s item:', e.message);
    })
  }

  componentDidDisappear() {
    console.log('growARea, disappper', this.state.modalVisible);
    this.visible = false;
    this.setState({ modalVisible: false, registrationModalVisible: false });
    this.props.bleManager.destroy()
    this.props.onSetBleManager(new BleManager());
  }



  // static getDerivedStateFromProps(nextProps, prevState) {
  //   if (nextProps.selectedContainer) {
  //     return {
  //       ...prevState,
  //       containerId: nextProps.selectedContainer.id,
  //       facilityId: nextProps.selectedContainer.facilityId
  //     };
  //   }
  //   else if (nextProps.selectedFacility) {
  //     return {
  //       ...prevState,
  //       facilityId: nextProps.selectedFacility.id
  //     }
  //   }
  //   return null;
  // }

  _onRefresh = () => {
    this.setState({ refreshing: true, searching: true, filterKey: '' });
    
    AsyncStorage.multiGet(['accessToken', 'APPLE_LOGGED_IN', 'userEmail','email']).then(response => {
      let token = response[0][1];
      let appleKey = response[1][1];
      let email=response[3][1];

      console.log("finally email----"+email);
      this.setState({ email: email});
      if (this.search) this.search.clear();
      this.setState({ refreshing: false });
    }).catch((e) => {
      console.log('error in geting asyncStorage\'s item in _onRefrreshGrowArea: ', e.message);
    })
  }

  onDisconnect = growArea => {
    if (growArea.grow_area_uid) {
      if (this.props.bleManager) {
        this.props.bleManager.cancelDeviceConnection(growArea.grow_area_uid)
          .then(device => {
            console.log(device.id + " disconnected by user");
            return {}
          })
          .catch(error => {
            console.log('error:' + error);
          })
      }
      else {
        this.props.onSetBleManager(new BleManager());
        this.onDisconnect(growArea);
      }
    }
  }

  setRedioModalVisible(visible) {
    this.setState({ redioModelVisible: visible })
  }

  setSwGatewayModalVisivle(visible) {
    this.setState({ swGatewayModelVisible: visible })
  }

  async gatewayProvisionProcess() {
    this.setRedioModalVisible(false)
    console.log(this.state.selectedRedioValue);
    if (this.state.selectedRedioValue === 1) {
      this.setState({ swGatewayModelVisible: true })
    } else {
      this.props.bleManager.destroy()
      this.props.onSetBleManager(new BleManager());
      this.props.bleManager.disable()
      setTimeout(() => { this.props.bleManager.enable() }, 1000);
      setTimeout(() => { this.showGatewayDiscoveryModal(true) }, 2000);
      console.log('already provisioned gateways', this.props.alreadyProvisionedGateway.length);
      this.alreadyRegistredGateways = await this.alreadyRegistredGateway(this.state.gateways);
      this.setState({ discoveredGateways: {}, waitingForGatewayLoader: true, bleMessage: '', bleError: '' })
    }
  }

  swGatewayRegisterSubmitClickHandler = () => {
    this.setState({ swGatewayModelVisible: false })
    DeviceInfo.getMacAddress().then(mac => {
      this.devicemacAddress = mac
      console.log(mac);
    });
    setTimeout(() => {
      let payloadnew = {}
      let regEx = /^[a-zA-Z][a-zA-Z_.-]{0,1}[ a-z|A-Z|0-9|_.:-]*$/;
      if (this.state.gatewayName.trim() !== '' && this.state.gatewayName.length <= 30 && regEx.test(this.state.gatewayName.trim())) payloadnew.name = this.state.gatewayName.trim();
      else { Alert.alert("Invalid Gateway name.", "Invalid Gateway name! Maximum length is 30. Name should start with alphabet and may contain dot, underscore, space and numeric value."); return; }
      if ((this.state.gatewayDescription != undefined) && (this.state.gatewayDescription.trim().length <= 200)) payloadnew.description = this.state.gatewayDescription;
      else { alert("Please provide valid gateway description. (Maximum length 200)"); return; }
      let payload = [
        {
          gatewayName: this.state.gatewayName,
          macAddress: this.devicemacAddress,
          userId: JSON.parse(this.state.email),
          deviceType: "gateway",
          gatewayType: "SW",
          description: this.state.gatewayDescription
        }
      ];
      this.provisionSwGatewayApi(payload);
    }, 1000);

  }

  async provisionSwGatewayApi(payload) {
    this.props.uiStartLoading("Provisioning software gateway ...");
    let url = Urls.CREATE_GROWAREA;
    console.log("payload for software gateway provision ---:" + JSON.stringify(payload));
    try {
      const response = await fetch(url, {
        method: "POST", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        const msg = await response.json();
        let gatewayId = msg["group"]["thingGroupName"]
        gateways = this.state.gateways;
        payload[0]['gatewayId'] = gatewayId;
        gateways.push(payload[0]);
        AsyncStorage.setItem('listGateway', JSON.stringify(gateways)).then((token) => {
          this.setState({ gateways });
        }).catch((error) => {
          console.log('error in saving name', error);
        })
        AsyncStorage.setItem('emailNotify', "true");
        AsyncStorage.setItem('SmsNotify', "false");
        this.props.uiStopLoading();
        alert(Constant.GATEWAY_SUCCESS_MSG);

      }
      else {
        this.props.uiStopLoading();
        alert("Something went wrong while provision gateway. Please try again");
      }
    } catch (err) {
      this.props.uiStopLoading();
      alert("Something went wrong while provision gateway. Please try again");
    }
  }

  async deletionSwGatewayApi() {
    payload= await this.createGatewayDeletionPayload();
    this.props.uiStartLoading("Deleting software Gateway ...");
    let url = Urls.DELETE_GROWAREA;
    console.log("payload for software gateway delete ---:"+JSON.stringify(payload));
    try{
          const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                  body: JSON.stringify(payload)})
          if(response.ok)
          {
            const msg = await response.json();
            console.log("response in json---"+msg);
            this.props.uiStopLoading();
            this.setGatewayAfterDeletion(this.state.gatewayId);
            alert("Gateway deleted successfully.");
          }
          else
          {
            this.props.uiStopLoading();
            alert("Something went wrong while deletion. Please try again");
          }
    }catch(err)
    {
      this.props.uiStopLoading();
      alert("Something went wrong while deletion. Please try again");
    }

  }
  showGatewayDiscoveryModal(visible) {
    if (this.props.registrationState === RegistrationStates.REGISTRATION_PROCESS_COMPLETE) {
      this.props.onUpdateRegistrationState(RegistrationStates.REGISTRATION_NOT_STARTED);
      this.setRegistrationModalVisible(false);
      this.setState({
        discoveredGateways: {}
      });
    }

    if (visible) {
      this.gatewayCharacteristics = {};
      const subscription = this.props.bleManager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          this.props.bleManager.destroy()
          this.props.onSetBleManager(new BleManager());
          setTimeout(() => {
            if (this.state.isGotAlreadyRegistredGateway) {
              this.scanAndConnect();
              this.setState({ modalVisible: true, showCancelButton: true });
              subscription.remove();
            } else {
              this.setState({ modalVisible: false, showCancelButton: false });
            }
          }, 1000)
        }
        else if (state === 'PoweredOff') {
          console.log("Ble in power off state");
          this.props.bleManager.enable()
          setTimeout(()=>{this.showGatewayDiscoveryModal(true)},1000);
        }
      }, true);
    }

    else {
      this.setState({
        modalVisible: visible,
        discoveredGateways: {}
      });
      this.props.bleManager.stopDeviceScan();
    }
  }

  showGatewayDiscoveryModalForDeleteGateway(visible) {
    this.props.uiStartLoading("Deleting Gateway....");
    if (visible) {
      this.gatewayCharacteristics = {};
      const subscription = this.props.bleManager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          this.props.bleManager.destroy()
          this.props.onSetBleManager(new BleManager());
          setTimeout(() => {
            if (this.state.isGotAlreadyRegistredGateway) {
              this.scanAndConnectForDeleteGateway()
                this.setState({ modalVisible: false, showCancelButton: false });
                subscription.remove();
            } else {
              this.setState({ modalVisible: false, showCancelButton: false });
            }
          }, 1000)
        }
        else if (state === 'PoweredOff') {
          this.props.uiStopLoading();
          this.props.bleManager.enable()
          setTimeout(()=>{this.showGatewayDiscoveryModalForDeleteGateway(true)},1000);
        }
      }, true);
    }
  console.log("end------------");

  }

  gatewayRegisterClickHandler = (bleGateway) => {
    console.log('register called', bleGateway);
    this.bleDevice = bleGateway;
    this.props.bleManager.stopDeviceScan();
    this.props.onUpdateRegistrationState(RegistrationStates.REGISTRATION_NOT_STARTED);
    if (Platform.OS === 'android') {
      this.setState({
        gatewayName: bleGateway.name,
        gatewayUId: bleGateway.id,
        growAreaType: {},
        gatewayDescription: 'My Description',
        registrationModalVisible: true,
        bleMessage: 'Connecting to device..',
        bleError: '',
        gatewayMacId: bleGateway.id,
        waitingForGatewayLoader: false
      })
      console.log("gatewayMacId set");
    }
    else {
      let macId = bleGateway.name.split('_').slice(-1).pop();
      this.setState({
        gatewayName: bleGateway.name,
        gatewayUId: bleGateway.id,
        growAreaType: {},
        gatewayDescription: 'My Description',
        registrationModalVisible: true,
        bleMessage: 'Connecting to device..',
        bleError: '',
        gatewayMacId: bleGateway.name,
        waitingForGatewayLoader: false
      })
    }
    this.connectAndDiscoverCharacteristics(bleGateway);
  }

  gatewayRegisterSubmitClickHandler = () => {
    this.errorCode = 0;
    let payload = {}
    let regEx = /^[a-zA-Z][a-zA-Z_.-]{0,1}[ a-z|A-Z|0-9|_.:-]*$/;
    if (this.state.gatewayName.trim() !== '' && this.state.gatewayName.length <= 30 && regEx.test(this.state.gatewayName.trim())) payload.name = this.state.gatewayName.trim();
    else { Alert.alert("Invalid Gateway name.", "Invalid Gateway name! Maximum length is 30. Name should start with alphabet and may contain dot, underscore, space and numeric value."); return; }
    if (this.state.gatewayUId.trim()) payload.uid = this.state.gatewayUId;
    else { alert("GatewayUId not found."); return; }
    if (this.state.gatewayDescription.trim().length <= 200) payload.description = this.state.gatewayDescription;
    else { alert("Please provide valid gateway description. (Maximum length 200)"); return; }
    
    
    payload.users = this.props.users.filter(item => {
      return this.state.selectedUsers.includes(item.email_id);
    });
    payload.osName = 'Linux';
    this.props.onUpdateRegistrationState(RegistrationStates.FETCHING_CONFIG_FROM_SUCCESS);
  }

  retryRegistration = () => {
    console.log("Retry registration called.");
    this.gatewayRegisterSubmitClickHandler();
  }

  getRegistrationMessage = (registrationState) => {
    switch (registrationState) {
      case RegistrationStates.REGISTRATION_STARTED:
        return "Registration started ..."
      case RegistrationStates.REGISTRATION_SUCCESS:
        return "Registered Successfully"
      case RegistrationStates.REGISTRATION_FAILED:
        return "Registration Failed"
      case RegistrationStates.FETCHING_CONFIG_FROM_STARTED:
        return "Fetching Configuration ..."
      case RegistrationStates.FETCHING_CONFIG_FROM_SUCCESS:
        return "Configuration Fetched Successfully"
      case RegistrationStates.FETCHING_CONFIG_FROM_FAILED:
        return "Failed to Fetch Configuration ..."
      case RegistrationStates.REGISTRATION_STARTED_TO_INTERNAL_CLOUD:
        return "Registering to EFR32 IoT Gateway ..."
      case RegistrationStates.REGISTRATION_SUCCESS_TO_INTERNAL_CLOUD:
        return "Registered to " + appName + " Successfully"
      case RegistrationStates.REGISTRATION_FAILED_TO_INTERNAL_CLOUD:
        return "Registration to " + appName + " Failed"
      case RegistrationStates.SENDING_PAYLOAD_TO_GATEWAY:
        return "Sending data to Gateway"
      case RegistrationStates.SENDING_DATA_TO_GATEWAY_UNSUCCESSFULL:
        return "Connection was interrupted"
      default:
        return 'Invalid registration state found:' + registrationState;
    }
  }

  setRegistrationModalVisible(visible, disconnectDeivce) {
    if (visible) {
      this.setState({
        registrationModalVisible: true,
        bleMessage: '',
        bleError: '',
        growAreaType: {},
        gatewayDescription: '',
        facilityPicked: false,
        containerPicked: false,
        selectedUsers: []
      });

    }
    else {
      if (this.state.facilityPicked) {
        this.setState({
          registrationModalVisible: false,
          facilityId: '',
          facilityPicked: false,
          containerId: '',
          containerPicked: false
        });
      }
      else {
        this.setState({
          registrationModalVisible: false,
        });
      }
      if (this.bleDevice && disconnectDeivce) {
        try {
          this.bleDevice.isConnected().then((isDeviceConnected) => {
            console.log('isDeviceConnected in groearea', isDeviceConnected);
            if (isDeviceConnected) {
              this.bleDevice.cancelConnection().then(() => {
                console.log('successfully disconnected in Growrea');
              }).catch((error) => {
                console.log(' error in disconnecting BLE from sign out Growarea', error);
              })
            } else {
              console.log('gateway is not connected!!');
            }
          }).catch((error) => {
            console.log(' error in getting state of ble-device in Growarea ', error);
          })
          this.setState({
            registrationModalVisible: false,
          });
        } catch (error) {
          console.log(' error in try catch block ', error);

        }

      }
    }
  }

  scanAndConnect() {
    let discoveredGateways = {}
    console.log("Scanning devices:");
    if (this.props.bleManager) {
      console.log("Scanning devices:1");
      this.props.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log("Scanning devices:" + 2);
          this.setState({ modalVisible: false });
          if (error.errorCode === 101) {
            //Device is not authorized to use BluetoothLE
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please provide access.')
            }
            else {
              Promise.resolve(requestLocationPermission())
                .then(sources => {
                  this.showGatewayDiscoveryModal(true);
                  return;
                }).catch(error => {
                  alert(error);
                });
            }
          }
          else if (error.errorCode === 601) {
            //Location services are disabled
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please enable it.')
              this.showGatewayDiscoveryModal(false);
            }
            else {
              RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                .then(data => {
                  this.showGatewayDiscoveryModal(true);
                  return;
                }).catch(error => {
                  this.showGatewayDiscoveryModal(true);
                  return;
                });
            }
          }
          else {
            alert(error.errorCode + ":" + error.message);
          }
          return;
        }
        console.log("Scanning devices:3 chnage", device.name);
        if (device.name && device.name.startsWith(gateway_discovery_name_prefix) && device.name && !(this.alreadyRegistredGateways.includes(device.id))) {
          let preLength = Object.keys(discoveredGateways).length;
          discoveredGateways[device.id] = device;
          let latestLength = Object.keys(discoveredGateways).length;
          if (preLength < latestLength) {
            console.log("Name:" + device.name + "\nMac address:" + device.id);
            this.setState({ discoveredGateways: discoveredGateways })
            console.log('device found so stop interval and scanning');
          }
        }
      });
    }
  }

  async scanAndConnectForDeleteGateway() {
    let timerStartedCount=0;
    let discoveredGateways = {}
    payload= await this.createGatewayDeletionPayload();
    console.log("Scanning devices:");
    if (this.props.bleManager) {
      console.log("Scanning devices:1");
      if(timerStartedCount==0){
        this.timeoutValue= setTimeout(() => {
           console.log("set timeout called");
           this.props.bleManager.stopDeviceScan();
           this.props.uiStopLoading();
           Alert.alert('Gateway is not reachable at this time.','Factory reset will be required after deletion Are you sure want to do Force delete of Gateway?',
                [
                 {
                   text: 'Cancel', onPress: () => {
                     console.log('delete operation was canceled.');
                   }, style: 'cancel'
                 },
                 {
                   text: 'Delete', onPress: async() => {
                    this.props.uiStartLoading("Deleting Gateway ...");
                    let url = Urls.DELETE_GROWAREA;
                    console.log("payload for gateway delete ---:"+JSON.stringify(payload));
                    try{
                          const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                                  body: JSON.stringify(payload)})
                          console.log("res---"+JSON.stringify(response));
                          if(response.ok)
                          {
                            const msg = await response.json();
                            console.log("response in json---"+msg);
                            this.props.uiStopLoading();
                            this.setGatewayAfterDeletion(this.state.gatewayId);
                            alert("Gateway deleted successfully. Please do Factory Reset of Gateway");
                          }
                          else
                          {
                            this.props.uiStopLoading();
                            alert("Something went wrong while deletion. Please try again");
                          }
                    }catch(err)
                    {
                      this.props.uiStopLoading();
                      alert(err.message);
                    }

                   }
                 },
               ],
               { cancelable: true }
             ) 
         }, 60000);
       }
       timerStartedCount++;
      this.props.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log("Scanning devices:" + 2);
          this.setState({ modalVisible: false });
          if (error.errorCode === 101) {
            //Device is not authorized to use BluetoothLE
            if (Platform.OS === 'ios') {
              this.props.uiStopLoading();
              alert(appName + ' app wants to use location services.. please provide access.')
            }
            else {
              Promise.resolve(requestLocationPermission())
                .then(sources => {
                  this.props.uiStopLoading();
                  this.showGatewayDiscoveryModal(false);
                  return;
                }).catch(error => {
                  this.props.uiStopLoading();
                  alert(error);
                });
            }
          }
          else if (error.errorCode === 601) {
            //Location services are disabled
            if (Platform.OS === 'ios') {
              this.props.uiStopLoading();
              alert(appName + ' app wants to use location services.. please enable it.')
              this.showGatewayDiscoveryModal(false);
            }
            else {
              RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                .then(data => {
                  this.props.uiStopLoading();
                  this.showGatewayDiscoveryModal(false);
                  return;
                }).catch(error => {
                  this.props.uiStopLoading();
                  this.showGatewayDiscoveryModal(false);
                  return;
                });
            }
          }
          else {
            this.props.uiStopLoading();
            alert(error.errorCode + ":" + error.message);
          }
          return;
        }
        console.log("Scanning devices:3 chnage", device.name);
        console.log("Scanning devices:3 chnage", device.id);
        console.log("already discovered devices--"+this.alreadyRegistredGateways);
        console.log("selected gateway--"+this.state.selectedGateway);
        if (device.name && device.name.startsWith(gateway_discovery_name_prefix) && device.name && (this.state.selectedGateway === device.id)) {
          let preLength = Object.keys(discoveredGateways).length;
          discoveredGateways[device.id] = device;
          let latestLength = Object.keys(discoveredGateways).length;
          if (preLength < latestLength) {
            console.log("Name:" + device.name + "\nMac address:" + device.id);
            this.setState({ discoveredGateways: discoveredGateways })
            this.props.bleManager.stopDeviceScan();
            clearTimeout(this.timeoutValue);
            console.log('device found so stop timeout and scanning');
            this.props.uiStopLoading();
            this.deleteGatewayAPI(payload,device);

          }
        }  
            
      });
    }
  }

setGatewayAfterDeletion(gatewayId)
{
  let gateways=this.state.gateways;
  let filteredList = gateways.filter((item) => item.gatewayId !== gatewayId);
  AsyncStorage.setItem('listGateway',JSON.stringify(filteredList)).then(() => {
    this.setState({gateways:filteredList});
    }).catch((error) => {
            console.log('error in saving list of gateway to storage', error);

        })  
  let sensors=this.state.sensors;
  let filteredSensorList = sensors.filter((item) => item.gatewayId !== gatewayId);
  AsyncStorage.setItem('sensorList',JSON.stringify(filteredSensorList)).then(() => {
  this.setState({sensors:filteredSensorList});
    }).catch((error) => {
        console.log('error in saving list of sensors to  local storage', error);
      })  

}

disconnectBleConnection()
{
  try {
    this.bleDevice.isConnected().then((isDeviceConnected) => {
      console.log('isDeviceConnected in groearea', isDeviceConnected);
      if (isDeviceConnected) {
        this.bleDevice.cancelConnection().then(() => {
          console.log('successfully disconnected in Growrea');
        }).catch((error) => {
          console.log(' error in disconnecting BLE from sign out Growarea', error);
        })
      } else {
        console.log('gateway is not connected!!');
      }
    }).catch((error) => {
      console.log(' error in getting state of ble-device in Growarea ', error);
    })
  } catch (error) {
    console.log(' error in try catch block ', error);

  }

}

createGatewayDeletionPayload()
{
  sensors=this.state.sensors;
  console.log("sensors---"+JSON.stringify(sensors));
  newSensorList=[];
  gatewayObj={"gatewayId":this.state.gatewayId,"deviceType":Constant.DEVICE_TYPE_GATEWAY}
  if(sensors.length)
  {
    sensors.map((item)=>
    {
      obj={}
      if(item.gatewayId==this.state.gatewayId)
      {
        obj['gatewayId']=item.gatewayId
        obj['sensorId']=item.sensorId
        obj['deviceType']=item.device_type
        newSensorList.push(obj);
      }
    }
    )
   newSensorList.push(gatewayObj);
   return newSensorList;
  }
  else{
   newSensorList.push(gatewayObj);
   return newSensorList;
  }
}

async deleteGatewayAPI(payload,device)
{
  this.props.uiStartLoading("Deleting Gateway ...");
  let url = Urls.DELETE_GROWAREA;
  console.log("payload for gateway delete ---:"+JSON.stringify(payload));
  try{
        const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                body: JSON.stringify(payload)})

        if(response.ok)
        {
          const msg = await response.json();
          this.props.uiStopLoading();
          this.setGatewayAfterDeletion(this.state.gatewayId);
          this.gatewayRegisterClickHandlerForDeleteGateway(device);
        }
        else
        {
          this.props.uiStopLoading();
          alert("Something went wrong while deletion. Please try again");
        }
      }catch(err)
      {
        this.props.uiStopLoading();
        alert("Something went wrong while deletion. Please try again");
      }
  }

  sendGatewayDeletionPayload()
  {
    let payload = [
      {
      macAddress: this.state.gatewayUId,
      deviceType: "gateway",
      }
    ]; 
  console.log("Checking characristics for send payload to BLE");
  console.log("UId:" + this.state.gatewayUId);
  var gatewayRegCharFound = false;
  Object.keys(this.gatewayCharacteristics[this.state.gatewayUId]).every((characteristicPrefix) => {
    console.log(characteristicPrefix, Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_DELETION);
    console.log(characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_DELETION);
    if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_DELETION) {
      gatewayRegCharFound = true;
      this.writeCharacteristics(this.gatewayCharacteristics[this.state.gatewayUId][characteristicPrefix], payload, (this.gatewayCharacteristics[this.state.gatewayUId].mtu - 3), 'gatewayInfo')
      alert('Gateway deleted successfully..');
      this.props.uiStopLoading();
      this._onRefresh();
    } else {
      return true;
    }
  });
  }

  gatewayRegisterClickHandlerForDeleteGateway = (bleGateway) => {
    console.log('register called in register delete click handler', bleGateway);
    this.bleDevice = bleGateway;
    if (Platform.OS === 'android') {
      this.setState({
        gatewayName: bleGateway.name,
        gatewayUId: bleGateway.id,
        growAreaType: {},
        gatewayDescription: 'My Description',
        registrationModalVisible: true,
        bleMessage: 'Connecting to device..',
        bleError: '',
        gatewayMacId: bleGateway.id,
        waitingForGatewayLoader: false
      })
      console.log("gatewayMacId set");
    }
    this.connectAndDiscoverCharacteristicsForDeleteGateway(bleGateway);
  }


  connectAndDiscoverCharacteristicsForDeleteGateway(device) {
    console.log("in device connection function");
    this.errorCode = 0;
    device.connect()
      .then((device) => {
        this.errorCode = 1;
        this.props.onSignoutDisconnectFromGrowarea(device);
        this.setState({
          registrationModalVisible: true,
          bleMessage: 'Discovering services and characteristics',
          bleError: ''
        })
        console.log("Discovering services and characteristics");
        this.props.onAddDevice(device);
        return device.discoverAllServicesAndCharacteristics()
      })
      .then((device) => {
        console.log("in discover charactristic function----");
        console.log("DeviceId:" + device.id);
        this.gatewayCharacteristics[device.id] = {};
        this.gatewayCharacteristics[device.id]['mtu'] = device.mtu;
        console.log("GatewayChars:" + this.gatewayCharacteristics);
        device.services().then(services => {
          services = services.filter(this.isKnownService);
          console.log("Known Services size:" + services.length)
          if (services.length === 0) {
            console.log("No known services found in connected device.");
            this.setState({
              bleMessage: '',
              bleError: 'Required services not found. Disconnecting from device..'
            })
            device.cancelConnection();
          }
          else {
            this.setState({
              bleMessage: 'Services discovered..',
              bleError: ''
            })
          }
          services.forEach((service, i) => {
            service.characteristics().then(characteristics => {
              console.log("Service UUID:" + service.uuid);
              console.log("Initial characteristics size:" + characteristics.length);
              characteristics = characteristics.filter((characteristic) => {
                characteristicPrefix = this.isKnownCharacteristic(characteristic);
                if (characteristicPrefix) {
                  if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_DELETION) {
                    this.readCharacteristics(characteristic).then((e) => {
                    }).catch((e) => {
                      console.log('error in reading char.......', e);
                    })
                  }

                  console.log("Characteristics UUID:" + characteristic.uuid);
                  this.gatewayCharacteristics[device.id][characteristicPrefix] = characteristic;
                  return true;
                }
              });
              console.log("After filtering characteristics size:" + characteristics.length);

              if (i === services.length - 1) {
                console.log("GatewayCharacteristics List:", Object.keys(this.gatewayCharacteristics[device.id]));
                const dialog = Object.values(this.gatewayCharacteristics[device.id]).find(
                  characteristic => characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse
                )
                if (!dialog) {
                  console.log("No writable characteristic");
                  this.setState({
                    bleMessage: '',
                    bleError: 'Required characteristics not found. Disconnecting from device..'
                  })
                  device.cancelConnection();
                }
                else {
                  this.setState({
                    bleMessage: 'Characteristics discovered..',
                    bleError: ''
                  })
                  console.log("Opening registration modal..")
                  this.setRegistrationModalVisible(false);
                  this.sendGatewayDeletionPayload();
                }
              }
            })
          })
        }).catch((error) => {
          console.log('error in finding service');
        })
        this.reteyConnection = 0;
      })
      .catch((error) => {
        if (error.errorCode === 203) {
          device.cancelConnection().then(() => {
            this.connectAndDiscoverCharacteristicsForDeleteGateway(device);
            console.log("Reconnecting to device.." + error.message);
          }).catch((e) => {
            console.log("Reconnecting to device Error" + e.message);

          });
        } else if (error.errorCode === 201) {
          console.log('in retry connection', this.reteyConnection);
          if (this.reteyConnection < 3) {
            this.connectAndDiscoverCharacteristicsForDeleteGateway(device);
          } else {
            this.reteyConnection = 0;
            this.setState({
              registrationModalVisible: false,
              bleMessage: '',
              bleError: 'Error: Unable to connect to Gateway. Please try adding Gateway again.'
            })
            console.log(error);
            console.log(error.errorCode);
            device.cancelConnection().catch(error => {
              console.log("Device is already disconnected." + error.message);
            });
          }
          this.reteyConnection = this.reteyConnection + 1;
        }
        else {
          this.setState({
            registrationModalVisible: false,
            bleMessage: '',
            bleError: 'Error: Unable to connect to Gateway. Please try adding Gateway again.'
          })
          console.log(error);
          console.log(error.errorCode);
          device.cancelConnection().catch(error => {
            console.log("Device is already disconnected." + error.message);
          });
        }
      }).catch((error) => {
        console.log('error in connectAndDiscoverCharacteristics', error);
      });
  }


  connectAndDiscoverCharacteristics(device) {
    this.errorCode = 0;
    device.connect()
      .then((device) => {
        this.errorCode = 1;
        this.props.onSignoutDisconnectFromGrowarea(device);
        this.setState({
          registrationModalVisible: true,
          bleMessage: 'Discovering services and characteristics',
          bleError: ''
        })
        console.log("Discovering services and characteristics");
        this.props.onAddDevice(device);
        return device.discoverAllServicesAndCharacteristics()
      })
      .then((device) => {
        console.log("DeviceId:" + device.id);
        this.gatewayCharacteristics[device.id] = {};
        this.gatewayCharacteristics[device.id]['mtu'] = device.mtu;
        console.log("GatewayChars:" + this.gatewayCharacteristics);
        device.services().then(services => {
          services = services.filter(this.isKnownService);
          console.log("Known Services size:" + services.length)
          if (services.length === 0) {
            console.log("No known services found in connected device.");
            this.setState({
              bleMessage: '',
              bleError: 'Required services not found. Disconnecting from device..'
            })
            device.cancelConnection();
          }
          else {
            this.setState({
              bleMessage: 'Services discovered..',
              bleError: ''
            })
          }
          services.forEach((service, i) => {
            service.characteristics().then(characteristics => {
              console.log("Service UUID:" + service.uuid);
              console.log("Initial characteristics size:" + characteristics.length);
              characteristics = characteristics.filter((characteristic) => {
                characteristicPrefix = this.isKnownCharacteristic(characteristic);
                if (characteristicPrefix) {
                  if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_ACCOUNT_UUID) {
                    this.readCharacteristics(characteristic).then((e) => {
                    }).catch((e) => {
                      console.log('error in reading char.......', e);
                    })
                  }

                  console.log("Characteristics UUID:" + characteristic.uuid);
                  this.gatewayCharacteristics[device.id][characteristicPrefix] = characteristic;
                  return true;
                }
              });
              console.log("After filtering characteristics size:" + characteristics.length);

              if (i === services.length - 1) {
                console.log("GatewayCharacteristics List:", Object.keys(this.gatewayCharacteristics[device.id]));
                const dialog = Object.values(this.gatewayCharacteristics[device.id]).find(
                  characteristic => characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse
                )
                if (!dialog) {
                  console.log("No writable characteristic");
                  this.setState({
                    bleMessage: '',
                    bleError: 'Required characteristics not found. Disconnecting from device..'
                  })
                  device.cancelConnection();
                }
                else {
                  this.setState({
                    bleMessage: 'Characteristics discovered..',
                    bleError: ''
                  })
                  console.log("Opening registration modal..")
                  this.setRegistrationModalVisible(true);
                }
              }
            })
          })
        }).catch((error) => {
          console.log('error in finding service');

        })
        this.reteyConnection = 0;
      })
      .catch((error) => {
        if (error.errorCode === 203) {
          device.cancelConnection().then(() => {
            this.connectAndDiscoverCharacteristics(device);
            console.log("Reconnecting to device.." + error.message);
          }).catch((e) => {
            console.log("Reconnecting to device Error" + e.message);

          });
        } else if (error.errorCode === 201) {
          console.log('in retry connection', this.reteyConnection);
          if (this.reteyConnection < 3) {
            this.connectAndDiscoverCharacteristics(device);
          } else {
            this.reteyConnection = 0;
            this.setState({
              registrationModalVisible: true,
              bleMessage: '',
              bleError: 'Error: Unable to connect to Gateway. Please try adding Gateway again.'
            })
            console.log(error);
            console.log(error.errorCode);
            device.cancelConnection().catch(error => {
              console.log("Device is already disconnected." + error.message);
            });
          }
          this.reteyConnection = this.reteyConnection + 1;
        }
        else {
          this.setState({
            registrationModalVisible: true,
            bleMessage: '',
            bleError: 'Error: Unable to connect to Gateway. Please try adding Gateway again.'
          })
          console.log(error);
          console.log(error.errorCode);
          device.cancelConnection().catch(error => {
            console.log("Device is already disconnected." + error.message);
          });
        }
      }).catch((error) => {
        console.log('error in connectAndDiscoverCharacteristics', error);
      });
  }

  isKnownService(service) {
    console.log("service.uuid", service.uuid);

    return Object.values(Constant.KNOWN_BLE_SERVICES)
      .find(knownServicePrefix => service.uuid.startsWith(knownServicePrefix));
  }

  isKnownCharacteristic(characteristic) {
    characteristicPrefix = '';
    Object.values(Constant.KNOWN_BLE_CHARACTERISTICS)
      .find(knownCharPrefix => {
        if (characteristic.uuid.startsWith(knownCharPrefix)) {
          characteristicPrefix = knownCharPrefix;
          return true;
        }
        return false;
      });
    console.log('characteristicPrefix:' + characteristicPrefix);
    return characteristicPrefix;
  }

  readCharacteristics(characteristic) {
    return new Promise((resolve, reject) => {
      characteristic.read().then((response) => {
        console.log('=================> read file', response.value, Base64.atob(response.value));
        let version = Base64.atob(response.value).toString();
        version = version.replace(/\0/g, '')
        this.setState({ seleneVersion: version })
        console.log('version================================', version, typeof (version));
        resolve(response)
      }).catch((error) => {
        console.log('error in reading file from ble', error);
        reject(' Error in reading from ble ' + error)
      })
    })
  }

  
   handleProvisionCallbackNotifications (gatewayProvisionCallbackChar, Gatewaypayload) {
    console.log("Subscribing to provision callback characteristic..");
    let validPayload = '';
    this.provisionCallbackCharSubscription = gatewayProvisionCallbackChar.monitor((error, characteristic) => {
      console.log('hello msg');

      if (error) {
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverGatewayProvisionCallbackNotificationSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverGatewayProvisionCallbackNotificationSubscription');
        } else {
          this.setState({ errorCode: 1 });
        }
      }
      else {
        let message = Base64.atob(characteristic.value);
        console.log("GatewayProvisionCallbackMessage:" + message);
        if (message === Constant.BLE_PAYLOAD_PREFIX){
            validPayload = ''; 
            console.log("Got begin payload"+validPayload);
          }
        else if (message === Constant.BLE_PAYLOAD_SUFFIX) {
          console.log("payload before--"+validPayload);
            if (isJsonString(validPayload)) {
              let payload = JSON.parse(validPayload);
              console.log("Got end payload");
              if(payload['result']===Constant.BLE_RESPONSE_STATUS)
              {
                this.props.onUpdateRegistrationState(RegistrationStates.REGISTRATION_PROCESS_COMPLETE);
                gateways =this.state.gateways;
                Gatewaypayload[0]['gatewayId']=payload['gatewayId'];
                gateways.push(Gatewaypayload[0]);
                AsyncStorage.setItem('listGateway',JSON.stringify(gateways)).then((token) => {
                    this.setState({gateways});
                    }).catch((error) => {
                            console.log('error in saving name', error);
                        })
                AsyncStorage.setItem('emailNotify',"true");
                AsyncStorage.setItem('SmsNotify',"false");
                alert(payload['statusMessage']);
                this.disconnectBleConnection();
              }else
              {
                    alert(payload['statusMessage']);
                    this.disconnectBleConnection();
              }
            }
            else {
              console.log("Invalid JSON:" + validPayload);
              validPayload = '';
            }
            validPayload = '';
          }
        else {
            console.log("Got JSON payload ");
            validPayload = validPayload + message;
            
          }
      }
    }, 'myGatewayProvisionCallbackTransaction');
  }



  writeCharacteristics(characteristic, payload, chunkSize, info) {
    console.log("type of", typeof (payload));
    if (typeof (payload) === 'object') {
      payload = JSON.stringify(payload);
    }
    console.log("payload before write-------"+payload);
    console.log("Writing " + payload.length + " bytes to " + characteristic.uuid + " for " + info);
    characteristic.writeWithResponse(Base64.btoa(Constant.BLE_PAYLOAD_PREFIX)).catch(error => {
      console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);

      if (this.reSendingPayloadCount < 3) {
        this.errorCode = 1;
        this.reSendingPayloadCount++;
        console.log('------------retry count--------', this.reSendingPayloadCount);

        this.writeCharacteristics(characteristic, payload, chunkSize, info);
      } else {
        this.reSendingPayloadCount = 0
        this.props.onUpdateRegistrationState(RegistrationStates.SENDING_DATA_TO_GATEWAY_UNSUCCESSFULL);
        this.showGatewayDiscoveryModal(false);
        this.setRegistrationModalVisible(false, true);
        Alert.alert('Provisioning Gateway Failed.', 'Please try again.');
      }

    });
    for (var k = 0; k < (payload.length / chunkSize); k++) {
      var str = payload.substring(k * chunkSize, ((k + 1) * chunkSize));
      console.log(str);
      characteristic.writeWithResponse(Base64.btoa(str), info + k).catch(error => {
        console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
        if (this.errorCode == 1) {
          console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
        } else {
          if (this.reSendingPayloadCount < 3) {
            this.errorCode = 1;
            this.reSendingPayloadCount++;
            console.log('------------retry count--------', this.reSendingPayloadCount);

            this.writeCharacteristics(characteristic, payload, chunkSize, info);
          } else {
            this.reSendingPayloadCount = 0
            this.props.onUpdateRegistrationState(RegistrationStates.SENDING_DATA_TO_GATEWAY_UNSUCCESSFULL);
            this.showGatewayDiscoveryModal(false);
            this.setRegistrationModalVisible(false, true);
            Alert.alert('Provisioning Gateway Failed.', 'Please try again.');
          }
        }
      });
    }
    characteristic.writeWithResponse(Base64.btoa(Constant.BLE_PAYLOAD_SUFFIX), info + '$').catch(error => {
      console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
      if (this.errorCode == 1) {
        console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);

      } else {
        if (this.reSendingPayloadCount < 3) {
          this.errorCode = 1;
          this.reSendingPayloadCount++;
          console.log('------------retry count--------', this.reSendingPayloadCount);

          this.writeCharacteristics(characteristic, payload, chunkSize, info);
        } else {
          this.reSendingPayloadCount = 0
          this.props.onUpdateRegistrationState(RegistrationStates.SENDING_DATA_TO_GATEWAY_UNSUCCESSFULL);
          this.showGatewayDiscoveryModal(false);
          this.setRegistrationModalVisible(false, true);
          Alert.alert('Provisioning Gateway Failed.', 'Please try again.');
        }
      }
    }).then(() => {
      if (this.errorCode === 1) {
        console.log('code 1');
      } else {
        this.props.onUpdateRegistrationState(RegistrationStates.REGISTRATION_STARTED_TO_INTERNAL_CLOUD);
        console.log('------------payload', this.props.internalCloudePayload);
        console.log('-------------ble', this.bleDevice);
      }
    });
  }

  onViewDevices(growArea) {
    console.log("enter into device function");
    this.props.bleManager.destroy()
    this.props.onSetBleManager(new BleManager());

    Navigation.push(this.props.componentId, {
      component: {
        name: 'DevicesScreen',
        passProps: {
          selectedGrowArea: {
            id: growArea.gatewayId,
            name: growArea.gatewayName,
            macId: growArea.macAddress,
          },
          gateway: growArea,
        },
        options: {
          topBar: {
              visible: true,

              background: {
                 color: Constant.RED_COLOR,
              },
              backButton: {
                 color: '#fff',
              // icon:require('../../assets/images/back.png')
              },
              title: {
                 text: "Previous",
                 color: '#fff',
              }
          }
        }
      }
    });

  }

  openDashboardPage = () => {
    Navigation.push(this.props.componentId, {
      component: {
        name: 'DashboardScreen',
        options: {
          topBar: {
            visible: true
          }
        }
      }
    });
  }

  openSettingsPage = () => {
        Navigation.push(this.props.componentId, {
          component: {
            name: 'SettingsScreen',
            options: {
              topBar: {
                visible: true,

                background: {
                   color: Constant.RED_COLOR,
                },
                backButton: {
                  color: '#fff',
                 // icon:require('../../assets/images/back.png')
                },
                title: {
                  text: "Previous",
                  color: '#fff',
                }
              }
            }
          }
        });
    }

  getGatewayList()
  {
    AsyncStorage.getItem('listGateway').then(response => {
      gateways=JSON.parse(response)
      this.setState( { gateways})

    }).catch((e) => {
      console.log('error in geting asyncStorage\'s item:', e.message);
    })
     return this.state.gateways; 
  }

  onClearSearch = () => {
    console.log('searrch bar cleared!!');

  }

  alreadyRegistredGateway(registeredGateway) {
    try {
      console.log('data-0=0-0-------------------=-0-=0=-0-=0=-0=-0=-0=-0=-', registeredGateway);
      var data = []
      if (registeredGateway != undefined) {
        console.log("data", registeredGateway.length);

        registeredGateway.map((gateway) => {
          console.log('gateway maccc id', gateway.macAddress);

          console.log('mac id', gateway.macAddress);
          data.push(gateway.macAddress);
        });
        this.setState({ isGotAlreadyRegistredGateway: true })
        return data;
      }
      this.setState({ isGotAlreadyRegistredGateway: true })
      return [];
    } catch (e) {
      this.setState({ isGotAlreadyRegistredGateway: false })
      console.log('error in alreadyRegistered data', e);
      Alert.alert('Alert', 'Failed to get already provisioned gateway\'s list. Please try again.');
    }
  }


  shouldComponentUpdate(nextProps, nextState) {
    return (this.visible);
  }


  onSelectedItemsChange = selectedUsers => {
    console.log("OnSelectedItemsChange called");
    this.setState({ selectedUsers });
    console.log(selectedUsers);
  };

  setVisibilityOfModal = () => {

      this.isVisible = !this.isVisible;

  }

  async updateGatewayName (value,device)
  {
      let regEx = /^[a-zA-Z][a-zA-Z_.-]{0,1}[ a-z|A-Z|0-9|_.:-]*$/;

      if (!value || value.trim() === '' || value.length >= 30 || !regEx.test(value.trim()))
      {
        Alert.alert("Invalid Gateway name.", "Invalid Gateway name! Maximum length is 30. Name should start with alphabet and may contain dot, underscore, space and numeric value.");
        return null;
      }


       this.props.uiStartLoading("Updating Gateway Name....");

       let url = Urls.RENAME_GATEWAY_SENSOR;
       let emailState = this.state.emailState === 'ON' ? true : false;
       let smsState = this.state.smsState === 'ON' ? true : false;

       let payload = [{"gatewayName":value,"deviceType":Constant.GATEWAY_TYPE, "gatewayId":device.gatewayId,'sendEmailNotifications': emailState,'sendSmsNotifications' : smsState}]

       console.log("payload for Sensor delete ---:"+JSON.stringify(payload));
       try{
              const response = await fetch(url,{ method: "PUT",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                         body: JSON.stringify(payload)})
              console.log("res---"+JSON.stringify(response));
             if(response.ok)
             {
                 const msg = await response.json();
                 this.props.uiStopLoading();
                 console.log("Received success response for AWS");

             }
             else
             {
                 this.props.uiStopLoading();
                 alert("Something went wrong while updating. Please try again");
                 return null;
             }
          }catch(err)
          {
             this.props.uiStopLoading();
             alert("Something went wrong while updating. Please try again");
             return null;
          }
      this.props.uiStartLoading("Updating Gateway Name....");
      let gateways = this.state.gateways;
      console.log('Gateway List....',gateways);
      gateways.map((item) => {
              if(item.gatewayId === device.gatewayId)
                  item.gatewayName = value;
      })
       AsyncStorage.setItem('listGateway',JSON.stringify(gateways)).then(() => {
                this.setState({gateways});
       }).catch((error) => {
          console.log('error in saving list of gateways to  local storage', error);

       })
      this.props.uiStopLoading();
      this.setState({editedItem: ''});
      alert("Gateway Name Updated Successfully")
      this._onRefresh();
  }

  render() {

    if (this.props.retry401Count === 20 && !this.state.enabled401) {
      this.setState({ modalVisible: false, registrationModalVisible: false, enabled401: true })
    }

    if (this.props.isGatewayDeleted) {
      console.log('-------------------');
      this._onRefresh();
      this.props.onGatewayDeletionResponse(false);
    }

    if (this.props.registrationState === RegistrationStates.REGISTRATION_PROCESS_COMPLETE) {
      this.setState({ modalVisible: false, registrationModalVisible: false })
      this._onRefresh();
      this.props.onUpdateRegistrationState(RegistrationStates.REGISTRATION_NOT_STARTED);
    }
   
    let listData = this.getGatewayList() || [];
    
    let growAreasList = (
      <FlatList
        data={listData}
        renderItem={({ item, index }) => (
          <View style={(index === listData.length - 1) ? [styles.listItem, {
            borderBottomWidth: 2
          }] : styles.listItem}>
            <View style={{ width: '80%' }} >
              <TouchableOpacity onPress={() => {this.onViewDevices(item) }}>
                <View style={{}} color={Constant.WHITE_TEXT_COLOR}>
                  <Text style={{ fontWeight: 'bold',color:'white',paddingLeft : '4%' }} >{item.gatewayName}</Text>
                  <Text style={{ fontWeight: 'bold', color: 'white', paddingLeft: '4%' }} >{item.gatewayType === 'SW' ? 'Software' : 'Hardware'}</Text>
                  <Text style={{color:'white',paddingLeft : '4%'}} >{item.macAddress}</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flex: 1, height: 35 }} onPress={() => { }} />
            <View style={{ flexDirection: 'row' }}>
              <MaterialIcon name="edit" size={24} style={{ padding: (0, 0, 0, 5), color: '#fff',backgroundColor: Constant.BLUE_COLOR }} color={Constant.WHITE_TEXT_COLOR} onPress={() => {
              this.setState({editedItem:item});
              this.setVisibilityOfModal();
              }} />
              <MaterialIcon name="delete"  size={24} style={{ padding: (0, 0, 0, 5), color: '#fff',marginLeft: '5%',backgroundColor: Constant.BLUE_COLOR }} color={Constant.WHITE_TEXT_COLOR} onPress={() => {
                  Alert.alert('Delete gateway', 'Are you sure you want to delete ' + item.gatewayName + '?'+' All the sensor provision with this gateway will also get deleted',
                    [
                      {
                        text: 'Cancel', onPress: () => {
                          console.log('delete operation was canceled.');
                        }, style: 'cancel'
                      },
                      {
                        text: 'Delete', onPress: async() => {
                          this.setState({selectedGateway:item.macAddress})
                          this.setState({gatewayId:item.gatewayId});
                          if(item.gatewayType == 'SW')
                          {
                            this.deletionSwGatewayApi();
                          }else{
                          this.props.bleManager.destroy()
                          this.props.onSetBleManager(new BleManager());
                          this.alreadyRegistredGateways = await this.alreadyRegistredGateway(this.state.gateways);
                          this.props.bleManager.disable()
                          setTimeout(()=>{this.props.bleManager.enable() },1000);
                          setTimeout(()=>{this.showGatewayDiscoveryModalForDeleteGateway(true)},2000);
                          }
                        }
                      },
                    ],
                    { cancelable: true }
                  ) 
                 
              }} />
            </View>
               <DialogInput
                         dialogIsVisible={this.isVisible}
                         closeDialogInput={() => {this.setVisibilityOfModal()}}
                         submitInput={(textValue) => this.updateGatewayName(textValue,this.state.editedItem)}
                         outerContainerStyle={{ backgroundColor: '#737373',opacity: 0.8}}
                        containerStyle={{ backgroundColor: '#d91f2b', borderColor: 'black', borderWidth: 2}}
                        titleStyle={{ color: 'white',fontSize : RFPercentage(3) }}
                        title="Rename Gateway"
                        subTitleStyle={{ color: 'white' }}
                        subtitle="Edit Gateway Name"
                        placeholderInput={this.state.editedItem['gatewayName']}
                        placeholderTextColor="Black"
                        textInputStyle={{ borderColor: 'white',color: 'black', borderWidth: 2,fontStyle: 'bold',fontSize : RFPercentage(2)  }}
                        secureTextEntry={false}
                        buttonsStyle={{ borderColor: 'white' }}
                        textCancelStyle={{ color: 'white',fontSize: RFPercentage(2.5) }}
                       submitTextStyle={{ color: 'white', fontStyle: 'bold' ,fontSize: RFPercentage(2.5)}}
                       cancelButtonText="CANCEL"
                       submitButtonText="RENAME"
               />
          </View>
        )}
       keyExtractor={(item) => item.gatewayId}
        refreshControl={
          <RefreshControl
            refreshing={this.state.refreshing}
            onRefresh={this._onRefresh}
            colors={['#d91f2b','#d91f2b','#d91f2b']}
          />
        }
      />

    );

   

    if (this.props.isLoading) {
      growAreasList=(
            <View style={styles.activityIndicator}>
              <ActivityIndicator size="large" color={Constant.RED_COLOR} /><Text style={{ margin: 4, fontWeight: "bold" }}>{this.props.isMessage}</Text>
             </View>
           );
    } else if (listData.length === 0) {
      growAreasList = (
        <ScrollView contentContainerStyle={styles.activityIndicator}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh}
              colors={['#d91f2b','#d91f2b','#d91f2b']}
            />
          }>
          <Text color="#00ff00">No Gateway found.</Text>
        </ScrollView>
      );
    }

    let gatewayDiscoveryContainer = (
      <View style={styles.scanContainer}>
        <Image
          source={require('../../assets/images/scan.png')}
          style={styles.scanImage}
        />
        <Text style={styles.scanText}> Searching For Available Gateways Over BLE</Text>
      </View>
    );
    let gatewayTypes = (
      <ScrollView>
        <Text style={{ fontWeight: "bold", fontSize: 20, padding: 10, borderBottomWidth: 1 }}> Select Gateway </Text>
        <ScrollView contentContainerStyle={styles.inputContainer}>
          <View style={{ marginVertical: '2%' }}>
            <RadioForm radio_props={radio_props}
              initial={this.state.selectedRedioValue}
              onPress={(value) => { this.setState({ selectedRedioValue: value }) }}
              formHorizontal={true}
              buttonSize={10}
              buttonOuterSize={20}
              labelStyle={{ marginRight: 10 }}
            >
            </RadioForm>
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10, marginBottom: 10 }}>
          <Button title="Cancel" color={Constant.RED_COLOR} onPress={() => this.setRedioModalVisible(false)} />
          <Button title="Submit" color={Constant.RED_COLOR} onPress={() => this.gatewayProvisionProcess()} />
        </View>
      </ScrollView>
    );
    let gatewayListSize = Object.keys(this.state.discoveredGateways).length;

    if (gatewayListSize > 0) {
      gatewayDiscoveryContainer = (
        <View style={styles.gatewayListContainer}>
          <View style={{ alignItems: "center", marginBottom: 6 }}><Text>{gatewayListSize} {gatewayListSize === 1 ? 'Gateway' : 'Gateways'} found</Text></View>
          <FlatList
            data={Object.values(this.state.discoveredGateways)}
            renderItem={(info) =>
              (
                <View style={styles.gatewayItem}>
                  <Image
                    source={require('../../assets/images/device_48.png')}
                    style={styles.gatewayIcon}
                  />
                  <View style={{ flexDirection: 'column', width: '30%', marginLeft: 5, marginRight: 5 }}>
                    <Text style={{ fontSize: 7 }}>Name</Text>
                    <Text style={{ fontSize: 12 }}>{info.item.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'column', width: '30%' }}>
                    <Text style={{ fontSize: 7 }}>UId</Text>
                    <Text style={{ fontSize: 10 }}>{info.item.id}</Text>
                  </View>
                  <TouchableOpacity style={[styles.roundButton, styles.registerButton]} onPress={() => {
                    this.gatewayRegisterClickHandler(info.item);

                  }}>
                    <Text style={[styles.buttonText, { fontSize: 10 }]}>REGISTER</Text>
                  </TouchableOpacity>
                </View>
              )}
            keyExtractor={(item) => item.id.toString()}
          />
          <TouchableOpacity style={[styles.roundButton, styles.cancelButton]} onPress={() => this.showGatewayDiscoveryModal(false)}>
            <Text style={styles.buttonText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      );
    }

    

    let gatewayDetailsContainer = (
      <ScrollView>
        <Text style={{ fontWeight: "bold", fontSize: 20, padding: 10, borderBottomWidth: 1 }}> Register Gateway </Text>
        <ScrollView contentContainerStyle={styles.inputContainer}>
          
          <TextField label='Gateway Name' onChangeText={(gatewayName) => this.setState({ gatewayName })} value={this.state.gatewayName} labelHeight={18} />
          <TextField label='Description' onChangeText={(gatewayDescription) => this.setState({ gatewayDescription })} value={this.state.gatewayDescription} labelHeight={18} />
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10, marginBottom: 10}}>
          <Button title="Cancel" color={Constant.RED_COLOR} onPress={() => this.setRegistrationModalVisible(false, true)} />
          <Button onPress={
            this.gatewayRegisterSubmitClickHandler
          } title="Submit" color={Constant.RED_COLOR} />
        </View>
      </ScrollView>
    );

    let swGatewayDetailsContainer = (
      <ScrollView>
        <Text style={{ fontWeight: "bold", fontSize: 20, padding: 10, borderBottomWidth: 1 }}> Register Software Gateway </Text>
        <ScrollView contentContainerStyle={styles.inputContainer}>
          <TextField label='Gateway Name' onChangeText={(gatewayName) => this.setState({ gatewayName })} value={this.state.gatewayName} labelHeight={18} />
          <TextField label='Description' onChangeText={(gatewayDescription) => this.setState({ gatewayDescription })} value={this.state.gatewayDescription} labelHeight={18} />
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10, marginBottom: 10 }}>
          <Button title="Cancel" color={Constant.RED_COLOR} onPress={() => this.setSwGatewayModalVisivle(false)} />
          <Button onPress={
            this.swGatewayRegisterSubmitClickHandler
          } title="Submit" color={Constant.RED_COLOR} />
        </View>
      </ScrollView>
    );

    if (this.props.registrationState && this.props.registrationState !== 0) {
      stateIndicator = (<ActivityIndicator size="large" color={Constant.RED_COLOR} />);
      if (this.props.registrationState === RegistrationStates.REGISTRATION_FAILED ||
        this.props.registrationState === RegistrationStates.FETCHING_CONFIG_FROM_FAILED ||
        this.props.registrationState === RegistrationStates.REGISTRATION_FAILED_TO_INTERNAL_CLOUD ||
        this.props.registrationState === RegistrationStates.SENDING_DATA_TO_GATEWAY_UNSUCCESSFULL) {
        stateIndicator = (<Button title="Retry" onPress={() => {//this.retryRegistration()
          this.setState({ registrationModalVisible: false, containerId: '', facilityId: '' })
        }} />);
      } else if (this.props.registrationState === RegistrationStates.FETCHING_CONFIG_FROM_SUCCESS) {
        console.log("REGISTRATION_SUCCESS_TO_INTERNAL_CLOUD");
        this.props.onUpdateRegistrationState(RegistrationStates.SENDING_PAYLOAD_TO_GATEWAY)
        let payload = [
            {
            gatewayName: this.state.gatewayName,
            macAddress: this.state.gatewayUId,
            userId: JSON.parse(this.state.email) ,
            deviceType: "gateway",
            description:this.state.gatewayDescription
          
          }
      ]; 
        console.log("REGISTRATION_SUCCESS_TO_INTERNAL_CLOUD2");
        console.log("UId:" + this.state.gatewayUId);
        var gatewayRegCharFound = false;
        Object.keys(this.gatewayCharacteristics[this.state.gatewayUId]).every((characteristicPrefix) => {
          console.log(characteristicPrefix, Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_ACCOUNT_UUID);
          console.log(characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_ACCOUNT_UUID);
          if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_ACCOUNT_UUID) {
            gatewayRegCharFound = true;
            this.writeCharacteristics(this.gatewayCharacteristics[this.state.gatewayUId][characteristicPrefix], payload, (this.gatewayCharacteristics[this.state.gatewayUId].mtu - 3), 'gatewayInfo')
            this.handleProvisionCallbackNotifications(this.gatewayCharacteristics[this.state.gatewayUId][characteristicPrefix],payload);

          } else {
            return true;
          }
        });
        if (!gatewayRegCharFound) {
          alert("Gateway registration service not found in connected gateway.");
        }
      }

      gatewayDetailsContainer = (
        <View style={{ alignItems: "center", margin: 10 }}>
          {stateIndicator}
          <Text style={{ margin: 4, fontWeight: "bold" }}>{this.getRegistrationMessage(this.props.registrationState)}</Text>
        </View>
      );
    }

    if (this.state.bleMessage || this.state.bleError) {
      stateIndicator = (<ActivityIndicator size="large" color={Constant.RED_COLOR} />);
      message = this.state.bleMessage;
      if (this.state.bleError) {
        stateIndicator = (<View />);
        message = this.state.bleError;
      }
      gatewayDetailsContainer = (
        <View style={{ alignItems: "center", margin: 10 }}>
          {stateIndicator}
          <Text style={{ margin: 4, fontWeight: "bold" }}>{message}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.greenBackgroundContainer} />
        <View style={styles.titleTextContainer}>
          <View style={{width:'60%'}}><Text style={styles.titleText}> Gateway</Text></View>
        
          <View style={{width:'40%' ,flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>
          <TouchableOpacity onPress={() => {this.openSettingsPage() }}>
          <Image source={ require('../../assets/images/setting1.png')} style={styles.settingIcon} ></Image>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {this.openDashboardPage() }}>
          <Image source={ require('../../assets/images/home1.png')} style={styles.homeIcon} ></Image>
          </TouchableOpacity>
          </View>
        </View>
        <View style={styles.listContainer}>
          <View style={styles.titleContainer}>
            <View style={{width:'100%' ,flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>
            <TouchableOpacity style={[styles.roundButton, styles.addNewButton]} onPress={async () => {
              this.setState({ redioModelVisible: true })
            }
            }>
            <Text style={styles.buttonText}>Add New</Text>
              
            </TouchableOpacity></View>
          </View>
          {growAreasList}
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalVisible && (this.props.registrationState !== RegistrationStates.REGISTRATION_PROCESS_COMPLETE)}
          onRequestClose={() => {
            this.showGatewayDiscoveryModal(false);
          }}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.modalContainer}>
              <View style={[styles.modalTitle, { width: '100%', justifyContent: 'space-between' }]}>
                <Image
                  source={require('../../assets/images/add_24.png')}
                  style={styles.modalTitleAddButton}
                />

                <Text> Discover New Gateways </Text>
                {this.state.waitingForGatewayLoader ? <ActivityIndicator size="large" color={Constant.RED_COLOR} style={{
                  alignSelf: 'flex-end',
                  justifyContent: 'center',
                  height: 30,
                  width: 30,
                  borderRadius: 15,
                  margin: 15
                }} /> : <View />}
              </View>
              {gatewayDiscoveryContainer}
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.registrationModalVisible && (this.props.registrationState !== RegistrationStates.REGISTRATION_PROCESS_COMPLETE)}
          onRequestClose={() => {
            this.setRegistrationModalVisible(false, true);
          }}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.registrationModalContainer}>
              {gatewayDetailsContainer}
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.redioModelVisible}
          onRequestClose={() => {
            this.setRedioModalVisible(false);
          }}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.registrationModalContainer}>
              {gatewayTypes}
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.swGatewayModelVisible}
          onRequestClose={() => {
            this.setSwGatewayModalVisivle(false);
          }}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.registrationModalContainer}>
              {swGatewayDetailsContainer}
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Constant.LIGHT_GREY_COLOR
  },
  titleText: {
    fontSize: RFPercentage(4.5),
    color: Constant.WHITE_TEXT_COLOR,
    fontWeight: "bold",
    marginLeft: width * 0.03,
  },
  settingIcon: {
    height: height * 0.04,
    width: width * 0.08,
    marginHorizontal:width * 0.03
  },
  homeIcon: {
    height: height * 0.045,
    width: width * 0.068,
    marginHorizontal:width * 0.03
  },
  titleTextContainer: {
    flexDirection: 'row',
    alignItems: "center",
  },
  greenBackgroundContainer: {
    backgroundColor: Constant.RED_COLOR,
    width: '100%',
    height: height * 0.095,
    position: 'absolute'
  },
  listContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Constant.WHITE_BACKGROUND_COLOR,
    marginLeft: '5%',
    marginRight: '5%',
    marginTop:height * 0.065,
    borderRadius: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: "center"
  },
  roundButton: {
    justifyContent: "center",
    padding: 6,
    borderRadius: 12,
    marginRight: 12,
    height:width * 0.09,
    width:width * 0.23
  },
  addNewButton: {
    backgroundColor: Constant.ADD_NEW_GATEWAY_BUTTON_COLOR,
  },
  registerButton: {
    backgroundColor: Constant.RED_COLOR,
  },
  cancelButton: {
   // width: 60,
    margin: 10,
    marginLeft: 15,
    backgroundColor: Constant.RED_COLOR
  },
  buttonText: {
    fontSize: RFPercentage(2.2),
    color: Constant.WHITE_TEXT_COLOR,
    fontWeight: "bold",
    textAlign: 'center'
  },
  fullModalContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#78787885'
  },
  modalContainer: {
    width: '94%',
    height: '56%',
    backgroundColor: Constant.WHITE_BACKGROUND_COLOR,
  },
  modalTitle: {
    flexDirection: 'row',
    alignItems: "center"
  },
  modalTitleAddButton: {
    backgroundColor: Constant.ADD_NEW_GATEWAY_BUTTON_COLOR,
    height: 30,
    width: 30,
    borderRadius: 15,
    margin: 15
  },
  scanContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  scanImage: {
    height: 100,
    width: 100
  },
  scanText: {
    marginTop: 10,
    marginBottom: 30,
    color: Constant.DARK_GREY_COLOR
  },
  gatewayList: {
    flex: 1
  },
  gatewayListContainer: {
    flex: 1,
    justifyContent: "center"
  },
  gatewayIcon: {
    backgroundColor: Constant.ADD_NEW_GATEWAY_BUTTON_COLOR,
    height: 30,
    width: 30,
    borderRadius: 15,
    margin: 5,
    marginLeft: 15,
  },
  listTitle: {
    flex: 1,
    padding: 10,
    fontWeight: 'bold',
    borderBottomColor: Constant.LIGHT_GREY_COLOR
  },
  listItem: {
    width: "100%",
    borderTopWidth: 2,
    borderColor: Constant.LIGHT_GREY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    height: 60,
    backgroundColor: Constant.GREY_COLOR,
  },
  gatewayItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Constant.LIGHT_GREY_COLOR,
  },
  activityIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  registrationModalContainer: {
    width: '84%',
    marginTop: 60,
    marginBottom: 60,
    backgroundColor: Constant.WHITE_TEXT_COLOR
  },
  inputContainer: {
    marginLeft: '5%',
    marginRight: '5%'
  },
  menuItem: { margin: 6 }
});

mapStatesToProps = state => {
  this.connectedBleGrowarea = state.ble.bleManager;

  return {
    growareas: state.root.growareas,
    isLoading: state.ui.isLoading,
    isMessage: state.ui.isMessage,
    registrationState: state.ui.registrationState,
    bleManager: state.ble.bleManager,
    users: state.root.users,
    alreadyProvisionedGateway: state.root.allProvisionedGateways,
    internalCloudePayload: state.ble.payLoadForInternalCloud,
    isGatewayDeleted: state.gateway.isGatewayDeleted,
    retry401Count: state.auth.retry401Count


  }
};

mapDispatchToProps = dispatch => {
  return {
  onUpdateRegistrationState: (state) => dispatch(uiUpdateRegistrationState(state)),
  onAddDevice: (device) => dispatch(addBleDevice(device)),
  onSetBleManager: (bleManager) => dispatch(setBleManager(bleManager)),
  onSignoutDisconnectFromGrowarea: (device) => dispatch(removeBleDevicefromGrowarea(device)),
  onGetAllGateways: (token, containerId, inBackground, appleKey) => {},
  onDeleteGateway: (payload) => dispatch(deleteGateway(payload)),
  onGatewayDeletionResponse: (flag) => dispatch(deleteGatewayResponse(flag)),
  uiStartLoading : (message) => dispatch(uiStartLoading(message)),
  uiStopLoading : () => dispatch(uiStopLoading())
  }
};

async function requestLocationPermission() {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    {
      'title': appName + ' Location Permission',
      'message': appName + ' App needs access to your location ' +
        'for bluetooth operations.'
    }
  )
  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
    console.log("You can use the location")
    return;
  } else {
    console.log("Location permission denied")
    throw new Error('Location permission denied');
  }
}

function isJsonString(str) {
  try {
  JSON.parse(str);
  } catch (e) {
  return false;
  }
  return true;
 }

export const disconnectBleinGrowarea = () => {
  this.connectedBleGrowarea.destroy()
}

export default connect(mapStatesToProps, mapDispatchToProps)(GrowAreas);