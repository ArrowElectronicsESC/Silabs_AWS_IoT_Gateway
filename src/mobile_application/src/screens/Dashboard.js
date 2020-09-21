import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, Dimensions, ImageBackground,
  Platform, AsyncStorage, Image, TouchableOpacity, PermissionsAndroid
} from 'react-native';
import * as Constant from '../Constant';
import { connect } from 'react-redux';
import Slide from './SlideComponent';
import {
  setBleManager
} from '../store/actions/rootActions';
import {
  getDashboardCount, getAlerts
} from '../store/actions/rootActions';
import { displayName as appName, debug, bleDebug, liveChartDebug, deviceDiscoveryTimeout, software_sensor_discovery_name_prefix } from './../../app.json';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from "buffer";
import { Navigation } from 'react-native-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
const { width, height } = Dimensions.get('window');
import Amplify, { PubSub } from 'aws-amplify';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
Amplify.addPluggable(new AWSIoTProvider(
  {
    aws_pubsub_region: '<AWS IOT core endpoint region>',
    aws_pubsub_endpoint: 'wss://<AWS IOT core endpoint>/mqtt',
  }));
class Dashboard extends Component {

  static get options() {
    return Constant.DEFAULT_NAVIGATOR_STYLE
  }
  alreadyRegistredSensorsList = [];
  deviceCharacteristics = {};
  constructor(props) {
    super(props);
    Navigation.events().bindComponent(this);
    if (!this.props.bleManager) {
      console.log("BLE manager created on Dashboard page");
      this.props.onSetBleManager(new BleManager());
    }
    this.eventSubscription = Navigation.events().registerNavigationButtonPressedListener(this.MenuIconPrressed);
    this.state = {
      token: '',
      sideMenuVisible: false
    };
  }

  async componentDidAppear() {
    this.props.bleManager.enable()
    await AsyncStorage.multiGet(['accessToken', 'listGateway', 'sensorList']).then(response => {
      let token = response[0][1];
      let gateways = JSON.parse(response[1][1]);
      let sensors = JSON.parse(response[2][1]);

      this.setState({ token, gateways, sensors }, () => {
      });

    }).catch((e) => {
      console.log('error in geting asyncStorage\'s item:', e.message);
    })

    console.log('Gateway list----------------------', this.state.gateways);
    console.log('Sensor list----------------------', this.state.sensors);
    this.alreadyRegistredSensorsList = await this.alreadyRegistredSensors(this.state.sensors);
    if (this.state.gateways != undefined && this.state.gateways.length !== 0) {
      if (this.state.gateways[0].gatewayType == Constant.GATEWAY_TYPE_VALUE_SW && this.state.sensors.length !== 0) {
        setTimeout(() => {
          this.connectSensorAutomatically();
        }, 1000);
        if (!global.timerValue) {
           let timer = setInterval(() => {
          this.props.bleManager.enable()
          this.connectSensorAutomatically();
          console.log("10 sec timer called");
        }, 10000);
        console.log('timer after new cretion',timer);
        global.timerValue = timer
        }
      }
    }

  }

  alreadyRegistredSensors(registeredSensors) {
    try {
      var data = []
      if (registeredSensors != undefined && registeredSensors.length != 0) {
        registeredSensors.map((sensor) => {
          data.push(sensor.deviceUId);
        });
        return data;
      }
      return [];
    } catch (e) {
      console.log('error in alreadyRegistered data', e);
    }
  }

  connectSensorAutomatically = () => {
    console.log('in sensorConnect function gateways list --:', this.state.gateways);
    if (this.state.gateways != undefined && this.state.gateways.length !== 0) {
      if (this.state.gateways[0].gatewayType == Constant.GATEWAY_TYPE_VALUE_SW && this.state.sensors.length !== 0) {
        this.props.bleManager.isDeviceConnected(this.state.sensors[0].deviceUId).then(isConnected => {
          console.log('first sensor isConnected', isConnected);
          if (!isConnected) {
            this.scanAndConnectForSoftwareSensor();
          }
        }).catch(error => {
          console.log('error:' + error);
        })
      }
    }
  }

  scanAndConnectForSoftwareSensor = () => {
    if (this.props.bleManager) {
      console.log("Started device scan...");
      this.timeOutValueProvision = setTimeout(() => {
        this.props.bleManager.stopDeviceScan();
        console.log("device scan stop in timeout");
      }, 10000)
      this.props.bleManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          clearTimeout(this.timeOutValueProvision);
          console.log('ErrorCode:' + error.errorCode);
          if (error.errorCode === 101) {
            //Device is not authorized to use BluetoothLE
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please provide access.')
            }
            else {
              Promise.resolve(requestLocationPermission())
                .then(sources => {
                  this.scanAndConnectForSoftwareSensor();
                }).catch(error => {
                  console.log("error---" + error);
                  this.scanAndConnectForSoftwareSensor();
                });
            }
          }
          else if (error.errorCode === 601) {
            //Location services are disabled
            if (Platform.OS === 'ios') {
              alert(appName + ' app wants to use location services.. please enable it.')
            }
            else {
              RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
                .then(data => {
                  console.log(data);
                  return;
                }).catch(error => {
                  console.log(error);
                  return;
                });
            }
          }
          else {
            console.log(error.errorCode + ":" + error.message);
          }
          return;
        }
        console.log("device scan--" + device.id);
        console.log("register sensor list---" + this.alreadyRegistredSensorsList);
        if (device.name && device.id && device.name.startsWith(software_sensor_discovery_name_prefix) && this.alreadyRegistredSensorsList.includes(device.id)) {
          this.props.bleManager.stopDeviceScan();
          clearTimeout(this.timeOutValueProvision);
          console.log('device found so stop interval and scanning');
          this.props.bleManager.isDeviceConnected(device.id).then(async (isConnected) => {
            console.log('device found over BLE already isConnected ----', isConnected);
            if (!isConnected) {
              connectedDevice = await this.props.bleManager.connectToDevice(device.id, { timeout: 20000 });
              this.connectCharacteristicsAndServices(device);
            }
          }).catch(error => {
            console.log('error:' + error);
          })
        }

      });
    }
    else {
      this.props.onSetBleManager(new BleManager());
    }
  }

  connectCharacteristicsAndServices(device) {
    console.log("Discovering services and characteristics...");
    device.discoverAllServicesAndCharacteristics()
      .then((device) => {
        console.log("DeviceId:" + device.id);
        this.deviceCharacteristics[device.id] = {};
        this.deviceCharacteristics[device.id]['mtu'] = device.mtu;
        device.services().then(services => {
          console.log("Total Services size:" + services.length);
          if (services.length === 0) {
            console.log("No known services found in connected device.");
            device.cancelConnection();
          }
          else {
            console.log('Services discovered..');
          }
          services.forEach((service, i) => {
            if (service.uuid.startsWith(Constant.KNOWN_BLE_SERVICES.SERVICE_SW_SENSOR_PROVISION_UUID) || service.uuid.startsWith(Constant.KNOWN_BLE_SERVICES.SERVICE_SW_SENSOR_PROVISION_UUID_FOR_PIR)) {
              service.characteristics().then(characteristics => {
                console.log("Service UUID:" + service.uuid);
                console.log("Initial characteristics size:" + characteristics.length);
                characteristics = characteristics.filter((characteristic) => {

                  characteristicPrefix = this.isKnownCharacteristic(characteristic);
                  if (characteristicPrefix) {
                    console.log("Characteristics UUID:" + characteristic.uuid);
                    this.deviceCharacteristics[device.id][characteristicPrefix] = characteristic;
                    return true;
                  }
                });
                console.log("After filtering characteristics size:" + characteristics.length);
                console.log("deviceCharacteristics List:", JSON.stringify(Object.keys(this.deviceCharacteristics[device.id])));
                this.setState({
                  bleMessage: 'Characteristics discovered..',
                  waitingDeviceLoader: true
                })
                let sensors = this.state.sensors;
                let connectedSensor = sensors.find(item => item.deviceUId === device.id)
                let topic = 'gateway/' + connectedSensor.gatewayId + '/telemetry';
                var deviceHumidityCharFound = false;
                var deviceCo2CharFound = false;
                var deviceTemperatureCharFound = false;
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
                if (deviceHumidityCharFound && deviceCo2CharFound && deviceTemperatureCharFound && devicePirCharFound) {
                  console.log('Found every characteristics value.......');

                  this.listenPirValue(this.devicePirChar, connectedSensor, topic);
                  this.listenHumidityValue(this.deviceHumidityChar, connectedSensor, topic);
                  this.listenCo2Value(this.deviceCo2Char, connectedSensor, topic);
                  this.listenTemperatureValue(this.deviceTemperatureChar, connectedSensor, topic);
                } else {
                  alert("One of the required characteristic not found in connected sensor");
                }



              })
            }
          })
        })
      })
      .catch((error) => {
        if (error.errorCode === 205) {
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
          console.log("Error: " + error.message)
          console.log("ErrorCode:" + error.errorCode)
          alert('No readable characteristics in connected Sensor');
        }
      })
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

  listenPirValue = (devicePirChar, connectedSensor, topic) => {

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
        console.log('PIR Value--------', pirValue);
        console.log('Topic-------------------', topic);
        let payload = {
          "sensorName": connectedSensor.device_name,
          "gatewayId": connectedSensor.gatewayId,
          "sensorId": connectedSensor.sensorId,
          "timestamp": Date.now().toString(),
          "PIR": Number(pirValue)
        };
        console.log('Payload---------------', payload);

        PubSub.publish(topic, payload);

      }
    }, 'myPirTransactionValue');
  }
  listenCo2Value = (deviceCo2Char, connectedSensor, topic) => {

    this.co2CharSubscription = deviceCo2Char.monitor((error, characteristic) => {
      if (error) {
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nCo2CharacteristicsSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nC02CharacteristicsSubscription');
        }
      }
      else {

        let value = this.convertValueToDecimal(characteristic);
        console.log('Co2 value----------', value);
        console.log('Topic-------------------', topic);
        let payload = {
          "sensorName": connectedSensor.device_name,
          "gatewayId": connectedSensor.gatewayId,
          "sensorId": connectedSensor.sensorId,
          "timestamp": Date.now().toString(),
          "CO2": Number(value)
        };
        console.log('Payload---------------', payload);

        PubSub.publish(topic, payload);

      }
    }, 'myCo2TransactionValue');
  }
  listenHumidityValue = (deviceHumidityChar, connectedSensor, topic) => {

    this.humidityCharSubscription = deviceHumidityChar.monitor((error, characteristic) => {
      if (error) {
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nHumidityCharacteristicsSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nHumidityCharacteristicsSubscription');
        }
      }
      else {

        let value = this.convertValueToDecimal(characteristic);

        let humidityValue = (value / 100);

        console.log('Humidity value-------', humidityValue);
        console.log('Topic-------------------', topic);
        let payload = {
          "sensorName": connectedSensor.device_name,
          "gatewayId": connectedSensor.gatewayId,
          "sensorId": connectedSensor.sensorId,
          "timestamp": Date.now().toString(),
          "humidity": humidityValue
        };
        console.log('Payload---------------', payload);

        PubSub.publish(topic, payload);


      }
    }, 'myHumidityTransactionValue');


  }
  listenTemperatureValue = (deviceTemperatureChar, connectedSensor, topic) => {

    this.temperatureCharSubscription = deviceTemperatureChar.monitor((error, characteristic) => {
      if (error) {
        console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nTemperatureCharacteristicsSubscription');
        if (this.state.errorCode === 1) {
          console.log("Error:" + error.message + "\nErrorCode:" + error.errorCode + '\nTemperatureCharacteristicsSubscription');
        }
      }
      else {

        let value = this.convertValueToDecimal(characteristic);

        let temperatureValue = (value / 100);

        temperatureValue = ((temperatureValue * 9) / 5) + 32;

        temperatureValue = parseInt(temperatureValue * 100 + 0.5);

        temperatureValue = temperatureValue / 100;

        console.log('Temperature value-------', temperatureValue);

        console.log('Topic-------------------', topic);
        let payload = {
          "sensorName": connectedSensor.device_name,
          "gatewayId": connectedSensor.gatewayId,
          "sensorId": connectedSensor.sensorId,
          "timestamp": Date.now().toString(),
          "temperature": temperatureValue
        };
        console.log('Payload---------------', payload);

        PubSub.publish(topic, payload);


      }
    }, 'myTemperatureTransactionValue');
  }

  convertValueToDecimal = (characteristic) => {

    let value = Buffer.from(characteristic.value, "base64");
    valueBigEndian = value.toString("hex");

    let firstString = valueBigEndian.toString().slice(2);
    let secondString = valueBigEndian.toString().slice(0, 2);

    valueLittleEndian = firstString + secondString;

    var converter = require('hex2dec');

    var dec = converter.hexToDec(valueLittleEndian.toString());

    return dec;

  }

  MenuIconPrressed = (res) => {
    Platform.OS === 'ios' ? this.setState({ sideMenuVisible: !this.state.sideMenuVisible }) : this.setState({ sideMenuVisible: true })
    Navigation.mergeOptions(res.componentId, {
      sideMenu: {
        left: {
          visible: this.state.sideMenuVisible,
          enabled: Platform.OS === 'android'
        }
      }
    })
  }

  renderCount() {
    return (
      <View style={styles.listItem}>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  renderPage() {

    return (
      <View style={styles.listItem}>
        <ActivityIndicator size='large' />
      </View>)
  }
  openSettingPage = () => {
    let screenName = 'SettingsScreen';
    Navigation.push(this.props.componentId, {
      component: {
        name: screenName,
        passProps: {

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

  openGatewayPage = () => {
    let screenName = 'GrowAreasScreen';
    Navigation.push(this.props.componentId, {
      component: {
        name: screenName,
        passProps: {
        },
        options: {
          topBar: {
            visible: true,
            animate: true,
            elevation: 0,
            shadowOpacity: 0,
            drawBehind: false,
            hideOnScroll: false,
            height: 44,
            background: {
              color: Constant.RED_COLOR,
            },
            backButton: {
              color: '#fff',
            },
            title: {
              text: "Previous",
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

  openSensorViewPage = () => {
    let screenName = 'Chart';
    Navigation.push(this.props.componentId, {
      component: {
        name: screenName,
        passProps: {

        },
        options: {
          topBar: {
            visible: true,
            animate: true,
            elevation: 0,
            shadowOpacity: 0,
            drawBehind: false,
            hideOnScroll: false,
            height: 44,
            background: {
              color: Constant.RED_COLOR,
            },
            backButton: {
              color: '#fff',
            },
            title: {
              text: "Previous",
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


  render() {
    return (
      <View style={[styles.container, { flex: 2 }]}>
        <View style={{ width: '40%', flexDirection: 'row', alignItems: 'flex-end', alignContent: 'flex-end', alignSelf: 'flex-end', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={() => { this.openSettingPage() }}>
            <Image source={require('../../assets/images/setting.png')} style={styles.settingIcon} />
          </TouchableOpacity>
        </View>

        <ImageBackground
          source={require('../../assets/images/title_logo.png')} style={{ width: width * 0.9, marginTop: '2%', marginBottom: '5%', marginLeft: (width * 0.1), padding: '1%', height: (width * 0.7) * 0.45 }}>
        </ImageBackground>
        <Text style={[styles.dashboardTitleText, { marginLeft: 0 }]}> EFR32 {"\n"}IoT {"\n"}Gateway</Text>
        <View style={{ flexDirection: 'column', marginLeft: (width * 0.15), marginTop: (width * 0.2) }}>
          <TouchableOpacity style={[styles.DashboardroundButton]} onPress={() => { this.openSensorViewPage() }}>
            <Text style={[styles.dashboardButtonText, { marginLeft: 0 }]}>SENSOR VIEW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.DashboardroundButton]} onPress={() => { this.openGatewayPage() }}>
            <Text style={[styles.dashboardButtonText, { marginLeft: 0 }]}>GATEWAY VIEW</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Constant.PRIMARY_COLOR
  },
  greenBackgroundContainer: {
    backgroundColor: Constant.LIGHT_GREY_COLOR,
    width: '100%',
    height: '25%',
    position: 'absolute',
  },
  drawerItemIcon: {
    // marginRight: '5%',
    marginLeft: (width * 0.9),
    height: (width * 0.7) * 0.09,
    width: (width * 0.7) * 0.09
  },
  settingIcon: {
    height: height * 0.04,
    width: width * 0.08,
    marginHorizontal: width * 0.03
  },
  DashboardroundButton: {
    flexDirection: 'column',
    justifyContent: "center",
    alignItems: 'center',
    padding: 5,
    borderRadius: 16,
    marginRight: 12,
    marginTop: 10,
    width: width * 0.7,
    height: width * 0.15,
    borderRadius: 12,
    backgroundColor: Constant.RED_COLOR,
  },
  dashboardButtonText: {
    fontSize: RFPercentage(3.0),
    marginLeft: 7,
    color: Constant.WHITE_COLOR,
    fontWeight: "bold",
    textAlign: 'center'
  },
  dashboardTitleText: {
    fontSize: RFPercentage(5.5),
    marginLeft: 7,
    color: Constant.BLACK_COLOR,
    fontWeight: "bold",
    textAlign: 'center'
  },
  listContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Constant.LIGHT_GREY_COLOR,
    marginLeft: '5%',
    marginRight: '5%',
    borderRadius: 5,
  },
  listTitle: {
    padding: 10,
    fontWeight: 'bold',
    borderBottomColor: Constant.LIGHT_GREY_COLOR
  },
  listItem: {
    width: "100%",
    borderTopWidth: 2,
    borderColor: Constant.LIGHT_GREY_COLOR,
    padding: 10,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: '#636363',
    marginTop: -5
  },
  activityIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
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
  locationTitleInfo: {
    marginLeft: 10,
    fontSize: 10,
    color: Constant.GREY_TEXT_COLOR
  },
  locationInfo: {
    marginLeft: 4,
    marginRight: 10,
    fontSize: 12,
    fontWeight: "bold",
    color: Constant.WHITE_TEXT_COLOR
  },
  roundButton: {
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: 'center',
    padding: 5,
    borderRadius: 16,
    marginRight: 12
  },
  cancelButton: {
    width: 60,
    margin: 10,
    padding: 6,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: Constant.DARK_GREY_COLOR
  },
  registerButton: {
    width: 70,
    margin: 10,
    padding: 6,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: Constant.PRIMARY_COLOR,
  },
  buttonText: {
    fontSize: 12,
    marginLeft: 7,
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
  detailDeviceCount: {
    color: Constant.GREY_TEXT_COLOR,
    fontSize: 30
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
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
  },
  slide2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#97CAE5',
  },
  slide3: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#92BBD9',
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  }

});

mapStatesToProps = state => {
  return {
    bleManager: state.ble.bleManager,
  }
};

mapDispatchToProps = dispatch => {
  return {
    onSetBleManager: (bleManager) => dispatch(setBleManager(bleManager)),
  }
};

async function requestLocationPermission() {
  console.log("in request location permission");
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

export default connect(mapStatesToProps, mapDispatchToProps)(Dashboard);
