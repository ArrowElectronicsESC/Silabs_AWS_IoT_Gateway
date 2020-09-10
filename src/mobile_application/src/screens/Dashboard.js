import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator,Dimensions,ImageBackground,
  Platform, AsyncStorage,Image,TouchableOpacity
} from 'react-native';
import * as Constant from '../Constant';
import { connect } from 'react-redux';
import Slide from './SlideComponent';
import {
  getDashboardCount, getAlerts
} from '../store/actions/rootActions';
import Swiper from 'react-native-swiper';
import { Navigation } from 'react-native-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
const {width,height} = Dimensions.get('window');
class Dashboard extends Component {

  static get options() {
    return Constant.DEFAULT_NAVIGATOR_STYLE
  }

  constructor(props) {
    super(props);
    Navigation.events().bindComponent(this);
    this.eventSubscription = Navigation.events().registerNavigationButtonPressedListener(this.MenuIconPrressed);
    this.state = {
      token: '',
      sideMenuVisible: false
    };
  }

  componentDidAppear() {
    AsyncStorage.getItem('accessToken').then((authToken) => {
      this.setState({ token: authToken });
    })
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
   // }
  }

  renderPage() {
    
      return (
        <View style={styles.listItem}>
          <ActivityIndicator size='large' />
        </View>)
  }
  openSettingPage = () =>
  {
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
            height:44,
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
            height:44,
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
             <View style={{width:'40%' ,flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>
                <TouchableOpacity  onPress={() => {this.openSettingPage()}}>
                     <Image source={ require('../../assets/images/setting.png')} style={styles.settingIcon}/>
                </TouchableOpacity>
             </View>

             <ImageBackground
                source={require('../../assets/images/title_logo.png')} style={{ width: width * 0.9, marginTop: '2%', marginBottom: '5%',marginLeft:(width * 0.1),padding : '1%',height : (width * 0.7) * 0.45}}>
               </ImageBackground>
             <Text style={[styles.dashboardTitleText, { marginLeft: 0 }]}> EFR32 {"\n"}IoT {"\n"}Gateway</Text>
             <View style={{ flexDirection: 'column',marginLeft:(width*0.15),marginTop:(width*0.2)}}>
              <TouchableOpacity style={[styles.DashboardroundButton]} onPress={() => {this.openSensorViewPage()}}>
                <Text style={[styles.dashboardButtonText, { marginLeft: 0 }]}>SENSOR VIEW</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.DashboardroundButton]} onPress={() => {this.openGatewayPage()}}>
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
   // backgroundColor: Constant.PRIMARY_COLOR,
    backgroundColor: Constant.LIGHT_GREY_COLOR,
    width: '100%',
    height: '25%',
    position: 'absolute',
  },
  drawerItemIcon: {
   // marginRight: '5%',
    marginLeft:(width * 0.9),
    height:  (width * 0.7) * 0.09,
    width : (width * 0.7) * 0.09
},
settingIcon: {
  height: height * 0.04,
  width: width * 0.08,
  marginHorizontal:width * 0.03
},
  DashboardroundButton: {
    flexDirection: 'column',
    justifyContent: "center",
    alignItems: 'center',
    padding: 5,
    borderRadius: 16,
    marginRight: 12,
    marginTop:10,
    width: width * 0.7,
    height:width * 0.15,
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

export default Dashboard;
