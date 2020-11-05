import React, { Component } from 'react';
import {
  RefreshControl, StyleSheet, Text, View, TextField, Button,FlatList, ActivityIndicator, KeyboardAvoidingView,
  TouchableOpacity, Image, Modal, Platform, Alert, PermissionsAndroid, TextInput,
  ScrollView, Picker, AsyncStorage,Dimensions,Linking
} from 'react-native';
import  DialogInput  from 'react-native-dialog-input-custom';
import * as Constant from '../Constant';
import * as Urls from '../Urls';
import { displayName as appName, debug, bleDebug, liveChartDebug, deviceDiscoveryTimeout,software_sensor_discovery_name_prefix,gateway_discovery_name_prefix } from './../../app.json';
import { connect } from 'react-redux';
import { BleManager } from 'react-native-ble-plx';
import {
  setBleManager, addBleDevice, removeBleDevice, authSetUser,uiStartLoading,uiStopLoading,removeBleDevicefromDevice
} from '../store/actions/rootActions';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
import { Buffer } from "buffer";
import Amplify, { PubSub } from 'aws-amplify';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
import _ from 'lodash';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import Base64 from './../utils/Base64';
import CheckBox from 'react-native-check-box';
import { SearchBar } from 'react-native-elements';
import Icon from 'react-native-vector-icons/FontAwesome';
// import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Entypo from 'react-native-vector-icons/Entypo';
import { Navigation } from 'react-native-navigation';
import {WebView} from 'react-native-webview';
import analytics from '@react-native-firebase/analytics';
import database from '@react-native-firebase/database';
const {width,height} = Dimensions.get('window');

Amplify.addPluggable(new AWSIoTProvider(
  {
    aws_pubsub_region: '<AWS IOT core endpoint region>',
    aws_pubsub_endpoint: 'wss://<AWS IOT core endpoint>/mqtt',
}));

class Devices extends Component {

  static get options() {
    return {
      ...Constant.DEFAULT_NAVIGATOR_STYLE,
      leftButtons: [
        {
          id: 'buttonOne',
          icon: require('../../assets/images/containers.png')
        }
      ],
    };
  }
  deviceCharacteristics = {};
  connectedDevices = [];
  device = null;
  discoverCharSubscription = null;
  provisionCallbackCharSubscription = null;
  visible = false;
  provisionRequestSent = false;
  connectedBle = null;
  deviceConectivityCharFound = false;
  deviceNotificationChar = null;
  onTimeRegistredDevices = 0;
  discoonecFromCancel = false;
  GatewayMacID = null;
  timeOutValue = null;
  timeOutValueProvision = null;
  bleDevice=null;
  isVisible = false;
  alreadyRegistredSensors = [];

  constructor(props) {
      super(props);
      Navigation.events().bindComponent(this);

      if (!this.props.manager)
      {
        console.log("BLE Manager not found on Devices Screen");
        this.props.bleManager.destroy()
        this.props.onSetBleManager(new BleManager());
      }
      else {
        console.log("BLE Manager found on Devices Screen");
        if (Platform.OS === 'ios') {
          this.props.bleManager.destroy()
          this.props.onSetBleManager(new BleManager());
        }
      }

      this.state = {
        token: '',
        errorCode: 0,
        refreshing: false,
        deviceDiscoveryModalVisible: false,
        modalVisibleForSoftwareSensor: false,
        discoveredDevices: {},
        discoveredSoftwareSensor: {},
        deviceRegistrationModalVisible: false,
        callbackRegistredDevices: 0,
        isRegistrationProcessCompleted: false,
        showCancelButton: false,
        waitingDeviceLoader: false,
        sensors: [],
        gateways: [],
        email:'',
        chartflag: false,
        gatewayforSensor:'',
        editedSensor: '',
        displayDeviceID: '',
        userName: '',
      };

      if (this.props.selectedGrowArea) { // redirect from grow area
        this.growAreaId = this.props.selectedGrowArea.id;
        this.growAreaName = this.props.selectedGrowArea.name;

      }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (this.visible);
      }

      componentDidAppear() {
      /* 
      ================================================================
        Uncomment to use analytics and realtime database of firebase 
      ================================================================
        database()
        .ref('/users/Devices')
        .set({
          name: 'Component did appear',
        })
        .then(() => console.log('Data set for component did appear on devices.'));
        analytics().logEvent('devices_screen', {
          description: '',
          number: '113',
        })
        */
        this._onRefresh();
        this.forceUpdate();
        this.visible = true;
        AsyncStorage.getItem('email').then(response =>{
            let email = JSON.parse(response);
            this.setState({email: email});
        });
        AsyncStorage.getItem('accessToken').then(async (authToken) => {
        this.setState({ refreshing: true, searching: false, filterKey: '', token: authToken });

        this.setState({ refreshing: false })
        console.log(JSON.stringify(this.props.deviceTypes));
        /* 
        ================================================================
          Uncomment to use realtime database of firebase 
        ================================================================
        let uniqueKey = this.getUniqueID(this.state.email);
        console.log("Unique key:=====>>",uniqueKey);
        */
         let growAreaId = this.growAreaId;
         })

         AsyncStorage.getItem('listGateway').then(response => {
               let gateways = JSON.parse(response);
               this.setState({gateways:gateways});
         });

       }

    getSensorList(){

          AsyncStorage.getItem('sensorList').then(response => {
              sensors=JSON.parse(response)
              this.setState( { sensors})
          }).catch((e) => {
              console.log('error in getting asyncStorage\'s item:', e.message);
          })
          
          return this.state.sensors;
    }

     _onRefresh = () => {
        this.props.uiStartLoading("Fetching Sensor Data");
        AsyncStorage.getItem('email').then(response =>{
          let email = JSON.parse(response);
            this.setState({email: email});
        });
      AsyncStorage.getItem('accessToken').then((authToken) => {
         this.setState({ refreshing: true, searching: false, filterKey: '', token: authToken });
         this.getSensorList();
         this.setState({ refreshing: false, calledGetCurrentData: true });
        console.log(JSON.stringify(this.props.deviceTypes));
        this.props.uiStopLoading();

      })
    }

    alreadyRegistredSensor(registeredSensors) {
      try {
        console.log('Registered sensor -0=0-0-------------------=-0-=0=-0-=0=-0=-0=-0=-0=-', registeredSensors);
        var data = []
        if (registeredSensors != undefined) {
          registeredSensors.map((sensor) => {
            console.log('sensor maccc id', sensor.deviceUId);
            data.push(sensor.deviceUId);
          });
          return data;
        }
        return [];
      } catch (e) {
        console.log('error in alreadyRegistered data', e);
        Alert.alert('Alert', 'Failed to get already provisioned sensors\'s list. Please try again.');
      }
    }

    openHistoricalChart = (device) => {
      console.log(device);
      let screenName = 'Chart';
      Navigation.push(this.props.componentId, {
        component: {
          name: screenName,
          passProps: {
            gatewayId: device.gatewayId,
            deviceId: device.sensorId
          },
          options: {
            topBar: {
              visible: true,
              animate: true,
              elevation: 0,
              shadowOpacity: 0,
              drawBehind: false,
              hideOnScroll: false,
              background: {
                color: Constant.NAVIGATION_BACK_COLOR,
              },
              backButton: {
                title: 'Previous',
                color: '#fff',
                showTitle: true,
              },
              title: {
                text: screenName,
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
          }
        }
      });
    }

   showDeviceDiscoveryModal(visible, inBackground, keepProvisionCallback, showAlert) {
      console.log('flags', visible, inBackground, keepProvisionCallback, showAlert);

      if (visible) {
        if (Platform.OS === 'ios') {
          const subscription = this.props.bleManager.onStateChange((state) => {
            if (state === 'PoweredOn') {
              if (!inBackground) this.setState({ deviceDiscoveryModalVisible: true, waitingDeviceLoader: true });
              console.log("Checking for gateway connection")
              /*
              ================================================================
                Uncomment to use realtime database of firebase 
              ================================================================
              let showDiscoveryModalRef = this.getUniqueIDForReference() + 'showDiscoveryModal'
              console.log("showDiscoveryModalRef with UserName:=====>>",showDiscoveryModalRef);
              database()
                .ref(showDiscoveryModalRef)
                .set({
                  description: 'Checking for gateway connection',
                  method: 'showDeviceDiscoveryModal',
            })
            .then(() => console.log('Data set for showDiscoveryModal in devices screen'));
            */
              this.checkForGatewayConnection(inBackground);
              subscription.remove();
            }
            else if (state === 'PoweredOff') {
              alert("Please turn on the bluetooth");
            }
          }, true);
        }
        else {
          this.props.bleManager.disable()
          setTimeout(()=>{
          this.props.bleManager.enable() },1000);
          setTimeout(()=>{
          const subscription = this.props.bleManager.onStateChange((state) => {
            if (state === 'PoweredOn') {
              if (!inBackground) this.setState({ deviceDiscoveryModalVisible: true, waitingDeviceLoader: true });
              console.log("Checking for gateway connection")
              this.checkForGatewayConnection(inBackground);
              subscription.remove();
            }
            else if (state === 'PoweredOff') {
              this.props.bleManager.enable()
            }
          }, true);
  
          },2000);
        }
      }
      else if (showAlert) {

        Alert.alert(
          'Sensor Provision',
          'Are you sure, you want to discard discovered sensors?',
          [
            {
              text: 'Cancel',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
            {
              text: 'OK', onPress: () => {
                this.setState({
                  deviceDiscoveryModalVisible: visible,
                  errorCode: 1
                });
                this.stopDeviceScanUnsubscribeNotification(keepProvisionCallback);
              }
            },
          ],
          { cancelable: false },
        );
      }
      else {
        this.setState({
          deviceDiscoveryModalVisible: visible,
        });
      }
    }
      showSoftwareSensorDiscoveryModal(visible, inBackground, keepProvisionCallback, showAlert) {
         console.log('flags', visible, inBackground, keepProvisionCallback, showAlert);

         if (visible) {
           if (Platform.OS === 'ios') {
            const subscription = this.props.bleManager.onStateChange((state) => {
              if (state === 'PoweredOn') {
                if (!inBackground) this.setState({ modalVisibleForSoftwareSensor: true,waitingDeviceLoader: true });
                console.log("Checking for gateway connection in show software sensor discovery modal")
 
                this.scanAndConnectForSoftwareSensor(inBackground);
 
                subscription.remove();
              }
              else if (state === 'PoweredOff') {
                alert("Please turn on the bluetooth");
              }
            }, true);
           }
           else {
            this.props.bleManager.disable()
            setTimeout(()=>{
            this.props.bleManager.enable() },1000);
            setTimeout(()=>{
            const subscription = this.props.bleManager.onStateChange((state) => {
              if (state === 'PoweredOn') {
                if (!inBackground) this.setState({ modalVisibleForSoftwareSensor: true,waitingDeviceLoader: true });
                console.log("Checking for gateway connection")
 
                this.scanAndConnectForSoftwareSensor(inBackground);
 
                subscription.remove();
              }
              else if (state === 'PoweredOff') {
                this.props.bleManager.enable()
              }
            }, true);
 
            },2000);
           }
         }
         else if (showAlert) {

           Alert.alert(
             'Sensor Provision',
             'Are you sure, you want to discard discovered sensors?',
             [
               {
                 text: 'Cancel',
                 onPress: () => console.log('Cancel Pressed'),
                 style: 'cancel',
               },
               {
                 text: 'OK', onPress: () => {
                   this.setState({
                     modalVisibleForSoftwareSensor: visible,
                     errorCode: 1
                   });
                   this.stopDeviceScanUnsubscribeNotification(keepProvisionCallback);
                 }
               },
             ],
             { cancelable: false },
           );
         }
         else {
           this.setState({
             modalVisibleForSoftwareSensor: visible
           });
         }
       }
    async deleteSensorAPI(payload,device,sensorId,eui64)
    {
      let url = Urls.DELETE_GROWAREA;
      this.props.uiStartLoading("Deleting Selected Sensor");
      console.log("payload for sensor delete ---:"+JSON.stringify(payload));
      try{
            const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                    body: JSON.stringify(payload)})
            console.log("res---"+JSON.stringify(response));
            if(response.ok)
            {
              const msg = await response.json();
              console.log("response in json---"+msg);
              alert("Sensor deleted Successfully.");
              if (Platform.OS === 'ios') {
                console.log("Disconnecting BLE Connection after sensor deletion process");
                this.props.bleManager.destroy()
                this.props.onSetBleManager(new BleManager());
              }
              else {
                this.props.bleManager.destroy()
              }
             this.setSensorListAfterDeletion(sensorId);
              this.askForService(device,eui64);
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
   async swSensorDelete(sensor)
       {
         let url = Urls.DELETE_GROWAREA;
         this.props.uiStartLoading("Deleting Selected Sensor");
         payload = [{"gatewayId": sensor.gatewayId,"sensorId":sensor.sensorId,"deviceType":Constant.SENSOR_TYPE}];
         console.log("payload for sensor delete ---:"+JSON.stringify(payload));
         try{
               const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                       body: JSON.stringify(payload)})
               console.log("res---"+JSON.stringify(response));
               if(response.ok)
               {
                const msg = await response.json();
                console.log("response in json---"+msg);
                alert("Sensor deleted Successfully.");
                this.setSensorListAfterDeletion(sensor.sensorId);
                if (Platform.OS === 'android') {
                  this.props.bleManager.disable()
                }
                else {
                  this.props.bleManager.destroy()
                }
                setTimeout(() => {
                  if(this.state.sensors.length == 0)
                  {
                    console.log('timer value on deletion sensor',global.timerValue);
                    clearInterval(global.timerValue);
                    global.timerValue = null;
                  }
                }, 2000);
               
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

      setSensorListAfterDeletion(sensorId)
      {
        let sensors=this.state.sensors;
        let filteredList = sensors.filter((item) => item.sensorId !== sensorId);
        AsyncStorage.setItem('sensorList',JSON.stringify(filteredList)).then(() => {
          this.setState({sensors:filteredList});
          }).catch((error) => {
                  console.log('error in saving list of sensors to  local storage', error);

              })
         console.log('Delete Sensor from sensor list');
        this.props.uiStopLoading();
        this._onRefresh();
      }

        askForService = (device,eui64) => {
          /*
          ================================================================
            Uncomment to use analytics and realtime database of firebase 
          ================================================================
          let askForServiceRef = this.getUniqueIDForReference() + 'askForService'
          console.log("askForServiceRef with UserName:=====>>",askForServiceRef);
          database()
            .ref(askForServiceRef)
            .set({
              id: device.id,
              name: device.name,
              description: 'Discovering services and characteristics...',
            })
            .then(() => console.log('Data set for ask for service in devices screen'));
          analytics().logEvent('ask_for_service', {
            id: device.id,
            name: device.name,
            description: 'Discovering services and characteristics...',
          })
          */
          console.log("Ask for service");
          console.log("Discovering services and characteristics...");
          console.log("Device Name:=====>>",device.name);
          console.log("Device ID:=====>>",device.id);
          this.setState({
            deviceDiscoveryModalVisible: false,
            bleMessage: 'Discovering services and characteristics...',
            waitingDeviceLoader: false
          })
          device.discoverAllServicesAndCharacteristics()
            .then((device) => {
              console.log("DeviceId:::::::::" + device.id);
              this.deviceCharacteristics[device.id] = {};
              this.deviceCharacteristics[device.id]['mtu'] = device.mtu;
              device.services().then(services => {
                services = services.filter(this.isKnownService);
                console.log("Known Services size:" + services.length)
                if (services.length === 0) {
                  console.log("No known services found in connected device.");
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let deviceServicesRef = this.getUniqueIDForReference() + 'deviceServices'
                  console.log("deviceServicesRef with UserName:=====>>",deviceServicesRef);
                  database()
                    .ref(deviceServicesRef)
                      .set({
                        description: 'No known services found in connected device.',
                      })
                        .then(() => console.log('Data set for deviceServices in devices screen'));
                  analytics().logEvent('ask_for_service', {
                    description: 'No known services found in connected device.',
                  })
                  */
                  this.setState({
                    bleMessage: 'Required services not found. Disconnecting from device..',
                    waitingDeviceLoader: false
                  })
                  device.cancelConnection();
                }
                else {
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let discoverServicesRef = this.getUniqueIDForReference() + 'discoverServices'
                  console.log("discoverServicesRef with UserName:=====>>",discoverServicesRef);
                  database()
                    .ref(discoverServicesRef)
                      .set({
                        description: 'Services discovered..',
                      })
                        .then(() => console.log('Data set for discoverServices in devices screen'));
                  analytics().logEvent('ask_for_service', {
                    description: 'Services discovered..',
                  })
                  */
                  this.setState({
                    bleMessage: 'Services discovered..',
                    waitingDeviceLoader: false
                  })
                }
                services.forEach((service, i) => {
                  service.characteristics().then(characteristics => {
                    console.log("Service UUID:" + service.uuid);
                    console.log("Initial characteristics size:" + characteristics.length);
                    /*
                    ================================================================
                      Uncomment to use analytics and realtime database of firebase 
                    ================================================================
                    let characteristicsServicesRef = this.getUniqueIDForReference() + 'characteristicsServices'
                    console.log("characteristicsServicesRef with UserName:=====>>",characteristicsServicesRef);
                    database()
                    .ref(characteristicsServicesRef)
                      .set({
                        description: 'Service UUID',
                        id: service.uuid,
                      })
                        .then(() => console.log('Data set for characteristicsServices in devices screen'));
                    analytics().logEvent('ask_for_service', {
                      description: 'Service UUID',
                      id: service.uuid,
                    })
                    */
                    characteristics = characteristics.filter((characteristic) => {

                      characteristicPrefix = this.isKnownCharacteristic(characteristic);
                      if (characteristicPrefix) {
                        console.log("Characteristics UUID:" + characteristic.uuid);
                        /*
                        ================================================================
                          Uncomment to use analytics and realtime database of firebase 
                        ================================================================
                        let characteristicsIDRef = this.getUniqueIDForReference() + 'characteristicsID'
                        console.log("characteristicsIDRef with UserName:=====>>",characteristicsIDRef);
                        database()
                        .ref(characteristicsIDRef)
                         .set({
                          description: 'Characteristics UUID',
                          id: characteristic.uuid,
                        })
                        .then(() => console.log('Data set for characteristicsID in devices screen'));
                        analytics().logEvent('ask_for_service', {
                          description: 'Characteristics UUID',
                          id: characteristic.uuid,
                        })
                        */
                        this.deviceCharacteristics[device.id][characteristicPrefix] = characteristic;
                        return true;
                      }
                    });
                    console.log("After filtering characteristics size:" + characteristics.length);

                    if (i === services.length - 1) {
                      console.log("deviceCharacteristics List:", JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])));
                      /*
                      ================================================================
                        Uncomment to use analytics and realtime database of firebase 
                      ================================================================
                      let deviceCharacteristicsListRef = this.getUniqueIDForReference() + 'deviceCharacteristicsList'
                      console.log("deviceCharacteristicsListRef with UserName:=====>>",deviceCharacteristicsListRef);
                      database()
                        .ref(deviceCharacteristicsListRef)
                         .set({
                          description: 'Device Characteristics List',
                          id: JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])),
                          method: 'askForService',
                        })
                        .then(() => console.log('Data set for deviceCharacteristicsList in devices screen'));
                      analytics().logEvent('ask_for_service', {
                        description: 'deviceCharacteristics List',
                        id: JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])),
                      })
                      */
                      const dialog = Object.values(this.deviceCharacteristics[device.id]).find(
                        characteristic => characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse
                      )
                      if (!dialog) {
                        console.log("No writable characteristic");
                        /*
                        ================================================================
                          Uncomment to use analytics and realtime database of firebase 
                        ================================================================
                        let noWritableCharacteristicsRef = this.getUniqueIDForReference() + 'noWritableCharacteristics'
                        console.log("noWritableCharacteristicsRef with UserName:=====>>",noWritableCharacteristicsRef);
                        database()
                        .ref(noWritableCharacteristicsRef)
                         .set({
                          description: 'Required characteristics not found. Disconnecting from sensor..',
                          name: 'No writable characteristic',
                          method: 'askForService',
                        })
                        .then(() => console.log('Data set for noWritableCharacteristics in devices screen'));
                        analytics().logEvent('ask_for_service', {
                          description: 'No writable characteristic',
                        })
                        */
                        this.setState({
                          bleMessage: 'Required characteristics not found. Disconnecting from sensor..',
                          waitingDeviceLoader: false
                        })
                        device.cancelConnection();
                      }
                      else {
                        /*
                        ================================================================
                          Uncomment to use analytics and realtime database of firebase 
                        ================================================================
                        let writableCharacteristicsRef = this.getUniqueIDForReference() + 'writableCharacteristics'
                        console.log("writableCharacteristicsRef with UserName:=====>>",writableCharacteristicsRef);
                        database()
                        .ref(writableCharacteristicsRef)
                         .set({
                          description: 'Characteristics discovered..',
                          name: 'Opening registration modal..',
                          method: 'askForService',
                        })
                        .then(() => console.log('Data set for writableCharacteristics in devices screen'));
                        analytics().logEvent('ask_for_service', {
                          description: 'Characteristics discovered..',
                          detail: 'Opening registration modal..',
                        })
                        */
                        this.setState({
                          bleMessage: 'Characteristics discovered..',
                          waitingDeviceLoader: true
                        })
                        console.log("Opening registration modal..")

                        var deviceDeletionCharFound = false;
                        console.log('In Deletion Service Characteristic......................');
                        Object.keys(this.deviceCharacteristics[device.id]).every((characteristicPrefix) => {

                          if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_DELETION) {
                             this.deviceDeleteChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                             deviceDeletionCharFound = true;
                           }
                            return !(deviceDeletionCharFound)

                          });
                          if (deviceDeletionCharFound) {
                            /*
                            ================================================================
                              Uncomment to use analytics and realtime database of firebase 
                            ================================================================
                            let deviceDeletionCharacteristicsFoundRef = this.getUniqueIDForReference() + 'deviceDeletionCharacteristicsFound'
                            console.log("deviceDeletionCharacteristicsFoundRef with UserName:=====>>",deviceDeletionCharacteristicsFoundRef);
                            database()
                              .ref(deviceDeletionCharacteristicsFoundRef)
                                .set({
                                  description: 'Deleting Sensor service found....................',
                                  method: 'askForService',
                                })
                                  .then(() => console.log('Data set for deviceDeletionCharacteristicsFound in devices screen'));
                            analytics().logEvent('ask_for_service', {
                              description: 'Deleting Sensor service found....................',
                            })
                            */
                             console.log('Deleting Sensor service found....................');
                             this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false});
                             this.sendSensorDeletionPayload(this.deviceDeleteChar,eui64,device);
                          }
                        else {
                          /*
                          ================================================================
                            Uncomment to use analytics and realtime database of firebase 
                          ================================================================
                          let deviceDeletionCharacteristicsNotFoundRef = this.getUniqueIDForReference() + 'deviceDeletionCharacteristicsNotFound'
                          console.log("deviceDeletionCharacteristicsNotFoundRef with UserName:=====>>",deviceDeletionCharacteristicsNotFoundRef);
                            database()
                              .ref(deviceDeletionCharacteristicsNotFoundRef)
                                .set({
                                  description: 'One of the required characteristic for deletion of sensor not found in connected gateway. Disconnecting..',
                                  method: 'askForService',
                                })
                                  .then(() => console.log('Data set for deviceDeletionCharacteristicsNotFound in devices screen'));
                          analytics().logEvent('ask_for_service', {
                            description: 'One of the required characteristic for deletion of sensor not found in connected gateway. Disconnecting..',
                          })
                          */
                          alert("One of the required characteristic for deletion of sensor not found in connected gateway. Disconnecting..");
                        }
                      }
                    }
                  })
                })
              })
            })
            .catch((error) => {
                this.props.uiStopLoading();
              if (error.errorCode === 205) {
                /*
                ================================================================
                  Uncomment to use analytics and realtime database of firebase 
                ================================================================
                let errorAskForServicesRef = this.getUniqueIDForReference() + 'errorAskForServices'
                console.log("errorAskForServicesRef with UserName:=====>>",errorAskForServicesRef);
                database()
                  .ref(errorAskForServicesRef)
                    .set({
                      description: 'Unable to connect device......',
                      errorMessage: error.message,
                      errorCode: error.errorCode,
                      method: 'askForService',
                    })
                      .then(() => console.log('Data set for errorAskForServices in devices screen'));
                analytics().logEvent('ask_for_service_error_message', {
                  description: error.message,
                  detail: 'Unable to connect device......',
                })
                */
                console.log("ErrorMessage:" + error.message);
                this.props.onRemoveDevice(device.id);
                alert('Unable to connect device......');
              }
              else {
                /*
                ================================================================
                  Uncomment to use analytics and realtime database of firebase 
                ================================================================
                let errorToConnectAskForServicesRef = this.getUniqueIDForReference() + 'errorToConnectAskForServices'
                console.log("errorToConnectAskForServicesRef with UserName:=====>>",errorToConnectAskForServicesRef);
                database()
                  .ref(errorToConnectAskForServicesRef)
                    .set({
                      description: 'Unable to connect to Gateway. Please try adding sensor again.',
                      method: 'askForService',
                      errorMessage: error.message,
                      errorCode: error.errorCode,
                    })
                      .then(() => console.log('Data set for errorToConnectAskForServices in devices screen'));
                analytics().logEvent('ask_for_service_error_message', {
                  description: 'Unable to connect to Gateway. Please try adding sensor again.',
                })
                */
                this.setState({
                  deviceDiscoveryModalVisible: false,
                  bleMessage: 'Error: Unable to connect to Gateway. Please try adding sensor again.',
                  waitingDeviceLoader: false
                })
                console.log("Error: " + error.message)
                console.log("ErrorCode:" + error.errorCode)
                device.cancelConnection().catch(error => {
                  console.log("Sensor is already disconnected." + error.message);
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let errorCancelConnectionAskForServicesRef = this.getUniqueIDForReference() + 'errorCancelConnectionAskForServices'
                  console.log("errorCancelConnectionAskForServicesRef with UserName:=====>>",errorCancelConnectionAskForServicesRef);
                  database()
                  .ref(errorCancelConnectionAskForServicesRef)
                    .set({
                      description: 'Sensor is already disconnected.',
                      errorMessage: error.message,
                      errorCode: error.errorCode,
                      method: 'askForService',
                    })
                      .then(() => console.log('Data set for errorAskForServices in devices screen'));
                  analytics().logEvent('ask_for_service_error_message', {
                    description: error.message,
                    detail: 'Sensor is already disconnected.',
                  })
                  */
                });
              }
            })

        }
     sendSensorDeletionPayload(characteristic,sensor,device)
      {
        let payload = [
          {
          eui64: sensor,
          deviceType: Constant.SENSOR_TYPE
          }
        ];
      console.log("Checking characristics for send payload to BLE");
      console.log("sensorId:" + sensor);

        if(characteristic){
          this.writeCharacteristics(characteristic, payload, (this.deviceCharacteristics[device.id].mtu - 3), 'sendDeletionOfSensor');
          console.log('Sensor deleted successfully....Data has been sent to connected gateway for deletion');
          this._onRefresh();
        } else {
          return true;
        }
      }

    showDeviceDiscoveryModalForDeletionOfSensor(visible, inBackground,sensorId,eui64) {
          console.log('flags', visible, inBackground);

          if (visible) {
            this.props.uiStartLoading('Deleting Selected Sensor');
            if (Platform.OS === 'ios') {
              const subscription = this.props.bleManager.onStateChange((state) => {
                if (state === 'PoweredOn') {
                  if (!inBackground) this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                  console.log("Checking for gateway connection");
  
                  console.log('id', this.GatewayMacID, this.growAreaId);
                  console.log('Total gateways Devices connected----------------', this.props.bleDevices);
                  if (this.growAreaId) {
                       console.log('in this.pros.----------------', this.props.bleDevices[this.GatewayMacID]);
                       payload = [{"gatewayId": this.growAreaId,"sensorId":sensorId,"deviceType":Constant.SENSOR_TYPE}];
                       if (this.props.bleDevices[this.GatewayMacID]) {
                         this.device = this.props.bleDevices[this.GatewayMacID];
                         console.log("Gateway found in redux..", this.device);
                          console.log("after---"+this.props.bleDevices);
                          this.timeOutValue = setTimeout(() => {
                                this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                this.props.uiStartLoading("Deleting Selected Sensor");
                                this.factoryResetDevice(payload,sensorId);
                          }, 20000)
                          console.log("Scanning for gateway..")
                          this.props.uiStopLoading();
                          this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
                        }
                       else
                       {
                          this.timeOutValue = setTimeout(() => {
                                  this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                  this.props.uiStartLoading("Deleting Selected Sensor");
                                  this.factoryResetDevice(payload,sensorId);
                          }, 20000)
                          this.props.uiStopLoading();
                          console.log("Scanning for gateway..")
                          this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
  
                       }
                   }
                   else
                   {
                        payload = [{"gatewayId": this.state.gatewayforSensor,"sensorId":sensorId,"deviceType":Constant.SENSOR_TYPE}];
                        console.log("payload for sensor delete --"+JSON.stringify(payload)); 
                        this.timeOutValue = setTimeout(() => {
                         this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                    this.props.uiStartLoading("Deleting Selected Sensor");
                                  this.factoryResetDevice(payload,sensorId);
                         }, 20000)
                         this.props.uiStopLoading();
                         console.log("Scanning for gateway..")
                         this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
  
                   }
                  subscription.remove();
                }
                else if (state === 'PoweredOff') {
                  console.log("in poweroff state");
                  alert("Please turn on the bluetooth");
                }
              }, true);
            }
            else {
              this.props.bleManager.disable()
              setTimeout(()=>{
              this.props.bleManager.enable() },1000);
            setTimeout(()=>{
              const subscription = this.props.bleManager.onStateChange((state) => {
                if (state === 'PoweredOn') {
                  if (!inBackground) this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                  console.log("Checking for gateway connection");
  
                  console.log('id', this.GatewayMacID, this.growAreaId);
                  console.log('Total gateways Devices connected----------------', this.props.bleDevices);
                  if (this.growAreaId) {
                       console.log('in this.pros.----------------', this.props.bleDevices[this.GatewayMacID]);
                       payload = [{"gatewayId": this.growAreaId,"sensorId":sensorId,"deviceType":Constant.SENSOR_TYPE}];
                       if (this.props.bleDevices[this.GatewayMacID]) {
                         this.device = this.props.bleDevices[this.GatewayMacID];
                         console.log("Gateway found in redux..", this.device);
                         this.props.bleManager.destroy();
                         this.props.onSetBleManager(new BleManager());
                          console.log("after---"+this.props.bleDevices);
                          this.timeOutValue = setTimeout(() => {
                                this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                this.props.uiStartLoading("Deleting Selected Sensor");
                                this.factoryResetDevice(payload,sensorId);
                          }, 20000)
                          console.log("Scanning for gateway..")
                          this.props.uiStopLoading();
                          this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
                        }
                       else
                       {
                          this.timeOutValue = setTimeout(() => {
                                  this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                  this.props.uiStartLoading("Deleting Selected Sensor");
                                  this.factoryResetDevice(payload,sensorId);
                          }, 20000)
                          this.props.uiStopLoading();
                          console.log("Scanning for gateway..")
                          this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
  
                       }
                   }
                   else
                   {
                        payload = [{"gatewayId": this.state.gatewayforSensor,"sensorId":sensorId,"deviceType":Constant.SENSOR_TYPE}];
                        console.log("payload for sensor delete --"+JSON.stringify(payload)); 
                        this.timeOutValue = setTimeout(() => {
                         this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                                    this.props.uiStartLoading("Deleting Selected Sensor");
                                  this.factoryResetDevice(payload,sensorId);
                         }, 20000)
                         this.props.uiStopLoading();
                         console.log("Scanning for gateway..")
                         this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
  
                   }
                  subscription.remove();
                }
                else if (state === 'PoweredOff') {
                  console.log("in poeroff state");
                  this.props.bleManager.enable()
                }
              }, true);
  
            },2000);
            }
          }
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
     softWareSensorRegister(payload)
    {
        this.props.uiStartLoading("Provisioning Selected Sensors");
        this.props.bleManager.stopDeviceScan();
        console.log("Register software sensor with payload:=====>>",payload);
        this.setState({modalVisibleForSoftwareSensor: false,waitingDeviceLoader: false,discoveredSoftwareSensor:{}});
        if(payload.length !== 0)
        {

            let connectedDevice;
            let connectedResponse = [];
            let apiFinalPayload = [];

            payload.map((pay) =>
            {
              if (Platform.OS === 'ios') {
                let apiPayload = {
                  gatewayId : pay.gatewayId,
                  sensorName : pay.device_name,
                  eui64 : pay.deviceUId,
                  deviceType : pay.device_type,
                  description : pay.description,
                }
                apiFinalPayload.push(apiPayload);
              }
              else {
                let apiPayload = {
                  gatewayId : pay.gatewayId,
                  sensorName : pay.device_name,
                  eui64 : pay.eui64,
                  deviceType : pay.device_type,
                  description : pay.description,
                }
                apiFinalPayload.push(apiPayload);
              }
          })
            payload.map(async (item) => {
            try {
                    connectedDevice = await this.props.bleManager.connectToDevice(item.id, { timeout: 20000 });
                    this.provisionSwGatewayApi(apiFinalPayload,payload,connectedDevice);
                    connectedResponse.push(connectedDevice);
            } catch (error) {
                console.log("err-----------------",error);
                alert("Unable to connect to sensor. Please try again....");
                this.props.uiStopLoading();
                return;
            }
        })
        }
        else
        {
            alert('Please select Sensor that you need to connect');
            this.props.uiStopLoading();
        }
    }
    connectCharacteristicsAndServices(device)
    {
      console.log("Connect characteristics and services called");
      /*
      ================================================================
        Uncomment to use analytics and realtime database of firebase 
      ================================================================
      let connectCharsAndServicesRef = this.getUniqueIDForReference() + 'connectCharacteristicsAndServices'
      console.log("connectCharacteristicsAndServices with UserName:=====>>",connectCharsAndServicesRef);
          database()
        .ref(connectCharsAndServicesRef)
        .set({
          id: device.id,
          name: device.name,
          description: 'Discovering services and characteristics...',
          method: 'connectCharacteristicsAndServices'
        })
        .then(() => console.log('Data set for connectCharacteristicsAndServices in devices screen'));
      analytics().logEvent('connect_characteristics_services', {
        description: 'connect characteristics and services',
        detail: 'Discovering services and characteristics...',
        id: device.id,
        name: device.name,
      })
      */
      console.log("connect characteristics and services");
          console.log("Discovering services and characteristics...");
          console.log("Device Name:=====>>",device.name);
          console.log("Device ID:=====>>",device.id);
              this.setState({
                bleMessage: 'Discovering services and characteristics...',
                waitingDeviceLoader: true
              })

              device.discoverAllServicesAndCharacteristics()
                .then((device) => {
                  console.log("DeviceId:" + device.id);
                  this.deviceCharacteristics[device.id] = {};
                  this.deviceCharacteristics[device.id]['mtu'] = device.mtu;
                  device.services().then(services => {
                    console.log("Total Services size:" + services.length);
                    if (services.length === 0) {
                      console.log("No known services found in connected device.");
                      /*
                      ================================================================
                        Uncomment to use analytics and realtime database of firebase 
                      ================================================================
                      let deviceServicesForConnectCharsAndServicesRef = this.getUniqueIDForReference() + 'deviceServicesForConnectCharsAndServices'
                      console.log("deviceServicesForConnectCharsAndServicesRef with UserName:=====>>",deviceServicesForConnectCharsAndServicesRef);
                      database()
                        .ref(deviceServicesForConnectCharsAndServicesRef)
                          .set({
                            description: 'No known services found in connected device.',
                            detail: 'Discover all services and characteristics',
                            method: 'connectCharacteristicsAndServices',
                          })
                            .then(() => console.log('Data set for deviceServicesForConnectCharsAndServices in devices screen'));
                      analytics().logEvent('connect_characteristics_services', {
                        description: 'No known services found in connected device.',
                        detail: 'Discover all services and characteristics',
                      })
                      */
                      this.setState({
                        bleMessage: 'Required services not found. Disconnecting from device..',
                        waitingDeviceLoader: false
                      })
                      device.cancelConnection();
                    }
                    else {
                      /*
                      ================================================================
                        Uncomment to use analytics and realtime database of firebase 
                      ================================================================
                      let discoverServicesForConnectCharsAndServicesRef = this.getUniqueIDForReference() + 'discoverServicesForConnectCharsAndServices'
                      console.log("deviceServicesForConnectCharsAndServicesRef with UserName:=====>>",discoverServicesForConnectCharsAndServicesRef);
                      database()
                        .ref(discoverServicesForConnectCharsAndServicesRef)
                          .set({
                            description: 'Services discovered..',
                            detail: 'Discover all services and characteristics',
                            method: 'connectCharacteristicsAndServices',
                          })
                            .then(() => console.log('Data set for discoverServicesForConnectCharsAndServices in devices screen'));
                      analytics().logEvent('connect_characteristics_services', {
                        description: 'Services discovered..',
                        detail: 'Discover all services and characteristics',
                      })
                      */
                      this.setState({
                        bleMessage: 'Services discovered..',
                        waitingDeviceLoader: true
                      })
                    }

                    services.forEach((service, i) => {
                      if (service.uuid.startsWith(Constant.KNOWN_BLE_SERVICES.SERVICE_SW_SENSOR_PROVISION_UUID))
                      {
                        /*
                        ================================================================
                          Uncomment to use analytics and realtime database of firebase 
                        ================================================================
                        let serviceIDForConnectCharsAndServicesRef = this.getUniqueIDForReference() + 'serviceIDForConnectCharsAndServices'
                        console.log("deviceServicesForConnectCharsAndServicesRef with UserName:=====>>",serviceIDForConnectCharsAndServicesRef);
                        database()
                        .ref(serviceIDForConnectCharsAndServicesRef)
                          .set({
                            description: 'Service UUID',
                            detail: 'Discover all services and characteristics',
                            method: 'connectCharacteristicsAndServices',
                            id: service.uuid,
                          })
                            .then(() => console.log('Data set for serviceIDForConnectCharsAndServices in devices screen'));
                        analytics().logEvent('connect_characteristics_services', {
                          description: 'Service UUID',
                          detail: 'Discover all services and characteristics',
                          id: service.uuid
                        })
                        */
                        service.characteristics().then(characteristics => {
                        console.log("Service UUID:" + service.uuid);
                        console.log("Initial characteristics size:" + characteristics.length);
                        characteristics = characteristics.filter((characteristic) => {

                          characteristicPrefix = this.isKnownCharacteristic(characteristic);
                          if (characteristicPrefix) {
                            /*
                            ================================================================
                              Uncomment to use analytics and realtime database of firebase 
                            ================================================================
                            let characteristicsIDForConnectCharsAndServicesRef = this.getUniqueIDForReference() + 'characteristicsIDForConnectCharsAndServices'
                            console.log("characteristicsIDForConnectCharsAndServicesRef with UserName:=====>>",characteristicsIDForConnectCharsAndServicesRef);
                            database()
                            .ref(characteristicsIDForConnectCharsAndServicesRef)
                              .set({
                                description: 'Characteristics UUID',
                                detail: 'Discover all services and characteristics',
                                method: 'connectCharacteristicsAndServices',
                                id: characteristic.uuid,
                              })
                            .then(() => console.log('Data set for characteristicsIDForConnectCharsAndServices in devices screen'));
                            analytics().logEvent('connect_characteristics_services', {
                              description: 'Characteristics UUID',
                              detail: 'Discover all services and characteristics',
                              id: characteristic.uuid
                            })
                            */
                            console.log("Characteristics UUID:" + characteristic.uuid);
                            this.deviceCharacteristics[device.id][characteristicPrefix] = characteristic;
                            return true;
                          }
                        });
                        console.log("After filtering characteristics size:" + characteristics.length);

                          console.log("deviceCharacteristics List:", JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])));
                          /*
                          ================================================================
                            Uncomment to use analytics and realtime database of firebase 
                          ================================================================
                          let deviceCharacteristicsListForConnectCharsAndServicesRef = this.getUniqueIDForReference() + 'deviceCharacteristicsListForConnectCharsAndServices'
                          console.log("deviceCharacteristicsListForConnectCharsAndServicesRef with UserName:=====>>",deviceCharacteristicsListForConnectCharsAndServicesRef);
                          database()
                            .ref(deviceCharacteristicsListForConnectCharsAndServicesRef)
                              .set({
                                description: 'Characteristics discovered..',
                                method: 'connectCharacteristicsAndServices',
                                id: JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])),
                              })
                            .then(() => console.log('Data set for deviceCharacteristicsListForConnectCharsAndServices in devices screen'));
                          analytics().logEvent('connect_characteristics_services', {
                            description: 'Characteristics discovered..',
                            detail: 'Discover all services and characteristics',
                          })  
                          */
                          this.setState({
                              bleMessage: 'Characteristics discovered..',
                              waitingDeviceLoader: true
                            })
                            let sensors = this.state.sensors;
                            let connectedSensor = sensors.find(item => item.deviceUId === device.id)
                            let topic = 'gateway/'+connectedSensor.gatewayId+'/telemetry';
                           var deviceHumidityCharFound = false;
                           var deviceCo2CharFound = false;
                           var deviceTemperatureCharFound =false;
                           var devicePirCharFound = false;
                            Object.keys(this.deviceCharacteristics[device.id]).map((characteristicPrefix) => {
                             if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_SW_SENSOR_PIR_UUID) {
                                this.devicePirChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                                devicePirCharFound = true;
                              }
                            if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_SW_SENSOR_HUMIDITY_UUID) {
                               this.deviceHumidityChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                               deviceHumidityCharFound = true;
                             }
                            if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_SW_SENSOR_CO2_UUID) {
                               this.deviceCo2Char = this.deviceCharacteristics[device.id][characteristicPrefix];
                               deviceCo2CharFound = true;
                             }
                            if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_SW_SENSOR_TEMPERATURE_UUID) {
                               this.deviceTemperatureChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                               deviceTemperatureCharFound = true;
                             }
                                    return !(deviceHumidityCharFound && deviceCo2CharFound && deviceTemperatureCharFound)
                              });
                            if(deviceHumidityCharFound && deviceCo2CharFound && deviceTemperatureCharFound && devicePirCharFound){
                                 console.log('Found every characteristics value.......');

                                 this.listenPirValue(this.devicePirChar,connectedSensor,topic);
                                 this.listenHumidityValue(this.deviceHumidityChar,connectedSensor,topic);
                                 this.listenCo2Value(this.deviceCo2Char,connectedSensor,topic);
                                 this.listenTemperatureValue(this.deviceTemperatureChar,connectedSensor,topic);
                            }else{
                                alert("One of the required characteristic not found in connected sensor");
                            }

                        //  }

                      })
                     }
                    })
                  })
                })
                .catch((error) => {
                  if (error.errorCode === 205) {
                    /*
                    ================================================================
                      Uncomment to use analytics and realtime database of firebase 
                    ================================================================
                    let errorForConnectCharacteristicsAndServicesRef = this.getUniqueIDForReference() + 'errorForConnectCharacteristicsAndServices'
                    console.log("errorForConnectCharacteristicsAndServicesRef with UserName:=====>>",errorForConnectCharacteristicsAndServicesRef);
                    database()
                    .ref(errorForConnectCharacteristicsAndServicesRef)
                    .set({
                      description: 'Unable to connect device......',
                      errorMessage: error.message,
                      errorCode: error.errorCode,
                      method: 'connectCharacteristicsAndServices',
                    })
                      .then(() => console.log('Data set for errorForConnectCharacteristicsAndServices in devices screen'));
                    analytics().logEvent('connect_characteristics_services', {
                      description: 'ErrorMessage',
                      detail: error.message,
                    }) 
                    */
                    console.log("ErrorMessage:" + error.message);
                    this.props.onRemoveDevice(device.id);
                    setTimeout(() => {
                      this.checkForGatewayConnection();
                    }, 1000);
                  }
                  else {
                    this.setState({
                      bleMessage: 'Error: Unable to connect to Gateway. Please try adding sensor again.',
                      waitingDeviceLoader: false
                    })
                    /*
                    ================================================================
                      Uncomment to use analytics and realtime database of firebase 
                    ================================================================
                    let errorToConnectForConnectCharacteristicsAndServicesRef = this.getUniqueIDForReference() + 'errorToConnectForConnectCharacteristicsAndServices'
                    console.log("errorToConnectForConnectCharacteristicsAndServicesRef with UserName:=====>>",errorToConnectForConnectCharacteristicsAndServicesRef);
                    database()
                    .ref(errorToConnectForConnectCharacteristicsAndServicesRef)
                    .set({
                      description: 'No readable characteristics in connected Sensor',
                      errorMessage: error.message,
                      errorCode: error.errorCode,
                      method: 'connectCharacteristicsAndServices',
                    })
                      .then(() => console.log('Data set for errorToConnectForConnectCharacteristicsAndServices in devices screen'));
                    analytics().logEvent('connect_characteristics_services', {
                      description: 'No readable characteristics in connected Sensor',
                      detail: error.message,
                    }) 
                    */
                    console.log("Error: " + error.message)
                    console.log("ErrorCode:" + error.errorCode)
                    alert('No readable characteristics in connected Sensor');
//                    device.cancelConnection().catch(error => {
//                      console.log("Sensor is already disconnected." + error.message);
//                    });
                  }
                })
    }

 listenPirValue = (devicePirChar,connectedSensor,topic) => {

     this.pirCharSubscription = devicePirChar.monitor((error, characteristic) => {
       if (error) {
         console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nPirCharacteristicsSubscription');
         if (this.state.errorCode === 1) {
           console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nPirCharacteristicsSubscription');
         }
       }
       else {

               let value = Buffer.from(characteristic.value, "base64");
                pirValue = value.toString("hex");
                console.log('PIR Value--------',pirValue);
                console.log('Topic-------------------',topic);
                let payload = {"sensorName": connectedSensor.device_name,
                               "gatewayId" : connectedSensor.gatewayId,
                               "sensorId" : connectedSensor.sensorId,
                               "timestamp":Date.now().toString(),
                               "PIR":Number(pirValue)};
                console.log('Payload---------------',payload);

                PubSub.publish(topic,payload);

       }
     }, 'myPirTransactionValue');
   }
   listenCo2Value = (deviceCo2Char,connectedSensor,topic) => {

        this.co2CharSubscription = deviceCo2Char.monitor((error, characteristic) => {
          if (error) {
            console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nCo2CharacteristicsSubscription');
            if (this.state.errorCode === 1) {
              console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nC02CharacteristicsSubscription');
            }
          }
          else {

                let value = this.convertValueToDecimal(characteristic);
                console.log('Co2 value----------',value);
                console.log('Topic-------------------',topic);
                let payload = {"sensorName": connectedSensor.device_name,
                               "gatewayId" : connectedSensor.gatewayId,
                               "sensorId" : connectedSensor.sensorId,
                               "timestamp":Date.now().toString(),
                               "CO2": Number(value)};
                console.log('Payload---------------',payload);

                PubSub.publish(topic,payload);

          }
        }, 'myCo2TransactionValue');
   }
   listenHumidityValue = (deviceHumidityChar,connectedSensor,topic) => {

        this.humidityCharSubscription = deviceHumidityChar.monitor((error, characteristic) => {
          if (error) {
            console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nHumidityCharacteristicsSubscription');
            if (this.state.errorCode === 1) {
              console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nHumidityCharacteristicsSubscription');
            }
          }
          else {

            let value = this.convertValueToDecimal(characteristic);

            let humidityValue = (value/100);

            console.log('Humidity value-------',humidityValue);
            console.log('Topic-------------------',topic);
                let payload = {"sensorName": connectedSensor.device_name,
                               "gatewayId" : connectedSensor.gatewayId,
                               "sensorId" : connectedSensor.sensorId,
                               "timestamp":Date.now().toString(),
                               "humidity": humidityValue};
            console.log('Payload---------------',payload);

            PubSub.publish(topic,payload);


          }
        }, 'myHumidityTransactionValue');


    }
    listenTemperatureValue = (deviceTemperatureChar,connectedSensor,topic) => {

         this.temperatureCharSubscription = deviceTemperatureChar.monitor((error, characteristic) => {
           if (error) {
             console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nTemperatureCharacteristicsSubscription');
             if (this.state.errorCode === 1) {
               console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nTemperatureCharacteristicsSubscription');
             }
           }
           else {

            let value = this.convertValueToDecimal(characteristic);

            let temperatureValue = (value/100);

            temperatureValue = ((temperatureValue * 9)/5) + 32;

            temperatureValue = parseInt(temperatureValue * 100 + 0.5);

            temperatureValue = temperatureValue/100;

            console.log('Temperature value-------',temperatureValue);

            console.log('Topic-------------------',topic);
            let payload = {"sensorName": connectedSensor.device_name,
                           "gatewayId" : connectedSensor.gatewayId,
                           "sensorId" : connectedSensor.sensorId,
                           "timestamp":Date.now().toString(),
                           "temperature":temperatureValue};
            console.log('Payload---------------',payload);

            PubSub.publish(topic,payload);


           }
         }, 'myTemperatureTransactionValue');
    }

    convertValueToDecimal = (characteristic) => {

            let value = Buffer.from(characteristic.value, "base64");
            valueBigEndian = value.toString("hex");

            let firstString = valueBigEndian.toString().slice(2);
            let secondString = valueBigEndian.toString().slice(0,2);

            valueLittleEndian = firstString + secondString;

            var converter = require('hex2dec');

            var dec = converter.hexToDec(valueLittleEndian.toString());

            return dec;

    }

    async provisionSwGatewayApi(apipayload,payload,connectedDevice) {
        this.props.uiStartLoading("Provisioning software sensor ...");
        let url = Urls.CREATE_GROWAREA;
        console.log("payload for sensor provision ---:" + JSON.stringify(apipayload));
        try {
          const response = await fetch(url, {
            method: "POST", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(apipayload)
          })
          console.log("res---" + JSON.stringify(response));
          if (response.ok) {
            const msg = await response.json();
            console.log("response in json---" + JSON.stringify(msg));
            let sensorId = msg["thing"][0]["thingName"];
            console.log("SensorId------------------",sensorId);
            let finalSensors = this.state.sensors;
            payload.map((item) => {
                item.sensorId = sensorId;
                finalSensors.push(item);
            });

            console.log('Total Sensor-------',finalSensors);
             AsyncStorage.setItem('sensorList', JSON.stringify(finalSensors)).then((token) => {
                this.setState({ sensors });
              }).catch((error) => {
                console.log('error in saving name', error);
              })
             this.callGetUserAPI();
             this.connectCharacteristicsAndServices(connectedDevice);

             alert('Sensor Provisioned Successfully');
             this.props.uiStopLoading();

             this._onRefresh();

          }
          else {
             if (Platform.OS === 'android') {
              this.props.bleManager.destroy();
              this.props.onSetBleManager(new BleManager());
              this.props.bleManager.disable()
              setTimeout(()=>{this.props.bleManager.enable() },1000);
             }
             else {
              this.props.bleManager.destroy();
              this.props.onSetBleManager(new BleManager());
             }
            this.props.uiStopLoading();
            alert("Something went wrong while provision sensor. Please try again");
          }
        } catch (err) {
            if (Platform.OS === 'android') {
              this.props.bleManager.destroy();
              this.props.onSetBleManager(new BleManager());
              this.props.bleManager.disable()
            setTimeout(()=>{this.props.bleManager.enable() },1000);
            }
            else {
              this.props.bleManager.destroy();
              this.props.onSetBleManager(new BleManager());
            }
          this.props.uiStopLoading();
          alert("Something went wrong while provision sensor. Please try again");
        }
      }

    factoryResetDevice(payload,sensorId)
    {
            this.props.uiStopLoading();
            this.props.bleManager.stopDeviceScan();
            Alert.alert('Gateway is not reachable at this time.','Factory reset will be required after deletion. Are you sure want to do Force delete of Sensor?',
            [
             {
                text: 'Cancel', onPress: () => {
                  console.log('delete operation was canceled.');
                }, style: 'cancel'
             },
             {
                text: 'Delete', onPress: async() => {
                   this.props.uiStartLoading('Deleting selected Sensor');
                   let url = Urls.DELETE_GROWAREA;
                   console.log("payload for Sensor delete ---:"+JSON.stringify(payload));
                   try{
                        const response = await fetch(url,{ method: "POST",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                                         body: JSON.stringify(payload)})
                        console.log("res---"+JSON.stringify(response));
                        if(response.ok)
                        {
                          const msg = await response.json();
                          console.log("response in json---"+msg);
                          this.props.uiStopLoading();
                          alert("Sensor deleted Successfully. Please do Factory Reset of Sensor");
                          this.setSensorListAfterDeletion(sensorId);
                          this._onRefresh();
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
    }
    onRegisterDevicesClick() {

      console.log("Register button clicked:" + JSON.stringify(Object.values(this.state.discoveredDevices)));
      this.setState({ isRegistrationProcessCompleted: false })

      Object.values(this.state.discoveredDevices).map((device) => {
        console.log('device--------------------------', device.decision);
        if (device.decision) {
          this.onTimeRegistredDevices = this.onTimeRegistredDevices + 1;
          console.log('this.ontime count', this.onTimeRegistredDevices);

        }
      });
      if (this.deviceNotificationChar && this.device) {
        this.provisionRequestSent = true;
        let payload = Object.values(this.state.discoveredDevices);

        this.writeCharacteristics(this.deviceNotificationChar, payload, (this.deviceCharacteristics[this.device.id].mtu - 3), 'sendProvisionDevices')
        if (this.deviceProvisionCallbackChar && this.onTimeRegistredDevices != 0) {
          console.log('hello if-==-=-=-=-',this.deviceProvisionCallbackChar);

          this.handleProvisionCallbackNotifications(this.deviceProvisionCallbackChar);
        }
        this.showDeviceDiscoveryModal(false, true, true, false);
        if (this.onTimeRegistredDevices !== 0) {
          this.setState({ deviceRegistrationModalVisible: true })
            setTimeout(() => {
              console.log('this.state.isRegistrationProcessCompleted', this.state.isRegistrationProcessCompleted);
              if (!this.state.isRegistrationProcessCompleted) {
                this.setState({ deviceRegistrationModalVisible: false, isRegistrationProcessCompleted: true, errorCode: 1 })
                this.onTimeRegistredDevices = 0;
                this._onRefresh();
                // if (Platform.OS === 'android') {
                  this.disconnectBleConnection();
                // }
              }
            }, (this.onTimeRegistredDevices * 120000))  // set 2 min timer to read response for sensors.
          }
        }
      else {
        if (this.device)
          alert('Connected BLE device does not have provision capabilities.');
        else
          alert("Device not connected" + this.onTimeRegistredDevices);
      }
    }

    stopDeviceScanUnsubscribeNotification(keepProvisionCallback) {
      console.log('hello stop');

      if (this.deviceDiscoverChar && this.device) {
        let payload = { discoverDevices: 0 }
        this.writeCharacteristics(this.deviceDiscoverChar, payload, (this.deviceCharacteristics[this.device.id].mtu - 3), 'sendStopDiscoverDevice')
        if (!keepProvisionCallback) {
          payload = [];
          Object.values(this.state.discoveredDevices).forEach(device => {
            device.decision = false;
            payload.push(device);
          });
          this.writeCharacteristics(this.deviceProvisionChar, payload, (this.deviceCharacteristics[this.device.id].mtu - 3), 'sendProvisionDevices')
          this.setState({
            discoveredDevices: {}
          });
        }
      }
      if (this.discoverCharSubscription) {
        this.discoverCharSubscription.remove();
      }
      if (this.connectivitySubscription) {
        this.connectivitySubscription.remove();
      }
      if (this.provisionCallbackCharSubscription && !keepProvisionCallback) {
        console.log('keepprovision callback', keepProvisionCallback);

        this.provisionCallbackCharSubscription.remove();
      }
      this.props.bleManager.stopDeviceScan();
    }

 checkForGatewayConnection = (inBackground) => {
    console.log('id', this.GatewayMacID, this.growAreaId);
    console.log('gateways in redux0-0-0-0-0-0-0-0-0-0-0-0-', this.props.bleDevices);
    /*
    ================================================================
      Uncomment to use analytics and realtime database of firebase 
    ================================================================
    let checkForGatewayConnectionRef = this.getUniqueIDForReference() + 'checkForGatewayConnection'
    console.log("checkForGatewayConnectionRef with UserName:=====>>",checkForGatewayConnectionRef);
    database()
      .ref(checkForGatewayConnectionRef)
        .set({
          description: 'Gateway found in redux..',
          method: 'checkForGatewayConnection',
        })
          .then(() => console.log('Data set for checkForGatewayConnection in devices screen'));
    */
    if (this.growAreaId) {
      console.log('in this.pros.----------------', this.props.bleDevices[this.GatewayMacID]);

      if (this.props.bleDevices[this.GatewayMacID]) {
        this.device = this.props.bleDevices[this.GatewayMacID];
        console.log("Gateway found in redux..", this.device);
        Promise.resolve(this.device.isConnected)
          .then((connected) => {
            if (connected) {
              console.log("Already connected with Gateway");
              if (!inBackground) this.askForDevices(this.device);
            }
            else {
              console.log("Scanning for gateway..")
              this.scanAndConnect(inBackground);
            }
          });
      }
      else {
        console.log("Scanning for gateway..")
        this.scanAndConnect(inBackground);
      }
    }
    else {
      console.log("GrowAreaUID not found.")
      console.log("Scanning for gateway..")
      this.scanAndConnect(inBackground);
    }
  }

  askForDevices = (device) => {
    console.log("Ask for devices");
    if (Platform.OS === 'ios') {
      deviceID = device.name.split(gateway_discovery_name_prefix).pop();
      console.log("Scanning Gateway Mac ID : ====>",deviceID);
    }
    else {
      deviceID = device.id
    }
    /*
    ================================================================
      Uncomment to use analytics and realtime database of firebase 
    ================================================================
    let askForDevicesRef = this.getUniqueIDForReference() + 'askForDevices'
    database()
      .ref(askForDevicesRef)
        .set({
          id: deviceID,
          name: device.name,
          description: 'Discovering services and characteristics...',
          method: 'askForDevices',
        })
        .then(() => console.log('Data set for askForDevices in devices screen'));
    analytics().logEvent('ask_for_devices', {
      description: 'Ask for devices',
      detail: 'Discovering services and characteristics...',
      id: deviceID,
      name: device.name
    }) 
    */
    console.log("Discovering services and characteristics...");
    console.log("Device Name:=====>>",device.name);
    console.log("Device ID:=====>>",deviceID);
    this.setState({
      bleMessage: 'Discovering services and characteristics...',
      waitingDeviceLoader: true
    })
    device.discoverAllServicesAndCharacteristics()
      .then((device) => {
        console.log("DeviceId:" + deviceID);
        this.deviceCharacteristics[device.id] = {};
        this.deviceCharacteristics[device.id]['mtu'] = device.mtu;
        device.services().then(services => {
          services = services.filter(this.isKnownService);
          console.log("Known Services size:" + services.length)
          if (services.length === 0) {
            /*
            ================================================================
              Uncomment to use analytics and realtime database of firebase 
            ================================================================
            let deviceServicesForAskForDevicesRef = this.getUniqueIDForReference() + 'deviceServicesForAskForDevices'
            console.log("deviceServicesForAskForDevicesRef with UserName:=====>>",deviceServicesForAskForDevicesRef);
            database()
              .ref(deviceServicesForAskForDevicesRef)
                .set({
                  description: 'No known services found in connected device.',
                  detail: 'Discover all services and characteristics',
                  method: 'askForDevices',
                  })
                    .then(() => console.log('Data set for deviceServicesForAskForDevices in devices screen'));
            analytics().logEvent('ask_for_devices', {
              description: 'No known services found in connected device.',
              detail: 'Discover all services and characteristics...',
            })
            */
            console.log("No known services found in connected device.");
            this.setState({
              bleMessage: 'Required services not found. Disconnecting from device..',
              waitingDeviceLoader: false
            })
            device.cancelConnection();
          }
          else {
            /*
            ================================================================
              Uncomment to use analytics and realtime database of firebase 
            ================================================================
            let discoverServicesForAskForDevicesRef = this.getUniqueIDForReference() + 'discoverServicesForAskForDevicesRef'
            console.log("discoverServicesForAskForDevicesRef with UserName:=====>>",discoverServicesForAskForDevicesRef);
            database()
              .ref(discoverServicesForAskForDevicesRef)
                .set({
                  description: 'Services discovered..',
                    detail: 'Discover all services and characteristics',
                    method: 'askForDevices',
                  })
                    .then(() => console.log('Data set for discoverServicesForConnectCharsAndServices in devices screen'));
            analytics().logEvent('ask_for_devices', {
              description: 'Services discovered..',
              detail: 'Discover all services and characteristics...',
            })
            */
            this.setState({
              bleMessage: 'Services discovered..',
              waitingDeviceLoader: true
            })
          }
          services.forEach((service, i) => {
            service.characteristics().then(characteristics => {
              /*
              ================================================================
                Uncomment to use analytics and realtime database of firebase 
              ================================================================
              let serviceIDForAskForDevicesRef = this.getUniqueIDForReference() + 'serviceIDForAskForDevices'
              console.log("serviceIDForAskForDevicesRef with UserName:=====>>",serviceIDForAskForDevicesRef);
              database()
                .ref(serviceIDForAskForDevicesRef)
                  .set({
                    description: 'Service UUID',
                    detail: 'Discover all services and characteristics',
                    method: 'askForDevices',
                    id: service.uuid,
                  })
                    .then(() => console.log('Data set for serviceIDForAskForDevices in devices screen'));

              analytics().logEvent('ask_for_devices', {
                description: 'Service UUID',
                id: service.uuid,
                number: '1424',
              })
              */
              console.log("Service UUID:" + service.uuid);
              console.log("Initial characteristics size:" + characteristics.length);
              characteristics = characteristics.filter((characteristic) => {

                characteristicPrefix = this.isKnownCharacteristic(characteristic);
                if (characteristicPrefix) {
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let characteristicsIDForAskForDevicesRef = this.getUniqueIDForReference() + 'characteristicsIDForAskForDevicesRef'
                  console.log("characteristicsIDForAskForDevicesRef with UserName:=====>>",characteristicsIDForAskForDevicesRef);
                  database()
                    .ref(characteristicsIDForAskForDevicesRef)
                      .set({
                        description: 'Characteristics UUID',
                        detail: 'Discover all services and characteristics',
                        method: 'askForDevices',
                        id: characteristic.uuid,
                      })
                        .then(() => console.log('Data set for characteristicsIDForAskForDevices in devices screen'));
                  analytics().logEvent('ask_for_devices', {
                    description: 'Characteristics UUID',
                    id: characteristic.uuid,
                    number: '1435',
                  })
                  */
                  console.log("Characteristics UUID:" + characteristic.uuid);
                  this.deviceCharacteristics[device.id][characteristicPrefix] = characteristic;
                  return true;
                }
              });
              console.log("After filtering characteristics size:" + characteristics.length);

              if (i === services.length - 1) {
                console.log("deviceCharacteristics List:", JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])));
                /*
                ================================================================
                  Uncomment to use realtime database of firebase 
                ================================================================
                let deviceCharacteristicsListForAskForDevicesRef = this.getUniqueIDForReference() + 'deviceCharacteristicsListForAskForDevicesRef'
                console.log("deviceCharacteristicsListForAskForDevicesRef with UserName:=====>>",deviceCharacteristicsListForAskForDevicesRef);
                database()
                  .ref(deviceCharacteristicsListForAskForDevicesRef)
                    .set({
                      description: 'Device Characteristics List',
                      id: JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])),
                      method: 'askForDevices',
                    })
                      .then(() => console.log('Data set for deviceCharacteristicsListForAskForDevices in devices screen'));
                */
                const dialog = Object.values(this.deviceCharacteristics[device.id]).find(
                  characteristic => characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse
                )
                if (!dialog) {
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let noWritableCharacteristicsForAskForDevicesRef = this.getUniqueIDForReference() + 'noWritableCharacteristicsForAskForDevices'
                  console.log("noWritableCharacteristicsForAskForDevicesRef with UserName:=====>>",noWritableCharacteristicsForAskForDevicesRef);
                  database()
                    .ref(noWritableCharacteristicsForAskForDevicesRef)
                      .set({
                        description: 'Required characteristics not found. Disconnecting from sensor..',
                        name: 'No writable characteristic',
                        method: 'askForDevices',
                      })
                        .then(() => console.log('Data set for noWritableCharacteristicsForAskForDevices in devices screen'));
                  analytics().logEvent('ask_for_devices', {
                    description: 'No writable characteristic',
                    number: '1452',
                  })
                  */
                  console.log("No writable characteristic");
                  this.setState({
                    bleMessage: 'Required characteristics not found. Disconnecting from sensor..',
                    waitingDeviceLoader: false
                  })
                  device.cancelConnection();
                }
                else {
                  /*
                  ================================================================
                    Uncomment to use analytics and realtime database of firebase 
                  ================================================================
                  let writableCharacteristicsForAskForDevicesRef = this.getUniqueIDForReference() + 'writableCharacteristicsForAskForDevices'
                  console.log("writableCharacteristicsForAskForDevicesRef with UserName:=====>>",writableCharacteristicsForAskForDevicesRef);
                  database()
                    .ref(writableCharacteristicsForAskForDevicesRef)
                      .set({
                        description: 'Characteristics discovered..',
                        name: 'Opening registration modal..',
                        method: 'askForDevices',
                      })
                        .then(() => console.log('Data set for writableCharacteristicsForAskForDevices in devices screen'));

                  analytics().logEvent('ask_for_devices', {
                    description: 'Characteristics discovered..',
                    detail: 'Opening registration modal..', 
                    number: '1465',
                  })
                  */
                  this.setState({
                    bleMessage: 'Characteristics discovered..',
                    waitingDeviceLoader: true
                  })
                  console.log("Opening registration modal..")

                  var deviceProvisionCharFound = false;
                  var deviceDiscoverCharFound = false;
                  var deviceProvisionCallbackCharFound =false;
                  Object.keys(this.deviceCharacteristics[device.id]).every((characteristicPrefix) => {
                    console.log(characteristicPrefix, Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_DEVICE_DISCOVER_COMMAND_UUID);
                    console.log((characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_DEVICE_DISCOVER_COMMAND_UUID));
                    if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_DEVICE_DISCOVER_COMMAND_UUID) {
                       this.deviceDiscoverChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                       deviceDiscoverCharFound = true;
                     }
                    if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_DEVICE_DISCOVER_PROVISION_UUID) {
                      this.deviceProvisionChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                      deviceProvisionCharFound = true;
                    }
                    if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_DEVICE_PROVISION_CALLBACK_UUID) {
                      this.deviceProvisionCallbackChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                      deviceProvisionCallbackCharFound = true;

                    }
                    if (characteristicPrefix === Constant.KNOWN_BLE_CHARACTERISTICS.CHAR_GATEWAY_CONNECTIVITY) {
                       this.deviceNotificationChar = this.deviceCharacteristics[device.id][characteristicPrefix];
                       console.log('------------id----', this.deviceNotificationChar.id);

                       this.deviceConectivityCharFound = true;
                    }
                      return !(deviceDiscoverCharFound && deviceProvisionCharFound && deviceProvisionCallbackCharFound)

                    });
                    if (deviceDiscoverCharFound && deviceProvisionCharFound && deviceProvisionCallbackCharFound && this.deviceConectivityCharFound) {
                       console.log('sending to the notify', this.deviceNotificationChar.id);
                       this.handleConnectivityNotifications(this.deviceNotificationChar);
                       this.handleDeviceDiscoveryNotifications(this.deviceProvisionChar);
                       this.sendDiscoveryRequest(this.deviceDiscoverChar, device);
                       /*
                       ================================================================
                         Uncomment to use realtime database of firebase 
                       ================================================================
                        let deviceCharacteristicsFoundForAskForDevicesRef = this.getUniqueIDForReference() + 'deviceCharacteristicsFoundForAskForDevices'
                        console.log("deviceCharacteristicsFoundForAskForDevicesRef with UserName:=====>>",deviceCharacteristicsFoundForAskForDevicesRef);
                        database()
                          .ref(deviceCharacteristicsFoundForAskForDevicesRef)
                            .set({
                              description: 'sending to the notify',
                              method: 'askForDevices',
                            })
                              .then(() => console.log('Data set for deviceCharacteristicsFoundForAskForDevices in devices screen'));\
                        */
                    }
                  else {
                    alert("One of the required characteristic not found in connected gateway. Disconnecting..");
                    /*
                    ================================================================
                      Uncomment to use analytics and realtime database of firebase 
                    ================================================================
                    let deviceCharacteristicsNotFoundForAskForDevicesRef = this.getUniqueIDForReference() + 'deviceCharacteristicsNotFoundForAskForDevicesRef'
                    console.log("deviceCharacteristicsNotFoundForAskForDevicesRef with UserName:=====>>",deviceCharacteristicsNotFoundForAskForDevicesRef);
                    database()
                      .ref(deviceCharacteristicsNotFoundForAskForDevicesRef)
                          .set({
                            description: 'One of the required characteristic not found in connected gateway. Disconnecting..',
                            method: 'askForDevices',
                          })
                            .then(() => console.log('Data set for deviceCharacteristicsNotFoundForAskForDevicesRef in devices screen'));
                    */
                  }
                }
              }
            })
          })
        })
      })
      .catch((error) => {
        if (error.errorCode === 205) {
          console.log("ErrorMessage:" + error.message);
          /*
          ================================================================
            Uncomment to use analytics and realtime database of firebase 
          ================================================================
          let errorForAskForDevicesRef = this.getUniqueIDForReference() + 'errorForAskForDevicesRef'
          console.log("errorForAskForDevicesRef with UserName:=====>>",errorForAskForDevicesRef);
          database()
            .ref(errorForAskForDevicesRef)
              .set({
                description: 'Unable to connect device......',
                errorMessage: error.message,
                errorCode: error.errorCode,
                method: 'askForDevices',
              })
                .then(() => console.log('Data set for errorForAskForDevicesRef in devices screen'));
          analytics().logEvent('ask_for_devices', {
            description: 'ErrorMessage',
            detail: error.message, 
            number: '1522',
          })
          */
          this.props.onRemoveDevice(device.id);
          setTimeout(() => {
            this.checkForGatewayConnection();
          }, 1000);
        }
        else {
          this.setState({
            bleMessage: 'Error: Unable to connect to Gateway. Please try adding sensor again.',
            waitingDeviceLoader: false
          })
          /*
          ================================================================
            Uncomment to use analytics and realtime database of firebase 
          ================================================================
          let errorToConnectForAskForDevicesRef = this.getUniqueIDForReference() + 'errorToConnectForAskForDevicesRef'
          console.log("errorToConnectForAskForDevicesRef with UserName:=====>>",errorToConnectForAskForDevicesRef);
          database()
            .ref(errorToConnectForAskForDevicesRef)
              .set({
                description: 'Sensor is already disconnected.',
                errorMessage: error.message,
                errorCode: error.errorCode,
                method: 'askForDevices',
              })
                .then(() => console.log('Data set for errorToConnectForAskForDevices in devices screen'));

          analytics().logEvent('ask_for_devices', {
            description: 'Sensor is already disconnected.',
            detail: error.message, 
            number: '1537',
          })
          */
          console.log("Error: " + error.message)
          console.log("ErrorCode:" + error.errorCode)
          device.cancelConnection().catch(error => {
            console.log("Sensor is already disconnected." + error.message);
          });
        }
      })

  }

  sendDiscoveryRequest = (characteristic, device) => {
    console.log("Sending discovery request..");
    /*
    ================================================================
      Uncomment to use analytics and realtime database of firebase 
    ================================================================
    let sendDiscoveryRequestRef = this.getUniqueIDForReference() + 'sendDiscoveryRequest'
    console.log("sendDiscoveryRequestRef with UserName:=====>>",sendDiscoveryRequestRef);
    database()
      .ref(sendDiscoveryRequestRef)
          .set({
              description: 'Sending discovery request..',
              method: 'sendDiscoveryRequest',
              name: device.name,
              id: device.id,
          })
            .then(() => console.log('Data set for sendDiscoveryRequest in devices screen'));
    analytics().logEvent('send_discovery_request', {
      description: 'Sending discovery request..',
      number: '1553',
      name: device.name,
      id: device.id,
    })
    */
    let payload = { discoverDevices: 1 }
    if (!bleDebug) {
      this.setState({
        bleMessage: "Sending discovery request..",
        discoveredDevices: {},
        waitingDeviceLoader: true
      });
    }
    console.log("Device name and id:=====>>",device.name,device.id);
    if (Platform.OS === 'ios') {
      deviceID = device.name.split(gateway_discovery_name_prefix).pop();
      console.log("Gateway Mac ID : ====>",deviceID);
    }
    else {
      deviceID = device.id
    }
    this.writeCharacteristics(characteristic, payload, (this.deviceCharacteristics[device.id].mtu - 3), 'sendStartDiscoverDevice')
    this.provisionRequestSent = false;
  }

  handleDeviceDiscoveryNotifications = (deviceProvisionChar) => {
    /*
    ================================================================
      Uncomment to use analytics and realtime database of firebase 
    ================================================================
    let handleDeviceDiscoveryNotificationsRef = this.getUniqueIDForReference() + 'handleDeviceDiscoveryNotifications'
    console.log("handleDeviceDiscoveryNotificationsRef with UserName:=====>>",handleDeviceDiscoveryNotificationsRef);
    database()
      .ref(handleDeviceDiscoveryNotificationsRef)
          .set({
              description: 'Subscribing to provision characteristic..',
              method: 'handleDeviceDiscoveryNotifications',
          })
            .then(() => console.log('Data set for handleDeviceDiscoveryNotifications in devices screen'));
    analytics().logEvent('handle_Device_Discovery_Notifications', {
      description: 'Subscribing to provision characteristic..',
      number: '1580',
    })
    */
    console.log("Subscribing to provision characteristic..", deviceProvisionChar);
    let discoveryResponse = {};
    let validPayload = '';

    this.discoverCharSubscription = deviceProvisionChar.monitor((error, characteristic) => {
      if (error) {
        /*
        ================================================================
          Uncomment to use analytics and realtime database of firebase 
        ================================================================
        let errorForhandleDeviceDiscoveryNotificationsRef = this.getUniqueIDForReference() + 'errorForhandleDeviceDiscoveryNotifications'
        console.log("errorForhandleDeviceDiscoveryNotificationsRef with UserName:=====>>",errorForhandleDeviceDiscoveryNotificationsRef);
        database()
          .ref(errorForhandleDeviceDiscoveryNotificationsRef)
            .set({
              description: 'Error:',
              errorMessage: error.message,
              errorCode: error.errorCode,
              method: 'handleDeviceDiscoveryNotifications',
            })
              .then(() => console.log('Data set for errorForhandleDeviceDiscoveryNotifications in devices screen'));
        analytics().logEvent('handle_Device_Discovery_Notifications', {
          description: 'Error',
          detail: error.message,
          number: '1580',
        })
        */
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverDeviceNotificationSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverDeviceProvisionCallbackNotificationSubscription');
        } else {
          this.setState({ errorCode: 1 });
          if (this.state.deviceDiscoveryModalVisible) {
            this.showDeviceDiscoveryModal(false, false, false, false);
          } else if (this.state.deviceRegistrationModalVisible) {
            this.setState({ deviceRegistrationModalVisible: false, isRegistrationProcessCompleted: true, callbackRegistredDevices: 0 })
          }
          Alert.alert('Provisioning Sensors Failed.', 'Please try again.');
        }
        this.provisionRequestSent = true;
      }
      else {
        console.log('deviceNotificationChar', this.deviceNotificationChar.id);
        let message = Base64.atob(characteristic.value);
        console.log("DeviceDiscoveryMessage:" + message);
        if (bleDebug) {
          let eui64 = guid();
          let payload = { eui64: eui64, deviceType: message, decision: false, deviceName: '' }
          discoveryResponse[eui64] = payload;
          this.setState({ discoveredDevices: discoveryResponse, waitingDeviceLoader: false });
        }
        else {
          if (message === Constant.BLE_PAYLOAD_PREFIX){
            console.log('Begin Payload received...............');
            validPayload = '';
           }
          else if (message === Constant.BLE_PAYLOAD_SUFFIX) {
            console.log('End Payload received...............');
                if (isJsonString(validPayload)) {
                   // let payload = {"eui64":"0x000B57FFFEF199AA","deviceType":"sentimate"}
                   let payload = JSON.parse(validPayload);
                    validPayload = '';
              if (payload.hasOwnProperty('eui64') && payload.hasOwnProperty('deviceType')) {
                console.log('payload.deviceType', payload.deviceType, payload);

                  payload.decision = false;
                  payload.deviceName = '';
                  payload.deviceType = payload.deviceType;
                  payload.description = 'EFR32';
                  payload.gatewayId = this.growAreaId;
                  discoveryResponse[payload.eui64] = payload;
                  console.log('device--=', discoveryResponse);
                  this.setState({
                    discoveredDevices: discoveryResponse,
                    showCancelButton: false,
                  });
                  console.log("setting state after payload received successfully");
              }
              else alert("Invalid device object from Gateway: Required keys are missing");
            }
            else {
              console.log("Invalid JSON:" + validPayload);
              validPayload = '';
            }
          }
          else {
            validPayload = validPayload + message;
            console.log("ValidPayload = ",validPayload);
          }
        }
      }
    }, 'myDeviceTransaction');
  }


  handleProvisionCallbackNotifications = (deviceProvisionCallbackChar) => {
    /*
    ================================================================
      Uncomment to use analytics and realtime database of firebase 
    ================================================================
    let handleProvisionCallbackNotificationsRef = this.getUniqueIDForReference() + 'handleProvisionCallbackNotifications'
    console.log("handleProvisionCallbackNotifications with UserName:=====>>",handleProvisionCallbackNotificationsRef);
    database()
      .ref(handleProvisionCallbackNotificationsRef)
          .set({
              description: 'Subscribing to provision characteristic..',
              method: 'handleProvisionCallbackNotifications',
          })
            .then(() => console.log('Data set for handleProvisionCallbackNotifications in devices screen'));
    analytics().logEvent('handle_Provision_Callback_Notifications', {
      description: 'Subscribing to provision callback characteristic..',
      number: '1664',
    })
    */
    console.log("Subscribing to provision callback characteristic..");
    let provisionCallbackResponse = {};
    let validPayload = bleDebug ? [] : '';
    this.provisionCallbackCharSubscription = deviceProvisionCallbackChar.monitor((error, characteristic) => {
      console.log('hello msg');

      if (error) {
        /*
        ================================================================
          Uncomment to use analytics and realtime database of firebase 
        ================================================================
        let errorForhandleProvisionCallbackNotificationsRef = this.getUniqueIDForReference() + 'errorForhandleProvisionCallbackNotifications'
        console.log("errorForhandleProvisionCallbackNotificationsRef with UserName:=====>>",errorForhandleProvisionCallbackNotificationsRef);
        database()
          .ref(errorForhandleProvisionCallbackNotificationsRef)
            .set({
              description: 'Error:',
              errorMessage: error.message,
              errorCode: error.errorCode,
              method: 'handleProvisionCallbackNotifications',
            })
              .then(() => console.log('Data set for errorForhandleProvisionCallbackNotifications in devices screen'));
        analytics().logEvent('handle_Provision_Callback_Notifications', {
          description: 'Error',
          detail: error.message,
          number: '1676',
        })
        */
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverDeviceProvisionCallbackNotificationSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nDiscoverDeviceProvisionCallbackNotificationSubscription');
        } else {
          this.setState({ errorCode: 1 });
          if (this.state.deviceDiscoveryModalVisible) {
            this.showDeviceDiscoveryModal(false, false, false, false);
          } else if (this.state.deviceRegistrationModalVisible) {
            this.setState({ deviceRegistrationModalVisible: false, isRegistrationProcessCompleted: true, callbackRegistredDevices: 0 })
          }
          /*
          ================================================================
            Uncomment to use analytics and realtime database of firebase 
          ================================================================
          let errorToProvisionForhandleProvisionCallbackNotificationsRef = this.getUniqueIDForReference() + 'errorToProvisionForhandleProvisionCallbackNotifications'
          console.log("errorToProvisionForhandleProvisionCallbackNotificationsRef with UserName:=====>>",errorToProvisionForhandleProvisionCallbackNotificationsRef);
          database()
            .ref(errorToProvisionForhandleProvisionCallbackNotificationsRef)
              .set({
                description: 'Provisioning Devices Failed.',
                errorMessage: error.message,
                errorCode: error.errorCode,
                method: 'handleProvisionCallbackNotifications',
              })
              .then(() => console.log('Data set for errorToProvisionForhandleProvisionCallbackNotifications in devices screen'));
          analytics().logEvent('handle_Provision_Callback_Notifications', {
            description: 'Provisioning Devices Failed.',
            number: '1690',
          })
          */
          Alert.alert('Provisioning Devices Failed.', 'Please try again.');
        }
      }
      else {
       let message = Base64.atob(characteristic.value);
       /*
       ================================================================
         Uncomment to use analytics of firebase 
       ================================================================
       analytics().logEvent('handle_Provision_Callback_Notifications', {
        description: 'DeviceProvisionCallbackMessage',
        detail: message,
        number: '1699',
      })
      */
        console.log("DeviceProvisionCallbackMessage:" + message);
        console.log("DeviceProvisionCallbackPayload:" + bleDebug ? JSON.stringify(validPayload) : validPayload)
        if (message === Constant.BLE_PAYLOAD_PREFIX) {
          validPayload = bleDebug ? {} : '';
        }
        else if (message === Constant.BLE_PAYLOAD_SUFFIX) {
          if (bleDebug) validPayload = JSON.stringify(validPayload);
          if (isJsonString(validPayload)) {
            let device = JSON.parse(validPayload);
          if (device.hasOwnProperty('sensorId') && !device.hasOwnProperty('eui64'))
               device.eui64 = device.sensorId.split('-')[1];
            if (device.hasOwnProperty('eui64') && device.hasOwnProperty('sensorId') && this.growAreaId) {
              let payload = {};
              console.log('devicePayload:' + JSON.stringify(device));
              console.log('DiscoveredDevicesKey:' + JSON.stringify(Object.keys(this.state.discoveredDevices)));
              if (this.state.discoveredDevices.hasOwnProperty(device.eui64)) {
                let deviceObj = this.state.discoveredDevices[device.eui64];
                console.log('device_type', deviceObj.deviceType);
                console.log('deviceObj.result------------', device.result);
                if (deviceObj.hasOwnProperty('deviceName') && deviceObj.hasOwnProperty('deviceType') ) {

                  payload.deviceUId = device.sensorId;
                  // payload.deviceUId = device.id;
                  payload.device_name = deviceObj.deviceName;
                  payload.device_type = deviceObj.deviceType;
                  payload.eui64 = deviceObj.eui64;
                  payload.sensorId= device.sensorId;
                  payload.gatewayId = this.growAreaId;
                  provisionCallbackResponse = payload;
                }
                else {
                  alert('Wrong sensorType found.');
                }
              } else {
                if (this.props.deviceTypes)
                  console.log("Invalid eui64 found.")
                else console.log('sensorTypes not found.')
              }
            } else {
              console.log('eui64 or sensorId or gateway id not found.')
            };
            console.log(JSON.stringify(provisionCallbackResponse), '--------------------', device.result);
            if (Object.keys(provisionCallbackResponse).length > 0 && device.result === Constant.BLE_RESPONSE_STATUS) {
                console.log('this.count================', this.props.registredDevice, this.state.callbackRegistredDevices);
                if (this.state.callbackRegistredDevices === 0 && this.props.registredDevice === 0) {
                     this.setState({ callbackRegistredDevices: 1 })
                }
             this.setState({ callbackRegistredDevices: this.props.registredDevice + this.state.callbackRegistredDevices });
             sensors = this.state.sensors;
             sensors.push(provisionCallbackResponse);
             console.log("--------------------------------------",sensors);
             AsyncStorage.setItem('sensorList',JSON.stringify(sensors)).then((token) => {
                                 this.setState({sensors});
                                 this.setState({ deviceRegistrationModalVisible:false,isRegistrationProcessCompleted: true, errorCode: 1 })
                                 this.onTimeRegistredDevices = 0;
                                 this._onRefresh();
                                 }).catch((error) => {
                                         console.log('error in saving name', error);
                                  })
              this.callGetUserAPI();
            }
            validPayload = '';
          }
          else {
            console.log("Invalid JSON:" + validPayload);
            validPayload = '';
          }
        }
        else {
          if (bleDebug) {

            validPayload = {
              eui64: message,
              deviceUid: guid()
            }
          }
          else validPayload = validPayload + message;
        }
      }
    }, 'myDeviceProvisionCallbackTransaction');
  }

  async callGetUserAPI() {
    
    let url = Urls.GET_USER + this.state.email;
    console.log("url for calling---"+url);
    try {
      const response = await fetch(url, { method: "GET", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } })
      if (response.ok) {
        const result = await response.json();
        console.log("Registered sensor response in json---" + JSON.stringify(result));
        AsyncStorage.setItem('sensorList', JSON.stringify(result['sensors']));
        this.setState({ sensors: result['sensors'] })
      }
      else
      {
        console.log("error in api response");
      }

    } catch (err) {
      console.log("error occured from calling get user API");
    }

  }


  scanAndConnect = (inBackground) => {
    if (this.props.bleManager) {
      if (!inBackground) {
        this.setState({
          waitingDeviceLoader: true,
          bleMessage: 'Searching for Available Gateway Over BLE'
        })
      }
      /*
      ================================================================
        Uncomment to use analytics and realtime database of firebase 
      ================================================================
      let scanAndConnectRef = this.getUniqueIDForReference() + 'scanAndConnect'
      console.log("scanAndConnectRef with UserName:=====>>",scanAndConnectRef);
      database()
        .ref(scanAndConnectRef)
          .set({
            description: 'Started device scan...',
            method: 'scanAndConnect',
          })
            .then(() => console.log('Data set for scanAndConnect in devices screen'));
      analytics().logEvent('scan_And_Connect', {
        description: 'Started device scan...',
        number: '1818',
      })
      */
      console.log("Started device scan...");
       this.timeOutValueProvision = setTimeout(() => {
                     this.setState({ deviceDiscoveryModalVisible: false, waitingDeviceLoader: false });
                     alert('Gateway is not available over BLE. Please try again');
        }, 20000)
      this.props.bleManager.startDeviceScan(null, null, (error, device) => {

        if (error) {
          clearTimeout(this.timeOutValueProvision);
          console.log('ErrorCode:' + error.errorCode);
          this.setState({ modalVisible: false });
          if (error.errorCode === 101) {
            //Device is not authorized to use BluetoothLE
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use bluetooth services.. please provide access.')
            }
            else {
              Promise.resolve(requestLocationPermission())
              Promise.resolve(requestLocationPermission())
                .then(sources => {
                  this.showDeviceDiscoveryModal(true, inBackground);
                  return;
                }).catch(error => {
                  if (!inBackground) {
                    this.setState({
                      bleMessage: 'Error: Unable to connect to Gateway. Please try adding Gateway again.',
                      waitingDeviceLoader: false
                    })
                  }
                  console.log("Scanning for gateway..")
                  this.scanAndConnect(inBackground);
                });
            }
          }
          else if (error.errorCode === 102) {
            //BluetoothLE is powered off
            if (Platform.OS === 'ios') {
              alert('Please enable the Bluetooth to get connected with the nearby devices.')
            }
          }
          else if (error.errorCode === 601) {
            //Location services are disabled
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please enable it.')
              if (!inBackground) {
                this.showDeviceDiscoveryModal(false);
              }
            }
            else {
              RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                .then(data => {
                  console.log(data);
                  if (!inBackground) this.showDeviceDiscoveryModal(true, inBackground);
                  return;
                }).catch(error => {
                  console.log(error);
                  if (!inBackground) this.showDeviceDiscoveryModal(true, inBackground);
                  return;
                });
            }
          }
          else {
            console.log(error.errorCode + ":" + error.message);
            if (!inBackground) {
              this.setState({
                bleMessage: 'Gateway scan failed.',
                waitingDeviceLoader: false
              })
            }
          }
          return;
        }
        if (device.name && device.id) {
          /*
          ================================================================
            Uncomment to use analytics and realtime database of firebase 
          ================================================================
          let deviceFoundForScanAndConnectRef = this.getUniqueIDForReference() + 'deviceFoundForscanAndConnect'
          console.log("deviceFoundForScanAndConnectRef with UserName:=====>>",deviceFoundForScanAndConnectRef);
          database()
            .ref(deviceFoundForScanAndConnectRef)
              .set({
                description: 'Found device name and id',
                method: 'scanAndConnect',
                id: device.id,
                name: device.name,
              })
                .then(() => console.log('Data set for deviceFoundForScanAndConnect in devices screen'));
          analytics().logEvent('scan_And_Connect', {
            description: 'Found device name and id',
            number: '1903',
            id: device.id,
            name: device.name,
          })
          */
          console.log("======>> Found device name and id <<=====",device.name,device.id);
          this.connectedBle = device;
          if (Platform.OS === 'ios') {
            deviceID = device.name.split(gateway_discovery_name_prefix).pop();
            console.log("Scanning Gateway Mac ID : ====>",deviceID);
          }
          else {
            deviceID = device.id
          }
          console.log("Gateway Name:" + device.name + "\nDeviceId:" + deviceID);
          console.log(this.growAreaUId + "=" + deviceID + "=");

            if (bleDebug) this.growAreaUId = deviceID;
            clearTimeout(this.timeOutValueProvision);
            this.props.bleManager.stopDeviceScan();
            this.props.onSignoutDisconnect(device)
            console.log("Connecting to Gateway");
            /*
            ================================================================
                      Uncomment to use analytics of firebase 
            ================================================================
            analytics().logEvent('scan_And_Connect', {
              description: 'Connecting to Gateway',
              number: '1923',
            })
            */
            this.GatewayMacID = deviceID;
            if(!this.growAreaId) this.growAreaId = "gateway-"+deviceID;
            this.bleDevice=device;
            if (!inBackground) {
              /*
              ================================================================
                       Uncomment to use analytics of firebase 
              ================================================================
              analytics().logEvent('scan_And_Connect', {
                description: 'Connecting to EFR32Gateway',
                number: '1934',
              })
              */
              this.setState({
                bleMessage: 'Connecting to EFR32Gateway',
                waitingDeviceLoader: true
              })
            }
            this.tryDeviceConnection(device, inBackground);
         // }
        }
      });
    }
    else {
      this.props.onSetBleManager(new BleManager());
      /*
      ================================================================
                  Uncomment to use analytics of firebase 
      ================================================================
      analytics().logEvent('scan_And_Connect', {
        description: 'Scanning for gateway..',
        number: '1950',
      })
      */
      console.log("Scanning for gateway..")
      this.scanAndConnect(inBackground);
    }
  }

scanAndConnectForDeleteSensor = (inBackground,payload,sensorId,eui64) => {
    this.props.uiStartLoading('Deleting Selected Sensor');
    if(this.props.bleManager)
    {
      if (!inBackground)
      {
              this.setState({
                deviceDiscoveryModalVisible : false,
                waitingDeviceLoader: false,
                bleMessage: 'Searching for ' + (this.growAreaName ? "'" + this.growAreaName + "'" : 'Grow house (gateway).')
              })
      }
      /*
      ================================================================
                Uncomment to use analytics of firebase 
      ================================================================
      analytics().logEvent('scan_And_Connect_For_Delete_Sensor', {
        description: 'Started device scan...',
        number: '1972',
      })
      */
      console.log("Started device scan...");
      this.props.bleManager.startDeviceScan(null, null, (error, device) => {

        if (error) {
            this.props.uiStopLoading();
            clearTimeout(this.timeOutValue);
          console.log('ErrorCode:' + error.errorCode);
          this.setState({ modalVisible: false,deviceDiscoveryModalVisible:false });
          if (error.errorCode === 101) {
            //Device is not authorized to use BluetoothLE
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use bluetooth services.. please provide access.')
            }
            else {
              Promise.resolve(requestLocationPermission())
                .then(sources => {
                  this.showDeviceDiscoveryModalForDeletionOfSensor(true, inBackground,sensorId,eui64);
                  return;
                }).catch(error => {
                  if (!inBackground) {
                    this.setState({
                      bleMessage: 'Error: Unable to connect to Gateway. Please try adding Gateway again.',
                      waitingDeviceLoader: false
                    })
                  }
                  this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
                });
            }
          }
          else if (error.errorCode === 102) {
            //BluetoothLE is powered off
            if (Platform.OS === 'ios') {
              alert('Please enable the Bluetooth to get connected with the nearby devices.')
            }
          }
          else if (error.errorCode === 601) {
            //Location services are disabled
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please enable it.')
              if (!inBackground) {
                this.showDeviceDiscoveryModal(false);
              }
            }
            else {
            alert(appName + ' app wants to use location services.. please enable it.');
              RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                .then(data => {
                console.log(data);
                  if (!inBackground) this.showDeviceDiscoveryModalForDeletionOfSensor(true, inBackground,sensorId,eui64);
                  return;
                }).catch(error => {
                   console.log(error);
                  if (!inBackground) this.showDeviceDiscoveryModalForDeletionOfSensor(true, inBackground,sensorId,eui64);
                  return;
                });
            }
          }
          else {
            console.log(error.errorCode + ":" + error.message);
            /*
            ================================================================
                      Uncomment to use analytics of firebase 
            ================================================================
            analytics().logEvent('scan_And_Connect_For_Delete_Sensor', {
              description: error.message,
              number: '2043',
            })
            */
            if (!inBackground) {
              this.setState({
                bleMessage: 'Gateway scan failed.',
                waitingDeviceLoader: false
              })
              this.props.uiStartLoading("Deleting Selected Sensor");
              this.factoryResetDevice(payload,sensorId);
            }
          }
          return;
        }

        if (device.name && device.id) {
          this.connectedBle = device;
          console.log("Gateway Name:" + device.name + "\nDeviceId:" + device.id);
         console.log('Gateway Selected.....',this.props.selectedGrowArea);
         /*
         ================================================================
                    Uncomment to use analytics of firebase 
         ================================================================
         analytics().logEvent('scan_And_Connect_For_Delete_Sensor', {
          description: 'Gateway Selected.....',
          number: '2063',
          id: device.id,
          name: device.name,
        })
        */
         if(this.props.selectedGrowArea)
         {
            if (device.name.indexOf(this.props.selectedGrowArea.macId) !== -1 || bleDebug) {
                if (bleDebug) this.growAreaUId = deviceID;

                clearTimeout(this.timeOutValue);
                this.props.bleManager.stopDeviceScan();
                this.props.onSignoutDisconnect(device)
                /*
                ================================================================
                        Uncomment to use analytics of firebase 
                ================================================================
                analytics().logEvent('scan_And_Connect_For_Delete_Sensor', {
                  description: 'Connecting to Gateway for deletion',
                  number: '2077',
                })
                */
                console.log("Connecting to Gateway for deletion");
                this.GatewayMacID = deviceID;
                if (!inBackground) {
                    this.setState({
                         waitingDeviceLoader: false
                    })
                }
               this.setState({modalVisible:false, deviceDiscoveryModalVisible : false,waitingDeviceLoader: false});
               this.tryDeviceConnectionForDeletion(payload,device,inBackground,sensorId,eui64);
            }
            else
            {
                this.props.uiStopLoading();
                this.props.bleManager.stopDeviceScan();
                alert('Mac Address of Gateway is mismatched');
            }
         }
         else
          {
            clearTimeout(this.timeOutValue);
            this.props.bleManager.stopDeviceScan();
            /*
            ================================================================
                      Uncomment to use analytics of firebase 
            ================================================================
            analytics().logEvent('scan_And_Connect_For_Delete_Sensor', {
              description: 'Connecting to Gateway for deletion',
              number: '2102',
            })
            */
            console.log("Connecting to Gateway for deletion");
            this.GatewayMacID = device.id;
            if (!inBackground) {
              this.setState({
                waitingDeviceLoader: false
              })
            }
              this.setState({modalVisible:false, deviceDiscoveryModalVisible : false,waitingDeviceLoader: false});
              this.tryDeviceConnectionForDeletion(payload,device,inBackground,sensorId,eui64);
          }
        }
      });


    }
    else {
      this.props.onSetBleManager(new BleManager());
      this.scanAndConnectForDeleteSensor(inBackground,payload,sensorId,eui64);
    }
  }
  getDeviceUID(uID){
    var deviceDisplayID = "";
    if (Platform.OS === 'ios') {
      deviceDisplayID = uID.slice(-12)
      var parts = deviceDisplayID.match(/.{1,2}/g);
      deviceDisplayID = parts.join(":");
      return deviceDisplayID;
    }
    else {
      return uID;
    }
  }
  /*
  ================================================================
        Uncomment to use realtime database of firebase 
  ================================================================
  getUniqueID(uniqueID) {
    var uniqueIDString = "";
    uniqueIDString = uniqueID.substring(0, uniqueID.indexOf("@"));
    uniqueIDString = uniqueIDString.replace(".","");
    this.setState({userName: uniqueIDString});
    return uniqueIDString;
  }
  getUniqueIDForReference() {
    var uniqueIDString = "";
    uniqueIDString = '/users/' + this.state.userName + '/';
    return uniqueIDString;
  }
  */
  scanAndConnectForSoftwareSensor = (inBackground) => {
    this.alreadyRegistredSensors = this.alreadyRegistredSensor(this.state.sensors);
    let discoveredSoftwareSensor = {};
    let discoveryResponse = {};
      if (this.props.bleManager) {
        if (!inBackground) {
          this.setState({
            waitingDeviceLoader: true,
            bleMessage: 'Searching for Available Sensors Over BLE....'
          })
        }
        /*
        ================================================================
                    Uncomment to use analytics of firebase 
        ================================================================
        analytics().logEvent('scanAndConnectForSoftwareSensor', {
          description: 'Started device scan for software sensor...',
          number: '2149',
        })
        */
        console.log("Started device scan for software sensor...");
         this.timeOutValueProvision = setTimeout(() => {
                       this.setState({ modalVisibleForSoftwareSensor: false, waitingDeviceLoader: false });
                       this.props.bleManager.stopDeviceScan();
                       alert('Sensor is not available over BLE. Please try again');
                       this.props.uiStopLoading();
          }, 20000)
        this.props.bleManager.startDeviceScan(null, null, (error, device) => {

          if (error) {
            clearTimeout(this.timeOutValueProvision);
            console.log('ErrorCode:' + error.errorCode);
            this.setState({ modalVisible: false });
            if (error.errorCode === 101) {
              //Device is not authorized to use BluetoothLE
              if (Platform.OS === 'ios') {
                alert(appName + ' app wants to use bluetooth services.. please provide access.')
              }
              else {
                Promise.resolve(requestLocationPermission())
                  .then(sources => {
                    this.showSoftwareSensorDiscoveryModal(true, inBackground,true,false);
                    return;
                  }).catch(error => {
                    if (!inBackground) {
                      this.setState({
                        bleMessage: 'Error: Unable to connect to Gateway. Please try adding Gateway again.',
                        waitingDeviceLoader: false
                      })
                    }
                    this.scanAndConnectForSoftwareSensor(inBackground);
                  });
              }
            }
            else if (error.errorCode === 102) {
              //BluetoothLE is powered off
              if (Platform.OS === 'ios') {
                alert('Please enable the Bluetooth to get connected with the nearby devices.')
              }
            }
            else if (error.errorCode === 601) {
              //Location services are disabled
              if (Platform.OS === 'ios') {
                alert(appName + ' app wants to use location services.. please enable it.')
                if (!inBackground) {
                  this.showSoftwareSensorDiscoveryModal(true, inBackground,true,false);
                }
              }
              else {
                RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                  .then(data => {
                    console.log(data);
                    if (!inBackground) this.showSoftwareSensorDiscoveryModal(true, inBackground,true,false);
                    return;
                  }).catch(error => {
                    console.log(error);
                    if (!inBackground) this.showSoftwareSensorDiscoveryModal(true, inBackground,true,false);
                    return;
                  });
              }
            }
            else {
              console.log(error.errorCode + ":" + error.message);
              if (!inBackground) {
                this.setState({
                  bleMessage: 'Gateway scan failed.',
                  waitingDeviceLoader: false
                })
              }
            }
            return;
          }
          console.log('already registered sensor mac id',this.alreadyRegistredSensors);
          console.log("Device details:=====>>",device.id,device.name);
          /*
          ================================================================
                      Uncomment to use analytics of firebase 
          ================================================================
          analytics().logEvent('device_details', {
            id: device.id,
            name: device.name,
            description: 'Device details for already registered sensor mac id',
          })
          */
          if (device.name && device.id && device.name.startsWith(software_sensor_discovery_name_prefix) && !(this.alreadyRegistredSensors.includes(device.id))) {
             clearTimeout(this.timeOutValueProvision);
             this.bleDevice=device;
              console.log('device found so stop interval and scanning');
              /*
              ================================================================
                      Uncomment to use analytics of firebase 
              ================================================================
              analytics().logEvent('device_found', {
                id: device.id,
                name: device.name,
                description: 'device found so stop interval and scanning',
              })
              */
              this.props.bleManager.stopDeviceScan();
              console.log("Scanning device name :", device.name);
              let deviceID = ""
              var deviceDisplayID = ""
              if (Platform.OS === 'ios') {
                deviceID = device.id
                deviceDisplayID = deviceID.slice(-12)
                var parts = deviceDisplayID.match(/.{1,2}/g);
                deviceDisplayID = parts.join(":");
                this.displayDeviceID = deviceDisplayID
                console.log("Scanning Sensor Mac ID : ====>",deviceID);
                console.log("Display Sensor Mac ID : ====>",deviceDisplayID);
              }
              else {
                deviceID = device.id
                deviceDisplayID = device.id
                this.displayDeviceID = deviceDisplayID
              }

                let payload = {};
                  payload.decision = false;
                  payload.device_name = '';
                  payload.device_type = Constant.SENSOR_TYPE;
                  payload.description = 'EFR32';
                  payload.gatewayId = this.state.gateways[0].gatewayId;
                  payload.deviceUId = deviceID;
                  payload.eui64 = deviceDisplayID;
                  payload.sensorId = '';
                  payload.id = deviceID;
                  discoveryResponse[deviceID] = payload;
                  console.log('device--==', discoveryResponse);
                  this.setState({discoveredSoftwareSensor:discoveryResponse})

          }

        });
      }
      else {
        this.props.onSetBleManager(new BleManager());
        this.scanAndConnectForSoftwareSensor(inBackground);
      }
    }
  tryDeviceConnectionForDeletion = (payload,device, inBackground,sensorId,eui64) => {

            device.connect()
              .then((device) => {

                console.log("Gateway connected for Deletion");
                this.device = device;
                this.props.onAddDevice(device);
                console.log("Adding device for deletion of sensor..");
                console.log('----------start fetching------------------');
                console.log("Already connected with Gateway");
                console.log("Connected with Gateway and now sending payload to AWS");
                if (!inBackground) this.deleteSensorAPI(payload,this.device,sensorId,eui64);
                return device;
              })
              .catch((error) => {
                this.props.uiStopLoading();
                if (error.errorCode === 203) {
                  this.device = device;
                  this.props.onAddDevice(device);
                  console.log("Adding device..");
                 if (!inBackground) this.deleteSensorAPI(payload,this.device,sensorId,eui64);
                }
                else if (error.errorCode === 201) {
                  console.log("Resetting BLE Manager");
                  if (this.props.manager) {
                    console.log("111");
                    this.props.manager.destroy();
                  }
                  this.props.onSetBleManager(new BleManager());
                  this.tryDeviceConnectionForDeletion(payload,device, inBackground,sensorId,eui64);
                }
                else {
                  console.log("Error:" + error.message)
                  this.setState({
                    bleMessage: 'Error: Unable to connect to Gateway.',
                    waitingDeviceLoader: false
                  })
                  device.cancelConnection().catch(error => {
                    console.log("Device is already disconnected." + error.message);
                    this.setState({
                      bleMessage: 'Error: Unable to connect to Gateway. Please try adding Sensor again.',
                      waitingDeviceLoader: false
                    })
                    this.props.uiStartLoading("Deleting Selected Sensor");
                     this.factoryResetDevice(payload,sensorId);
                  });
                }
                return null;
              })

  }

  tryDeviceConnection = (device, inBackground) => {
    /*
    ================================================================
          Uncomment to use realtime database of firebase 
    ================================================================
    let tryDeviceConnectionRef = this.getUniqueIDForReference() + 'tryDeviceConnection'
    console.log("tryDeviceConnectionRef with UserName:=====>>",tryDeviceConnectionRef);
    database()
      .ref(tryDeviceConnectionRef)
        .set({
          id: device.id,
          name: device.name,
          description: 'Discovering services and characteristics...',
          method: 'tryDeviceConnection',
        })
        .then(() => console.log('Data set for tryDeviceConnection in devices screen'));
    */
    device.connect()
      .then((device) => {
        console.log("Gateway connected");
        this.device = device;
        this.props.onAddDevice(device);
        console.log("Adding device..");
        console.log('----------start fetching------------------');
        if (!inBackground) this.askForDevices(device);
        console.log('----------finish fetching------------------');
        return device;
      })
      .catch((error) => {
        if (error.errorCode === 203) {
          this.device = device;
          this.props.onAddDevice(device);
          console.log("Adding device..");
          if (!inBackground) this.askForDevices(device);
          else this.props.bleManager.stopDeviceScan();
        }
        else if (error.errorCode === 201) {
          console.log("Resetting BLE Manager");
          if (this.props.manager) {
            console.log("111");
            this.props.manager.destroy();
          }
          this.props.onSetBleManager(new BleManager());
          this.tryDeviceConnection(device, inBackground);
        }
        else {
          console.log("Error:" + error.message)
          this.setState({
            bleMessage: 'Error: Unable to connect to Gateway. Please try adding Sensor again.',
            waitingDeviceLoader: false
          })
          device.cancelConnection().catch(error => {
            console.log("Device is already disconnected." + error.message);
            this.setState({
              bleMessage: 'Error: Unable to connect to Gateway. Please try adding Sensor again.',
              waitingDeviceLoader: false
            })
          });
        }
        return null;
      })
  }

  isKnownService(service) {
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

  writeCharacteristics(characteristic, payload, chunkSize, info) {
    if (typeof payload === 'object') {
      payload = JSON.stringify(payload);
    }
    console.log("Writing " + payload.length + " bytes to " + characteristic.uuid + " for " + info);
    console.log(Constant.BLE_PAYLOAD_PREFIX);
    characteristic.writeWithResponse(Base64.btoa(Constant.BLE_PAYLOAD_PREFIX), info).catch(error => {
      console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
    });
    for (var k = 0; k < (payload.length / chunkSize); k++) {
      var str = payload.substring(k * chunkSize, ((k + 1) * chunkSize));
      console.log(str);
      characteristic.writeWithResponse(Base64.btoa(str), info + k).catch(error => {
        console.log("WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
      });
    }
    console.log(Constant.BLE_PAYLOAD_SUFFIX);
    characteristic.writeWithResponse(Base64.btoa(Constant.BLE_PAYLOAD_SUFFIX), info + '$').catch(error => {
      console.log("-=-==-WriteError:\nCode:" + error.code + "\nMessage:" + error.message);
    });
    if (info === 'sendStartDiscoverDevice') {
      this.setState({
        bleMessage: "Waiting for Sensors...",
        waitingDeviceLoader: true
      });
      setTimeout(() => {
        console.log('after 3.5 min flag', this.state.showCancelButton, this.state.deviceDiscoveryModalVisible, '---->', this.state);

        if (this.state.showCancelButton && this.state.deviceDiscoveryModalVisible) {
          this.showDeviceDiscoveryModal(false, false, false, false);
          this.setState({ errorCode: 1 });
          alert('No Sensors found.')
        }
      }, deviceDiscoveryTimeout)
    }
  }

  closeRegistrationModal() {
    if (this.onTimeRegistredDevices !== 0) {
      if (this.onTimeRegistredDevices === this.state.callbackRegistredDevices) {
        let numberOfDevices = this.onTimeRegistredDevices;
        this.onTimeRegistredDevices = 0;
        setTimeout(() => {
          this.setState({ deviceRegistrationModalVisible: false, isRegistrationProcessCompleted: true, callbackRegistredDevices: 0, errorCode: 1 })
          console.log('in fun ', this.state.callbackRegistredDevices, this.state.deviceRegistrationModalVisible);
          this._onRefresh()
        }, 5000);


      }
    }
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
                    title: 'Previous',
                    color: '#fff',
                    showTitle: true,
                   // icon:require('../../assets/images/back.png')
                  },
                  title: {
                    // text: "Previous",
                    color: '#fff',
                    visible: Platform.OS === 'android',
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

onDashboardLoad(payload) {
    console.log("Do something when the dashboard is fully loaded.");
}

onError(payload) {
    console.log("Do something when the dashboard fails loading");
}

gatewayDetailsContainer =()=>{
  return(
  <View  id="priyank" style={{ alignItems: "center", margin: 10 }}>
    <Text style={{ margin: 4, fontWeight: "bold" }}>Welcome</Text>
  </View>
  );
}

  handleConnectivityNotifications(connectivityChar) {
    console.log('---------id', connectivityChar.id, this.deviceConectivityCharFound);
    if (this.deviceConectivityCharFound) {
      this.connectivitySubscription = connectivityChar.monitor((error, response) => {
        if (error) {
          if (this.state.errorCode === 1) {
            console.log('error453544', error, this.state.errorCode);
          } else {
            this.setState({ errorCode: 1 });
            if (this.state.deviceDiscoveryModalVisible) {
              this.showDeviceDiscoveryModal(false, false, false, false);
            } else if (this.state.deviceRegistrationModalVisible) {
              console.log('log0-0-0-0-0--');

              this.setState({ deviceRegistrationModalVisible: false, isRegistrationProcessCompleted: true, callbackRegistredDevices: 0 })
            }
            Alert.alert('Provisioning Sensors Failed.', 'Please try again.');
          }
          this.connectivitySubscription.remove();
        } else {
          console.log('\n\n\n response.value', Base64.atob(response.value));
          this.setState({ errorCode: 1 });
          var value = Base64.atob(response.value);
          if (value === '\u0000') {
            this.showDeviceDiscoveryModal(false, false, false, false)
            this.deviceConectivityCharFound = false;
            this.connectivitySubscription.remove();
          } else {
            this.deviceConectivityCharFound = false;
            this.connectivitySubscription.remove();
            return {}
          }
        }
      })
      this.deviceConectivityCharFound = false

    }

  }
 showRenameModal = () => {

    this.isVisible = !this.isVisible;

}
async updateSensorName (value,device)
{
    let regEx = /^[a-zA-Z][a-zA-Z_.]{0,1}[ a-z|A-Z|0-9|_.]*$/;

     if (!value || value.trim() === '' || value.length > 15 || !regEx.test(value.trim()))
    {
        Alert.alert("Please enter valid Sensor name.", 'Invalid Sensor name! Maximum length is 15. Name should start with alphabet and may contain dot, underscore, space and numeric value.Please try again');
        return null;
    }
     this.props.uiStartLoading("Updating Sensor Name....");

     let url = Urls.RENAME_GATEWAY_SENSOR;
     let payload = [{"sensorId":device.sensorId,"sensorName":value,"deviceType":Constant.SENSOR_TYPE, "gatewayId":device.gatewayId}]
     console.log("payload for Sensor delete ---:"+JSON.stringify(payload));
     try{
            const response = await fetch(url,{ method: "PUT",headers: {'Accept': 'application/json','Content-Type' : 'application/json' },
                       body: JSON.stringify(payload)})
            console.log("res---"+JSON.stringify(response));
           if(response.ok)
           {
               const msg = await response.json();
               console.log("response in json---"+msg);
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
           alert(err.message);
           return null;
        }
    this.props.uiStartLoading("Updating Sensor Name....");
    let sensors = this.state.sensors;
    console.log('Sensor List....',sensors);
    sensors.map((item) => {
            if(item.eui64 === device.eui64)
                item.device_name = value;
    })
     AsyncStorage.setItem('sensorList',JSON.stringify(sensors)).then(() => {
              this.setState({sensors});
     }).catch((error) => {
                      console.log('error in saving list of sensors to  local storage', error);

     })
    this.props.uiStopLoading();
    this.setState({editedSensor:''});
    alert("Sensor Name Updated Successfully")
    this._onRefresh();
}

  onClearSearch = () => {
    this.setState({
      searching: false,
      filterKey: ''
    })
  }

 

  renderControls(info) {

        if (info.item.deviceUId) {
          let timeStamp = [];
          let timeStampToDisplay;

          return (
            <View style={styles.listItem}>
                 <View style = {{flexDirection: 'row'}}>
                    <View style={{ flexDirection: 'column', color: '#fff', width: '58%'}}>
                        <Text style={{ alignSelf: 'flex-start', color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{debug ? info.item.eui64 + '-' : ''}{info.item.device_name}</Text>
                        <Text style={{ alignSelf: 'flex-start', color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{debug ? info.item.eui64 + '-' : ''}{info.item.device_type}</Text>
                        <Text style={{ color: '#fff', fontSize: 17  }}>{debug ? info.item.id + '-' : ''}{this.getDeviceUID(info.item.eui64)}</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: "center",marginLeft: '12%',height: '70%',marginTop: '2.5%'}}>
                    <Entypo name="edit" size={24} style={{ padding: (0, 0, 0, 10), color: '#fff',backgroundColor: Constant.BLUE_COLOR }} onPress={() =>
                    {
                        this.setState({editedSensor:info.item});
                        this.showRenameModal();
                    }} />

                   <MaterialCommunityIcons name="delete" size={24} style={{ padding: (0, 0, 0, 10), color: '#fff',marginLeft: '7%',backgroundColor: Constant.BLUE_COLOR }} onPress={() =>
                   Alert.alert('Delete Sensor', 'Are you sure you want to delete ' + info.item.device_name + '?',
                    [
                    {
                       text: 'Cancel', onPress: () => {
                           console.log('delete operation was canceled.');
                       }, style: 'cancel'
                    },
                    {
                       text: 'Delete', onPress: () => {
                      if((this.state.gateways[0]).gatewayType === Constant.GATEWAY_TYPE_VALUE_SW)
                      {
                            this.swSensorDelete(info.item);
                      }
                      else
                      {
                        this.setState({gatewayforSensor:info.item.gatewayId});
                        this.showDeviceDiscoveryModalForDeletionOfSensor(true,false,info.item.sensorId,info.item.eui64);
                       }
                      }
                     },
                    ],
                    { cancelable: true }
                    )} />
                    </View>
                 </View>
               <DialogInput
                         dialogIsVisible={this.isVisible}
                         closeDialogInput={() => {this.showRenameModal()}}
                         submitInput={(textValue) => this.updateSensorName(textValue,this.state.editedSensor)}
                         outerContainerStyle={{ backgroundColor: '#737373',opacity: 0.8}}
                         containerStyle={{ backgroundColor: '#d91f2b', borderColor: 'black', borderWidth: 2}}
                         titleStyle={{ color: 'white',fontSize : RFPercentage(3) }}
                         title="Rename Sensor"
                         subTitleStyle={{ color: 'white' }}
                         subtitle="Edit Sensor Name"
                         placeholderInput= {this.state.editedSensor['device_name']}
                         placeholderTextColor="Black"
                         textInputStyle={{ borderColor: 'white',color: 'black', borderWidth: 2,fontStyle: 'bold',fontSize : RFPercentage(2)  }}
                         secureTextEntry={false}
                         buttonsStyle={{ borderColor: 'white' }}
                         textCancelStyle={{ color: 'white',fontSize: RFPercentage(2.5) }}
                         submitTextStyle={{ color: 'white', fontWeight: 'bold' ,fontSize: RFPercentage(2.5)}}
                         cancelButtonText="CANCEL"
                         submitButtonText="RENAME"
               />

            </View>

          );
        }
        else {
          return (
            <View style={styles.listItem}>
             <Text color="#00ff00">No Sensors found.</Text>
            </View>
          );
        }

    }

  render() {

      let growAreaId = this.props.selectedGrowArea ? this.growAreaId : null;

      listData = this.getSensorList() || [];
      displayList = [];
      if(growAreaId != null)
      {
      if(listData){
            listData.map((listItem,index) => {
                if(listItem.gatewayId === growAreaId)
                   displayList.push(listItem);
            });
      }
      }
      else
      {
            listData.map((listItem,index) => {
                     displayList.push(listItem);
             });
      }

      let devicesList;
      if (displayList) {
        if (displayList.length !== 0) {
              devicesList = (
                <FlatList
                  data={displayList}
                  renderItem={(info) => (
                    this.renderControls(info)
                  )}
                  keyExtractor={(item) => item.eui64.toString()}
                  refreshControl={
                    <RefreshControl
                      refreshing={this.state.refreshing}
                      onRefresh={this._onRefresh}
                      colors={['#d91f2b','#d91f2b','#d91f2b']}
                    />
                  }
                />
              );

        } else {
              devicesList = (

              <ScrollView contentContainerStyle={styles.activityIndicator}
                        refreshControl={
                          <RefreshControl
                            refreshing={this.state.refreshing}
                            onRefresh={this._onRefresh}
                            colors={['#d91f2b','#d91f2b','#d91f2b']}
                          />
                        }>
              <Text color="#00ff00">No Sensors found.</Text>

              </ScrollView>
                );
        }
        }else {
                       devicesList = (

                       <ScrollView contentContainerStyle={styles.activityIndicator}
                                 refreshControl={
                                   <RefreshControl
                                     refreshing={this.state.refreshing}
                                     onRefresh={this._onRefresh}
                                     colors={['#d91f2b','#d91f2b','#d91f2b']}
                                   />
                                 }>
                       <Text color="#00ff00">No Sensors found.</Text>

                       </ScrollView>
                         );
                 }

        if (this.props.isLoading) {
              devicesList = <View style={styles.activityIndicator}><ActivityIndicator size="large" color={Constant.RED_COLOR} />
              <Text style={{ margin: 4, fontWeight: "bold" }}>{this.props.isMessage}</Text>
              </View>;
           } else if (displayList.length === 0) {
             devicesList = (

                   <ScrollView contentContainerStyle={styles.activityIndicator}
                        refreshControl={
                        <RefreshControl
                        refreshing={this.state.refreshing}
                        onRefresh={this._onRefresh}
                        colors={['#d91f2b','#d91f2b','#d91f2b']}
                        />
                   }>
                   <Text color="#00ff00">No Sensors found.</Text>

                  </ScrollView>
             );
         }

      let deviceDiscoveryContainer = (
        <View style={styles.scanContainer}>
          <Image
            source={require('../../assets/images/scan.png')}
            style={styles.scanImage}
          />
          {this.state.waitingDeviceLoader ? <ActivityIndicator size='large' color={Constant.RED_COLOR} style={{ marginTop: 20 }} /> : <View></View>}
          {this.state.bleMessage && <Text style={styles.scanText}>{this.state.bleMessage}</Text>}
        </View>
      );
      let softwareGatewayDiscoveryContainer = (
              <View style={styles.scanContainer}>
                <Image
                  source={require('../../assets/images/scan.png')}
                  style={styles.scanImage}
                />
                {this.state.waitingDeviceLoader ? <ActivityIndicator size='large' color={Constant.RED_COLOR} style={{ marginTop: 20 }} /> : <View></View>}
                {this.state.bleMessage && <Text style={styles.scanText}>{this.state.bleMessage}</Text>}
              </View>
            );
      let payload = [];
      let deviceList = Object.keys(this.state.discoveredSoftwareSensor).length;
      if (deviceList > 0) {
        softwareGatewayDiscoveryContainer = (
          <View style={styles.deviceListContainer}>
            <View style={{ alignItems: "center", marginBottom: 6, backgroundColor: Constant.WHITE_BACKGROUND_COLOR }}><Text>{deviceList} {deviceList === 1 ? 'Sensor' : 'Sensors'} found</Text></View>
            <KeyboardAvoidingView style={{ flex: 1, }} behavior="height" enabled>
              <FlatList
                removeClippedSubviews={false}
                 keyboardDismissMode='on-drag'
                 extraData = {this.state.discoveredSoftwareSensor }
                 data={Object.values(this.state.discoveredSoftwareSensor)}

                          renderItem={(info) =>
                            (
                              <View style={styles.gatewayItem}>
                                <Image
                                        source={require('../../assets/images/device_48.png')}
                                         style={styles.deviceIcon}
                                  />
                                 <View style={{ width: '40%', paddingRight: 10, flexDirection: 'column' }}>
                                        <Text style={{ fontSize: 10 }}>Sensor Name</Text>
                                        <TextInput
                                            placeholder='Sensor Name'
                                            editable={!this.state.discoveredSoftwareSensor[info.item.id].decision}
                                            style={{ borderColor: 'gray', borderBottomWidth: 1, padding: 0 }}
                                            onChangeText={(text) => {
                                              let discoveredSoftwareSensor = this.state.discoveredSoftwareSensor
                                              discoveredSoftwareSensor[info.item.id].device_name = text;
                                              this.setState({
                                                discoveredSoftwareSensor: discoveredSoftwareSensor
                                              })
                                            }}
                                            value={this.state.discoveredSoftwareSensor[info.item.id].device_name}
                                          />
                                        <Text style={{ fontSize: 10, marginTop: 5 }}>UId</Text>
                                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "bold" }}>{this.displayDeviceID}</Text>
                                 </View>
                                 <View style={{ width: '35%', flexDirection: 'column' }}>
                                          <Text style={{ fontSize: 10, marginTop: 5 }}>Sensor Type</Text>
                                          <Text style={{ fontSize: 12, fontWeight: "bold" }}>Sentimate</Text>
                                 </View>
                                 <CheckBox
                                              style={{ margin: 15, justifyContent: 'center', alignItems: 'center' }}
                                              onClick={() => {
                                                let regEx = /^[a-zA-Z][a-zA-Z_.]{0,1}[ a-z|A-Z|0-9|_.]*$/;
                                                if (!this.state.discoveredSoftwareSensor[info.item.id].device_name ||
                                                  this.state.discoveredSoftwareSensor[info.item.id].device_name.trim() === '' ||
                                                  this.state.discoveredSoftwareSensor[info.item.id].device_name.length > 15 ||
                                                  !regEx.test(this.state.discoveredSoftwareSensor[info.item.id].device_name.trim())) {
                                                  Alert.alert("Please enter valid Sensor name.", 'Invalid Sensor name! Maximum length is 15. Name should start with alphabet and may contain dot, underscore, space and numeric value.');
                                                }
                                                else {

                                                  console.log("Software Sensor DeviceName:" + this.state.discoveredSoftwareSensor[info.item.id].device_name);
                                                  let discoveredSoftwareSensor = this.state.discoveredSoftwareSensor;
                                                  console.log(JSON.stringify(discoveredSoftwareSensor));

                                                  discoveredSoftwareSensor[info.item.id].decision = !discoveredSoftwareSensor[info.item.id].decision;
                                                  discoveredSoftwareSensor[info.item.id].sensorName = discoveredSoftwareSensor[info.item.id].device_name;


                                                  this.setState({
                                                    discoveredSoftwareSensor: discoveredSoftwareSensor,
                                                  })
                                                  console.log(JSON.stringify(discoveredSoftwareSensor));
                                                }
                                              }}
                                              checkBoxColor='green'
                                              isChecked={this.state.discoveredSoftwareSensor[info.item.id].decision}
                                      />
                                 </View>
                            )}
                            keyExtractor={(item) => item.eui64.toString()}
                        />
                        </KeyboardAvoidingView>
                        <View style = {{width:'100%',flexDirection:'row'}}>
                       <View style= {{alignItems:'flex-start',alignContent:'flex-start',alignSelf:'flex-start',justifyContent:'flex-start'}}>
                        <TouchableOpacity style={[styles.roundButton, styles.registerButton]} onPress={() => {
                                 Object.entries(this.state.discoveredSoftwareSensor).map(([key, value]) => {
                                    if(value.decision === true)
                                       payload.push(value);
                                 })
                                 this.softWareSensorRegister(payload);
                        }}>
                             <Text style={[styles.buttonText]}>REGISTER</Text>
                        </TouchableOpacity>
                        </View>
                       <View style= {{paddingLeft: width * 0.35}}>
                       <TouchableOpacity style={[styles.roundButton, styles.cancelButton]} onPress={() => {
                       this.setState({modalVisibleForSoftwareSensor: false,discoveredSoftwareSensor:{}})
                       }}>
                               <Text style={[styles.buttonText]}>CANCEL</Text>
                       </TouchableOpacity>
                      </View>
                       </View>
                      </View>
                    );
                  }

      let deviceListSize = Object.keys(this.state.discoveredDevices).length;
      if (deviceListSize > 0 && !this.provisionRequestSent) {
        deviceDiscoveryContainer = (
          <View style={styles.deviceListContainer}>
            <View style={{ alignItems: "center", marginBottom: 6, backgroundColor: Constant.WHITE_BACKGROUND_COLOR }}><Text>{deviceListSize} {deviceListSize === 1 ? 'Sensor' : 'Sensors'} found</Text></View>
            <KeyboardAvoidingView style={{ flex: 1, }} behavior="height" enabled>
              <FlatList
                removeClippedSubviews={false}
                keyboardDismissMode='on-drag'
                data={Object.values(this.state.discoveredDevices)}

                renderItem={(info) => (
                  <View style={styles.deviceItem}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Image
                        source={require('../../assets/images/device_48.png')}
                        style={styles.deviceIcon}
                      />
                      <View style={{ width: '40%', paddingRight: 10, flexDirection: 'column' }}>
                        <Text style={{ fontSize: 10 }}>Sensor Name</Text>
                        <TextInput
                          placeholder='Sensor Name'
                          editable={!this.state.discoveredDevices[info.item.eui64].decision}
                          style={{ borderColor: 'gray', borderBottomWidth: 1, padding: 0 }}
                          onChangeText={(text) => {
                            let discoveredDevices = this.state.discoveredDevices
                            discoveredDevices[info.item.eui64].deviceName = text;
                            this.setState({
                              discoveredDevices: discoveredDevices
                            })
                          }}
                          value={this.state.discoveredDevices[info.item.eui64].deviceName}
                        />
                        <Text style={{ fontSize: 10, marginTop: 5 }}>EUI64</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "bold" }}>{info.item.eui64}</Text>
                      </View>
                      <View style={{ width: '35%', flexDirection: 'column' }}>
                        <Text style={{ fontSize: 10, marginTop: 5 }}>Sensor Type</Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>{
                          info.item.deviceType
                        }</Text>
                      </View>
                      <CheckBox
                        style={{ margin: 15, justifyContent: 'center', alignItems: 'center' }}
                        onClick={() => {
                          let regEx = /^[a-zA-Z][a-zA-Z_.]{0,1}[ a-z|A-Z|0-9|_.]*$/;

                          if (!this.state.discoveredDevices[info.item.eui64].deviceName ||
                            this.state.discoveredDevices[info.item.eui64].deviceName.trim() === '' ||
                            this.state.discoveredDevices[info.item.eui64].deviceName.length > 15 ||
                            !regEx.test(this.state.discoveredDevices[info.item.eui64].deviceName.trim())) {
                            Alert.alert("Please enter valid Sensor name.", 'Invalid Sensor name! Maximum length is 15. Name should start with alphabet and may contain dot, underscore, space and numeric value.');
                          }
                          else {
                            console.log("DeviceName:" + this.state.discoveredDevices[info.item.eui64].deviceName);
                            let discoveredDevices = this.state.discoveredDevices;
                            console.log(JSON.stringify(discoveredDevices));

                            discoveredDevices[info.item.eui64].decision = !discoveredDevices[info.item.eui64].decision;
                            discoveredDevices[info.item.eui64].sensorName = discoveredDevices[info.item.eui64].deviceName;
                            this.setState({
                              discoveredDevices: discoveredDevices,
                            })
                            console.log(JSON.stringify(discoveredDevices));
                          }
                        }}
                        checkBoxColor='green'
                        isChecked={this.state.discoveredDevices[info.item.eui64].decision}
                      />
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.eui64.toString()}
              />
            </KeyboardAvoidingView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.roundButton, styles.registerButton]} onPress={() => this.onRegisterDevicesClick()}>
                <Text style={[styles.buttonText, { marginLeft: 0 }]}>REGISTER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roundButton, styles.cancelButton]} onPress={() => this.showDeviceDiscoveryModal(false, false, false, true)}>
                <Text style={[styles.buttonText, { marginLeft: 0 }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>

          </View>
        );
      }

   

      let detailBlock = (<View />);
      if (this.growAreaId) {

        getDetailBlockTitleStyle = function (title) {
          var fontSize = 36;
          var multiplier = 2.5 - (title.length - 16) * 0.125;

          if (title.length > 15 && title.length <= 25) fontSize = fontSize - multiplier * (title.length - 15);
          else if (title.length > 25) fontSize = 19.5;

          return {
            marginLeft: 10,
            marginRight: 10,
            fontSize: fontSize,
            color: Constant.WHITE_TEXT_COLOR
          }
        }


      }

    return (
      <View style={[styles.container, { flex: 2 }]}>
       <Modal
                animationType="slide"
                transparent={true}
                visible={this.state.deviceRegistrationModalVisible}
                onRequestClose={() => { }}
              >
                <View style={{ justifyContent: 'center', flex: 1, backgroundColor: '#rgba(0, 0, 0, 0.5)' }}>
                  <View style={{ alignItems: 'center', backgroundColor: '#fff' }}>
                    <ActivityIndicator size='large' color={Constant.RED_COLOR}  style={{ marginTop: 20 }} />
                    <Text style={{ alignSelf: 'center', marginTop: 20 }}> Your {this.onTimeRegistredDevices === 1 ? 'Sensor is ' : 'Sensors are '}provisioning{debug ? this.onTimeRegistredDevices : ''}.</Text>
                    <Text style={{ alignSelf: 'center', marginTop: 0, marginBottom: 20 }}>This process may take time. </Text>
                    <Text style={{ alignSelf: 'center', marginTop: 20, marginBottom: 20 }}>Successfully registered Sensors: {this.state.callbackRegistredDevices}</Text>
                    {this.closeRegistrationModal()}
                  </View>

                </View>

              </Modal>
        <View style={styles.greenBackgroundContainer} />
        <View style={styles.titleTextContainer}>
            <View style={{width:'60%'}}><Text style={styles.titleText}>Sensors</Text></View>
            <View style={{width:'40%',flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>
                <TouchableOpacity onPress={() => {this.openSettingsPage() }}>
                  <Image source={ require('../../assets/images/setting1.png')} style={[styles.settingIcon,{marginBottom: '6%'}]} ></Image>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {this.openDashboardPage() }}>
                  <Image source={ require('../../assets/images/home1.png')} style={[styles.homeIcon,{marginBottom: '6%'}]} ></Image>
                </TouchableOpacity>
            </View>
        </View>
        {detailBlock}
               <View style={styles.listContainer}>
                <View style={{width:'100%' ,flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>

                    <TouchableOpacity style={[styles.roundButton, { backgroundColor: Constant.RED_COLOR }]} onPress={async() => {
                   if(!this.props.isLoading)
                   {
                   if((this.state.gateways[0]).gatewayType === Constant.GATEWAY_TYPE_VALUE_SW)
                   {
                        if(this.state.gateways.length !== 0)
                            {
                              console.log('timer value on sensor provision',global.timerValue);
                              clearInterval(global.timerValue);
                              global.timerValue = null;
                               if(this.pirCharSubscription)
                                this.pirCharSubscription.remove();
                               if(this.co2CharSubscription)
                                this.co2CharSubscription.remove();
                               if(this.humidityCharSubscription)
                                this.humidityCharSubscription.remove();
                               if(this.temperatureCharSubscription)
                                this.temperatureCharSubscription.remove();
                                // if (Platform.OS === 'android') {
                                  this.props.bleManager.destroy();
                                  this.props.onSetBleManager(new BleManager());
                                // }

                               this.showSoftwareSensorDiscoveryModal(true,false,true,false);
                        }
                        else
                        {
                           alert("Gateway has not been Provisioned. Please provisioned it");
                        }
                   }
                   else
                   {
                    if(this.state.gateways.length !== 0)

                    {
                        this.showDeviceDiscoveryModal(true, false, true, false)
                    if (this.provisionCallbackCharSubscription) {
                        console.log('keepprovision callback');

                        this.provisionCallbackCharSubscription.remove();
                    }

                    if (this.discoverCharSubscription) {
                        this.discoverCharSubscription.remove();
                    }
                    this.setState({
                       callbackRegistredDevices: 0
                       , showCancelButton: true, errorCode: 0
                    })
                    }
                    else
                    {
                       alert("Gateway has not been Provisioned. Please provisioned it");
                    }
                    }
                    }
                    else
                    {
                          alert("Please wait...process is going on");
                    }
                    }
                    }>
                    <Text style={styles.buttonText}>Add New</Text>

                    </TouchableOpacity>

                </View>
                    {devicesList}
                <View style={{ height: 10, backgroundColor: '#fff' }}></View>
               </View>
               <Modal
                 animationType="slide"
                 transparent={true}
                 visible={this.state.deviceDiscoveryModalVisible}
                 onRequestClose={() => { this.showDeviceDiscoveryModal(false, false, false, true); }}
               >
                 <View style={styles.fullModalContainer}>
                   <View style={styles.modalContainer}>
                     <View style={styles.modalTitle}>
                     <Image
                           source={require('../../assets/images/add_24.png')}
                          style={styles.modalTitleAddButton}
                     />
                       <Text>Discover New Sensors</Text>
                     </View>
                     {deviceDiscoveryContainer}
                   </View>
                 </View>
               </Modal>

        <Modal
           animationType="slide"
           transparent={true}
           visible={this.state.modalVisibleForSoftwareSensor}
           onRequestClose={() => {
           }}
         >
           <View style={styles.fullModalContainer}>
             <View style={styles.modalContainer}>
               <View style={styles.modalTitle}>
                 <Image
                   source={require('../../assets/images/add_24.png')}
                   style={styles.modalTitleAddButton}
                 />
                 <Text>Discover New Sensors</Text>
               </View>
               {softwareGatewayDiscoveryContainer}
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
  greenBackgroundContainer: {
    backgroundColor: Constant.RED_COLOR,
    width: '100%',
    height: height * 0.095,
    position: 'absolute'
  },
  titleTextContainer: {
     flexDirection: 'row',
     alignItems: "center",
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
  listContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Constant.WHITE_BACKGROUND_COLOR,
    marginLeft: '5%',
    marginRight: '5%',
    borderRadius: 5,
    marginTop: height * 0.065,
  },
  listTitle: {
    padding: 10,
    fontWeight: 'bold',
    borderBottomColor: Constant.LIGHT_GREY_COLOR
  },

  listItem: {
    width: "100%",
    borderTopWidth: 3,
    borderColor: Constant.LIGHT_GREY_COLOR,
    padding: 10,
    backgroundColor: Constant.GREY_COLOR,
    height: height * 0.12,
    paddingTop: '2%',
    paddingBottom: '1%'
  },
  activityIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    color : Constant.RED_COLOR,
  },
  detailBlock: {
    backgroundColor: '#636363',
    marginBottom: 20,
    marginLeft: '5%',
    marginRight: '5%',
    borderRadius: 5,
    flexDirection: "column",
    maxHeight: '50%'
  },
  detailBlockTitleInfo: {
    marginLeft: 10,
    marginTop: 10,
    color: Constant.WHITE_TEXT_COLOR
  },
  detailBlockTitle: {
    marginLeft: 10,
    marginRight: 10,
    fontSize: 36,
    color: Constant.WHITE_TEXT_COLOR
  },
  roundButton: {
    justifyContent: "center",
    padding: 6,
    borderRadius: 12,
    marginRight: 12,
    height:width * 0.09,
    width:width * 0.23
  },
  cancelButton: {
    width: width * 0.26,
    margin: 10,
    padding: 6,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: Constant.RED_COLOR
  },
  registerButton: {
    width: width * 0.26,
    margin: 10,
    padding: 6,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: Constant.RED_COLOR,
  },
  buttonText: {
    fontSize: RFPercentage(2.2),
    color: Constant.WHITE_TEXT_COLOR,
    fontWeight: "bold",
    textAlign: 'center'
  },
  detailIcon: {
    backgroundColor: '#78787878',
    height: 24,
    width: 24,
    borderRadius: 12,
    marginLeft: 5
  },
  detailDeviceName: {
    color: Constant.GREY_TEXT_COLOR,
    fontSize: 10
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
  deviceList: {
    flex: 1
  },
  deviceListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  deviceIcon: {
    backgroundColor: Constant.ADD_NEW_GATEWAY_BUTTON_COLOR,
    height: 30,
    width: 30,
    borderRadius: 15,
    marginRight: 10
  },
  fullModalContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#78787885'
  },
  modalContainer: {
    width: '100%',
    minHeight: '90%',
    backgroundColor: Constant.WHITE_BACKGROUND_COLOR
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
  deviceItem: {
    margin: 8,
    padding: 10,
    elevation: 5,
    width: "95%",
    backgroundColor: Constant.WHITE_BACKGROUND_COLOR
  },
    gatewayItem: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: Constant.LIGHT_GREY_COLOR,
    },
    gatewayListContainer: {
      flex: 1,
      justifyContent: "center"
    }
});

mapStatesToProps = state => {
    this.connectedBle = state.ble.bleManager;
  return {
    devices: state.root.devices,
    devicesByGrowAreaId: state.root.devicesByGrowAreaId,
    isLoading: state.ui.isLoading,
    isMessage: state.ui.isMessage,
    bleDevices: state.ble.bleDevices,
    bleManager: state.ble.bleManager,
    deviceTypes: state.root.deviceTypes,
    registredDevice: state.ble.registredDevice,
    retry401Count: state.auth.retry401Count,

  }
};

mapDispatchToProps = dispatch => {


  return {
    onSetBleManager: (bleManager) => dispatch(setBleManager(bleManager)),
    onAddDevice: (device) => dispatch(addBleDevice(device)),
    onRemoveDevice: (deviceId) => dispatch(removeBleDevice(deviceId)),
    onSignoutDisconnect: (device) => dispatch(removeBleDevicefromDevice(device)),
    onSetBleManager: (bleManager) => dispatch(setBleManager(bleManager)),
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

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4();
}

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export const disconnectBleinDevice = () => {
  this.connectedBle.destroy();
}

export default connect(mapStatesToProps, mapDispatchToProps)(Devices);

