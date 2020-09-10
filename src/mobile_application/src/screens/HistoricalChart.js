import React, { Component } from "react";
import { View, StyleSheet, ScrollView, Text,FlatList, TouchableOpacity,Image,AsyncStorage,Dimensions, ActivityIndicator, Picker, Alert } from "react-native";
import { connect } from 'react-redux';
import DateTimePicker from 'react-native-modal-datetime-picker';
import * as Urls from '../Urls';
import * as Constant from '../Constant';
import { Navigation } from "react-native-navigation";
import { WebView } from 'react-native-webview';
import Amplify, { PubSub } from 'aws-amplify';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
import _ from 'lodash';
import Swiper from "react-native-custom-swiper";
const {width,height} = Dimensions.get('window');

// Change the Endpoint below to your AWS IOT Core endpoint
Amplify.addPluggable(new AWSIoTProvider(
  {
    aws_pubsub_region: '<AWS IOT core endpoint region>',
    aws_pubsub_endpoint: 'wss://<AWS IOT core endpoint>/mqtt',
}));


class HistoricalChart extends Component {

  static get options() {
    return {
      ...Constant.DEFAULT_NAVIGATOR_STYLE
    };
  }
  subscription='';
  currentGateway='';
  property ={
              "PIR":Constant.INITIAL_MSG,
              "CO2":Constant.INITIAL_MSG,
              "humidity":Constant.INITIAL_MSG,
              "temperature":Constant.INITIAL_MSG,
            };
  constructor(props) {
    super(props);
    Navigation.events().bindComponent(this);
    this.state = {
      token: '',
      sensors: [],
      sensorCurrentIndex: 0,
      currentPropertyIndex: 0,
      alertCurrentPropertyIndex: 0,
      lowAlertValue: 0,
      highAlertValue: 0,
      data: [],
      sensorLive:{},
      thresholdValues: {}
    };
    this.lowalertClickedValue = _.debounce(this.lowalertClickedValue, 2000);
    this.highalertClickedValue = _.debounce(this.highalertClickedValue, 2000);
  }

  componentDidAppear() {
    AsyncStorage.multiGet(['accessToken', 'sensorList']).then(response => {
      let token = response[0][1];
      let sensors = JSON.parse(response[1][1]);
      if (sensors.length !== 0) {
        let thresholdValues = sensors[0]['thresholdValues']
        this.currentGateway=sensors[0]['gatewayId']
        this.setState({ thresholdValues: thresholdValues })
        this.setState({ lowAlertValue: thresholdValues['lowTemp'] })
        this.setState({ highAlertValue: thresholdValues['highTemp'] })
        let sensorLive = {};
        sensors.map((item) => {
          sensorLive[item['sensorId']]=this.property
        })
        this.setState({sensorLive});
        console.log("final object---"+JSON.stringify(sensorLive));
        setTimeout(() => {
          this.connectAWSIOT();
        }, 1000);
      }
      this.setState({ token, sensors }, () => {
      });
    }).catch((e) => {
      console.log('error in geting asyncStorage\'s item:', e.message);
    })
    
  }

  componentDidDisappear() {
    this.subscription.unsubscribe();
  }

  ActivityIndicatorLoadingView() {
    //making a view to show to while loading the webpage
    return (
      <View style={styles.activityIndicator}>
        <ActivityIndicator size="large" color={Constant.RED_COLOR} /><Text style={{ margin: 4, fontWeight: "bold" }}>Data Loading...</Text>
      </View>
    );
  }

  connectAWSIOT()
  {
    const topic='gateway/'+this.currentGateway+'/telemetry';
    console.log("topic----"+topic);
    this.subscription= PubSub.subscribe(topic ,{ provider: 'AWSIoTProvider' }).subscribe({
      next: data => this.telemetryProcessing(data['value']),
      error: error => console.error(error),
      close: () => console.log('Done'),
    });
  }

  telemetryProcessing(data)
  {
    let sensorsLive = {...this.state.sensorLive}
    console.log("Telemetry---"+JSON.stringify(data));
    if(data['sensorId'] in sensorsLive )
    {
      if("temperature" in data)
      {
        if(sensorsLive[data['sensorId']]['temperature']!= data['temperature'])
        {
         let newObj;
         newObj={...sensorsLive[data['sensorId']],temperature:data['temperature'] }
         sensorsLive[data['sensorId']]=newObj
         this.setState({sensorLive:sensorsLive});
        }
      }else if ("humidity" in data)
      {
        if(sensorsLive[data['sensorId']]['humidity']!= data['humidity'])
        {
          let newObj;
          newObj={...sensorsLive[data['sensorId']],humidity:data['humidity'] }
          sensorsLive[data['sensorId']]=newObj
          this.setState({sensorLive:sensorsLive});
          console.log("humidity state updated");
        }
      }else if ("CO2" in data)
      {
        if(sensorsLive[data['sensorId']]['CO2']!= data['CO2'])
        {
          let newObj;
          newObj={...sensorsLive[data['sensorId']],CO2:data['CO2'] }
          sensorsLive[data['sensorId']]=newObj
          this.setState({sensorLive:sensorsLive});
          console.log("CO2 state updated");
        }
      }else if ("PIR" in data)
      {
        if(sensorsLive[data['sensorId']]['PIR']!= data['PIR'])
        {
          let newObj;
          newObj={...sensorsLive[data['sensorId']],PIR:data['PIR'] }
          sensorsLive[data['sensorId']]=newObj
          this.setState({sensorLive:sensorsLive});
          console.log("PIR state updated");
        }
      }
    }
  }

  showData() {
    var propertyName = Constant.propertyList[this.state.currentPropertyIndex];
    var dashboardId;
    if (propertyName == Constant.TEMPERATURE) {
      dashboardId = Urls.TEMPERATURE_DASHBOARD;
    } else if (propertyName == Constant.CO2) {
      dashboardId = Urls.CO2_DASHBOARD;
    }
    else if (propertyName == Constant.PIR) {
      dashboardId = Urls.PIR_DASHBOARD;
    }
    else if (propertyName == Constant.HUMIDITY) {
      dashboardId = Urls.HUMIDITY_DASHBOARD;
    }

    var selectedItem = this.state.sensors[this.state.sensorCurrentIndex]
    gatewayId = selectedItem['gatewayId'];
    sensorId = selectedItem['sensorId'];
    const finalUrl = Urls.EMBEDDED_BASE_URL + `?dashboardid=${dashboardId}&userarn=${Urls.USER_ARN}:user/default/viren.moradiya@einfochips.com&apigurl=${Urls.APIG_URL}&gatewayId=${gatewayId}&sensorId=${sensorId}`;
    console.log(finalUrl);
    return (

      <WebView
        source={{ uri: finalUrl }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        renderLoading={this.ActivityIndicatorLoadingView}
        startInLoadingState={true}
      />
    );
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


  sensorNextArrow() {
    if (this.state.sensorCurrentIndex >= this.state.sensors.length - 1) {
      this.setState({ sensorCurrentIndex: this.state.sensorCurrentIndex })
    }
    else {
      var sensorCurrentIndex = this.state.sensorCurrentIndex + 1;
      var thresholdValues = this.state.sensors[sensorCurrentIndex]['thresholdValues'];
      this.setState({ thresholdValues: thresholdValues })
      this.setState({ sensorCurrentIndex: sensorCurrentIndex })
      setTimeout(() => { this.setAlertValues(this.state.currentPropertyIndex) }, 500);
    }
  }
  sensorBackArrow() {

    if (this.state.sensorCurrentIndex <= 0) {
      this.setState({ sensorCurrentIndex: 0 })
    }
    else {
      var sensorCurrentIndex = this.state.sensorCurrentIndex - 1;
      var thresholdValues = this.state.sensors[sensorCurrentIndex]['thresholdValues'];
      this.setState({ thresholdValues: thresholdValues })
      this.setState({ sensorCurrentIndex: sensorCurrentIndex })
      setTimeout(() => { this.setAlertValues(this.state.currentPropertyIndex) }, 500);
    }

  }

  propertyNextArrow() {

    if (this.state.currentPropertyIndex >= Constant.propertyList.length - 1) {
      this.setState({ currentPropertyIndex: this.state.currentPropertyIndex })
    }
    else {
      var currentPropertyIndex = this.state.currentPropertyIndex + 1;
      this.setState({ currentPropertyIndex: currentPropertyIndex })
      this.setAlertValues(currentPropertyIndex);
    }
  }

  propertyBackArrow() {
    if (this.state.currentPropertyIndex <= 0) {
      this.setState({ currentPropertyIndex: 0 })
    }
    else {
      var currentPropertyIndex = this.state.currentPropertyIndex - 1;
      this.setState({ currentPropertyIndex: currentPropertyIndex })
      this.setAlertValues(currentPropertyIndex);
    }

  }

  lowAlertBackArrow(propertyName, sensorIndex) {
    var lowAlertValue = this.state.lowAlertValue - 1;
    this.setState({ lowAlertValue: lowAlertValue })
    this.lowalertClickedValue(propertyName, sensorIndex);
  }

  lowAlertNextArrow(propertyName, sensorIndex) {
    var lowAlertValue = this.state.lowAlertValue + 1;
    this.setState({ lowAlertValue: lowAlertValue })
    this.lowalertClickedValue(propertyName, sensorIndex);
  }

  async lowalertClickedValue(propertyName, sensorIndex) {
    console.log("debouncing low ---" + this.state.lowAlertValue);
    var sensor = this.state.sensors[sensorIndex];
    var payloadObj = {}
    payloadObj['gatewayId'] = sensor["gatewayId"]
    payloadObj['sensorId'] = sensor['sensorId']
    payloadObj['sensorName'] = sensor['device_name']
    payloadObj['deviceType'] = sensor['device_type']
    if (propertyName == Constant.TEMPERATURE) {
      sensor['thresholdValues']['lowTemp'] = this.state.lowAlertValue
      payloadObj['thresholdValues'] = { "lowTemp": this.state.lowAlertValue, "highTemp": this.state.highAlertValue }
    } else if (propertyName == Constant.CO2) {
      sensor['thresholdValues']['lowCO2'] = this.state.lowAlertValue
      payloadObj['thresholdValues'] = { "lowCO2": this.state.lowAlertValue, "highCO2": this.state.highAlertValue }
    } else if (propertyName == Constant.HUMIDITY) {
      sensor['thresholdValues']['lowHumidity'] = this.state.lowAlertValue
      payloadObj['thresholdValues'] = { "lowHumidity": this.state.lowAlertValue, "highHumidity": this.state.highAlertValue }
    }
    var payload = []
    payload.push(payloadObj);
    let url = Urls.RENAME_GATEWAY_SENSOR;
    console.log("payload for threshold update ---:" + JSON.stringify(payload));
    try {
      const response = await fetch(url, {
        method: "PUT", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        const msg = await response.json();
        const sesorList = this.state.sensors.slice()
        sesorList[sensorIndex] = sensor
        AsyncStorage.setItem('sensorList', JSON.stringify(sesorList)).then(() => {
          this.setState({ sensors: sesorList });
        }).catch((error) => {
          console.log('error in saving list of sensors to  local storage', error);
        })
      }
      else {
        console.log('error received from aws side');
      }
    } catch (err) {
      console.log('error received while updating threshold values');
    }

  }


  highAlertBackArrow(propertyName, sensorIndex) {
    var highAlertValue = this.state.highAlertValue - 1;
    this.setState({ highAlertValue: highAlertValue })
    this.highalertClickedValue(propertyName, sensorIndex);
  }

  highAlertNextArrow(propertyName, sensorIndex) {
    var highAlertValue = this.state.highAlertValue + 1;
    this.setState({ highAlertValue: highAlertValue })
    this.highalertClickedValue(propertyName, sensorIndex);
  }

  async highalertClickedValue(propertyName, sensorIndex) {
    console.log("debouncing low ---" + this.state.highAlertValue);
    var sensor = this.state.sensors[sensorIndex];
    var payloadObj = {}
    payloadObj['gatewayId'] = sensor["gatewayId"]
    payloadObj['sensorId'] = sensor['sensorId']
    payloadObj['sensorName'] = sensor['device_name']
    payloadObj['deviceType'] = sensor['device_type']
    if (propertyName == Constant.TEMPERATURE) {
      sensor['thresholdValues']['highTemp'] = this.state.highAlertValue
      payloadObj['thresholdValues'] = { "lowTemp": this.state.lowAlertValue, "highTemp": this.state.highAlertValue }
    } else if (propertyName == Constant.CO2) {
      sensor['thresholdValues']['highCO2'] = this.state.highAlertValue
      payloadObj['thresholdValues'] = { "lowCO2": this.state.lowAlertValue, "highCO2": this.state.highAlertValue }
    } else if (propertyName == Constant.HUMIDITY) {
      sensor['thresholdValues']['highHumidity'] = this.state.highAlertValue
      payloadObj['thresholdValues'] = { "lowHumidity": this.state.lowAlertValue, "highHumidity": this.state.highAlertValue }
    }
    var payload = []
    payload.push(payloadObj);
    let url = Urls.RENAME_GATEWAY_SENSOR;
    console.log("payload for threshold update ---:" + JSON.stringify(payload));
    try {
      const response = await fetch(url, {
        method: "PUT", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const msg = await response.json();
        const sesorList = this.state.sensors.slice()
        sesorList[sensorIndex] = sensor
        AsyncStorage.setItem('sensorList', JSON.stringify(sesorList)).then(() => {
          this.setState({ sensors: sesorList });
        }).catch((error) => {
          console.log('error in saving list of sensors to  local storage', error);
        })
      }
      else {
        console.log('error received from aws side');
      }
    } catch (err) {
      console.log('error received while updating threshold values');
    }

  }

  setAlertValues(currentPropertyIndex) {
    var propertyName = Constant.propertyList[currentPropertyIndex]
    if (propertyName == Constant.TEMPERATURE) {
      this.setState({ lowAlertValue: this.state.thresholdValues['lowTemp'] })
      this.setState({ highAlertValue: this.state.thresholdValues['highTemp'] })
    } else if (propertyName == Constant.CO2) {
      this.setState({ lowAlertValue: this.state.thresholdValues['lowCO2'] })
      this.setState({ highAlertValue: this.state.thresholdValues['highCO2'] })
    } else if (propertyName == Constant.HUMIDITY) {
      this.setState({ lowAlertValue: this.state.thresholdValues['lowHumidity'] })
      this.setState({ highAlertValue: this.state.thresholdValues['highHumidity'] })
    }
  }

  render() {
   
    let devicesList;
    let alertList;
    let unit;
    let propertyBackArrow;
    let propertyNextArrow;
    let sensorBackArrow;
    let sensorNextArrow;
    let livedata;
    if (Constant.propertyList[this.state.currentPropertyIndex] == Constant.TEMPERATURE) {
      unit = (<TouchableOpacity><Text style={{ color: "black", fontSize: RFPercentage(5.5), fontWeight: "bold" }}>F</Text></TouchableOpacity>);
    }

    else if (Constant.propertyList[this.state.currentPropertyIndex] == Constant.HUMIDITY) {
      unit = (<TouchableOpacity><Text style={{ color: "black", fontSize: RFPercentage(5.5), fontWeight: "bold" }}>%</Text></TouchableOpacity>);
    }

    if (this.state.currentPropertyIndex > 0) {
      propertyBackArrow = (<TouchableOpacity onPress={() => { this.propertyBackArrow() }}>
        <Image source={require('../../assets/images/backward.png')} style={styles.BackArrowIcon}></Image>
      </TouchableOpacity>);
    }

    if (this.state.currentPropertyIndex < Constant.propertyList.length - 1) {
      propertyNextArrow = (<TouchableOpacity onPress={() => { this.propertyNextArrow() }}>
        <Image source={require('../../assets/images/forward.png')} style={styles.NextArrowIcon}></Image>
      </TouchableOpacity>);
    }

    if (this.state.sensorCurrentIndex > 0) {
      sensorBackArrow = (<TouchableOpacity onPress={() => { this.sensorBackArrow() }}>
        <Image source={require('../../assets/images/backward.png')} style={styles.BackArrowIcon}></Image>
      </TouchableOpacity>);
    }

    if (this.state.sensorCurrentIndex < this.state.sensors.length - 1) {
      sensorNextArrow = (<TouchableOpacity onPress={() => { this.sensorNextArrow() }}>
        <Image source={require('../../assets/images/forward.png')} style={styles.NextArrowIcon}></Image>
      </TouchableOpacity>);
    }

    if (Constant.propertyList[this.state.currentPropertyIndex] == 'PIR') {
      alertList = (<View></View>);
    }

    else {
      alertList = (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '70%' }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.alertButton, { flexDirection: 'row' }]}>
                <TouchableOpacity onPress={() => { this.lowAlertBackArrow(Constant.propertyList[this.state.currentPropertyIndex], this.state.sensorCurrentIndex) }}>
                  <Image source={require('../../assets/images/backward.png')} style={styles.AlertBackArrowIcon}></Image>
                </TouchableOpacity>
                <Text style={styles.AlertbuttonText}>Low Alert</Text>
                <TouchableOpacity onPress={() => { this.lowAlertNextArrow(Constant.propertyList[this.state.currentPropertyIndex], this.state.sensorCurrentIndex) }}>
                  <Image source={require('../../assets/images/forward.png')} style={styles.AlertNextArrowIcon}></Image>
                </TouchableOpacity>
              </View>
              <Text style={styles.number}>{this.state.lowAlertValue}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.alertButton, { flexDirection: 'row' }]}>
                <TouchableOpacity onPress={() => { this.highAlertBackArrow(Constant.propertyList[this.state.currentPropertyIndex], this.state.sensorCurrentIndex) }}>
                  <Image source={require('../../assets/images/backward.png')} style={styles.AlertBackArrowIcon}></Image>
                </TouchableOpacity>
                <Text style={styles.AlertbuttonText}>High Alert</Text>
                <TouchableOpacity onPress={() => { this.highAlertNextArrow(Constant.propertyList[this.state.currentPropertyIndex], this.state.sensorCurrentIndex) }}>
                  <Image source={require('../../assets/images/forward.png')} style={styles.AlertNextArrowIcon}></Image>
                </TouchableOpacity>
              </View>
              <Text style={styles.number}>{this.state.highAlertValue}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', width: '30%', alignItems: 'center', alignContent: 'center', alignSelf: 'center', justifyContent: 'center' }}>
            {unit}
          </View>
        </View>
      );
    }
    if (this.state.sensors.length !== 0) {
      if((this.state.sensorLive[this.state.sensors[this.state.sensorCurrentIndex]['sensorId']][Constant.propertyList[this.state.currentPropertyIndex]]!= Constant.INITIAL_MSG) &&(Constant.propertyList[this.state.currentPropertyIndex]==Constant.TEMPERATURE))
      {
        livedata = unit = (<Text style={{ color: "black", fontSize: RFPercentage(2.5), fontWeight: "bold" }}>F</Text>);
      }else if((this.state.sensorLive[this.state.sensors[this.state.sensorCurrentIndex]['sensorId']][Constant.propertyList[this.state.currentPropertyIndex]]!= Constant.INITIAL_MSG) &&(Constant.propertyList[this.state.currentPropertyIndex]==Constant.HUMIDITY))
      {
        livedata = unit = (<Text style={{ color: "black", fontSize: RFPercentage(2.5), fontWeight: "bold" }}>%</Text>);
      }
    }
    if (this.state.sensors.length !== 0) {
      devicesList = (
        <ScrollView contentContainerStyle={styles.inputContainer}>
          <View style={{ marginVertical: height * 0.05 }}>
            <View style={[styles.roundButton, { flexDirection: 'row' }]}>
              {sensorBackArrow}
              <Text style={styles.buttonText}>{this.state.sensors[this.state.sensorCurrentIndex]['device_name']}</Text>
              {sensorNextArrow}
            </View>
            <View style={[styles.roundButton, { flexDirection: 'row' }]}>
              {propertyBackArrow}
              <Text style={styles.buttonText}>{Constant.propertyList[this.state.currentPropertyIndex]}</Text>
               {propertyNextArrow}
            </View>
            <View style={{ marginVertical: height * 0.01 }}>
              <View style={{flexDirection:'row',alignItems:'center',alignSelf:'center',alignContent:'center'}}>
                <View>
                <Text style={{ fontSize: RFPercentage(2.5),fontWeight: "bold",color: "black"}}>Current value : {this.state.sensorLive[this.state.sensors[this.state.sensorCurrentIndex]['sensorId']][Constant.propertyList[this.state.currentPropertyIndex]]}</Text>
                </View>
                <View style={{marginHorizontal: width * 0.02}}>{livedata}</View>
              </View>
              
              <View style={{ flexDirection: 'column', width: (width * 0.95), height: (height * 0.33), marginVertical: height * 0.01 }}>
                {this.showData()}
              </View>
            </View>
            {alertList}
          </View>
        </ScrollView>

      );

    }
    else {
      devicesList = (
        <ScrollView contentContainerStyle={styles.activityIndicator}>
          <Text color="#00ff00">No Sensors found.</Text>
        </ScrollView>
      );
    }
    return (

      <View style={styles.container}>
        <View style={styles.greenBackgroundContainer} />
        <View style={styles.titleTextContainer}>
          <View style={{ width: '60%' }}><Text style={styles.titleText}> Sensor View</Text></View>

          <View style={{ width: '40%', flexDirection: 'row', alignItems: 'flex-end', alignContent: 'flex-end', alignSelf: 'flex-end', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => { this.openSettingsPage() }}>
              <Image source={require('../../assets/images/setting1.png')} style={styles.settingIcon} ></Image>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { this.openDashboardPage() }}>
              <Image source={require('../../assets/images/home1.png')} style={styles.homeIcon} ></Image>
            </TouchableOpacity>
          </View>

        </View>
        {devicesList}
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
    number: {
      color: "black",
      fontSize: RFPercentage(3.5),
      marginHorizontal: width * 0.03,
      fontWeight: "bold",
      alignSelf: 'center',
      alignItems: 'center',
      textAlign: 'center'

    },
    settingIcon: {
      height: height * 0.04,
      width: width * 0.08,
      marginHorizontal: width * 0.03
      // marginLeft:width*0.02
    },
    BackArrowIcon: {
      height: height * 0.05,
      width: width * 0.07,
      // marginHorizontal:width * 0.03
      marginLeft: width * 0.02
    },
    NextArrowIcon: {
      height: height * 0.05,
      width: width * 0.07,
      marginRight: width * 0.02
      //marginHorizontal:width * 0.03,
    },
    AlertBackArrowIcon: {
      height: height * 0.04,
      width: width * 0.06,
      // marginHorizontal:width * 0.03
      marginLeft: width * 0.02
    },
    AlertNextArrowIcon: {
      height: height * 0.04,
      width: width * 0.06,
      marginRight: width * 0.02
      //marginHorizontal:width * 0.03,
    },
    homeIcon: {
      height: height * 0.045,
      width: width * 0.068,
      marginHorizontal: width * 0.03
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
    WebViewStyle: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    listContainer: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: Constant.WHITE_BACKGROUND_COLOR,
      marginLeft: '5%',
      marginRight: '5%',
      marginTop: height * 0.065,
      borderRadius: 5,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: "center"
    },
    roundButton: {
      justifyContent: "center",
      backgroundColor: Constant.RED_COLOR,
      padding: 6,
      borderRadius: 8,
      alignItems: "center",
      alignSelf: "center",
      marginVertical: height * 0.01,
      //marginRight: 12,
      height: width * 0.14,
      width: width * 0.7
    },
    flatlist: {
      width: (width * 0.8) + 5,
    },
    alertButton: {
      justifyContent: "center",
      backgroundColor: Constant.RED_COLOR,
      padding: 6,
      borderRadius: 8,
      alignItems: "center",
      alignSelf: "center",
      marginLeft: width * 0.04,
      marginVertical: height * 0.01,
      height: width * 0.13,
      width: width * 0.5
    },
    addNewButton: {
      backgroundColor: Constant.ADD_NEW_GATEWAY_BUTTON_COLOR,
    },
    registerButton: {
      backgroundColor: Constant.RED_COLOR,
    },
    cancelButton: {
      margin: 10,
      marginLeft: 15,
      backgroundColor: Constant.RED_COLOR
    },
    buttonText: {
      flex: 1,
      fontSize: RFPercentage(3.0),
      color: Constant.WHITE_TEXT_COLOR,
      fontWeight: "bold",
      textAlign: 'center'
    },
    AlertbuttonText: {
      flex: 1,
      fontSize: RFPercentage(2.5),
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
      height: 50,
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


export default connect()(HistoricalChart);
