import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator,Dimensions,ImageBackground,
  Platform, AsyncStorage,Image,TouchableOpacity,Button,Alert
} from 'react-native';
import { connect } from 'react-redux';
import Slide from './SlideComponent';
import * as Constant from '../Constant';
import { Navigation } from 'react-native-navigation';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
const {width,height} = Dimensions.get('window');
import Auth from '@aws-amplify/auth';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import * as Urls from '../Urls';
import { uiStartLoading,uiStopLoading } from '../store/actions/rootActions';
import  DialogInput  from 'react-native-dialog-input-custom';


class Settings extends Component {

  static get options() {
    return Constant.DEFAULT_NAVIGATOR_STYLE

  }


  constructor(props) {
    super(props);
    Navigation.events().bindComponent(this);
    this.eventSubscription = Navigation.events().registerNavigationButtonPressedListener(this.MenuIconPrressed);
    this.state = {
        token: '',
        pressedButton: '',
        sideMenuVisible: false,
        gateways: [],
        isVisible: false,
    };
  }

  componentDidAppear() {
        AsyncStorage.multiGet(['accessToken','email','number','listGateway','emailNotify','SmsNotify']).then(response => {
          let token = response[0][1];
          let email = JSON.parse(response[1][1]);
          let number =JSON.parse(response[2][1]);
          let gateways = JSON.parse(response[3][1]);
          let emailNotify = JSON.parse(response[4][1]);
          let SmsNotify = JSON.parse(response[5][1]);

          this.setState({ token,email,number,gateways,emailNotify,SmsNotify}, () => {
          });
        }).catch((e) => {
          console.log('error in getting asyncStorage\'s item:', e.message);
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


  signOut = async () => {
      await Auth.signOut()
      AsyncStorage.multiRemove(['accessToken','listGateway','sensorList']).then(()=> {
          console.log('successfully logged out');
        }).catch((error) => {
             console.log('error in removing account', error);
        })

      this.setState({
                  signOutLoading: true,
                  imageUrl: '',
                 name: '',
                  email: ''
             });
      Navigation.setRoot({
                  root: {
                      component: {
                          name: 'LoginScreen'
                      },
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

  openSensorPage = () => {
       let screenName = 'DevicesScreen';

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

   async updateNotificationValue (notifyVal,notifyString)
   {

     this.props.uiStartLoading("Updating State for Notification....");

      let gatewayId = this.state.gateways[0].gatewayId;
      let gatewayName = this.state.gateways[0].gatewayName;
      let url = Urls.RENAME_GATEWAY_SENSOR;
      let updatedEmailNotifyValue = '';
      let updatedNumberNotifyValue = '';

      if (notifyString === 'email')
      {
        updatedEmailNotifyValue = this.state.emailNotify === 'ON' ? false : true;
        updatedNumberNotifyValue = this.state.SmsNotify === 'OFF' ? false : true;

      }
      else
      {
        updatedEmailNotifyValue = this.state.emailNotify === 'OFF' ? false : true;
        updatedNumberNotifyValue = this.state.SmsNotify === 'ON' ? false : true;
      }

      let payload = [{"gatewayId":gatewayId,"gatewayName":gatewayName,"deviceType":Constant.GATEWAY_TYPE, "sendEmailNotifications": updatedEmailNotifyValue ,"sendSmsNotifications":updatedNumberNotifyValue}]
      console.log("payload for Notify update ---:"+JSON.stringify(payload));
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

           this.props.uiStartLoading("Updating State for Notification....");

           if(notifyString === 'email') this.state.emailNotify === 'ON' ? this.setState({emailNotify:'OFF'}) : this.setState({emailNotify:'ON'});
           else this.state.SmsNotify === 'ON' ? this.setState({SmsNotify:'OFF'}) : this.setState({SmsNotify:'ON'});
           AsyncStorage.setItem('emailNotify',JSON.stringify(this.state.emailNotify));
           AsyncStorage.setItem('SmsNotify',JSON.stringify(this.state.SmsNotify));
           this.props.uiStopLoading();


   }

  showModal = () => {
     this.state.isVisible = !this.state.isVisible;
     this.forceUpdate();
 }

 async updatePhNumber(value)
 {
      let regEx = /^[+][0-9]*$/;

     if (!value || value.trim() === '' || value.length < 4 || value.length > 15 || !regEx.test(value.trim()))
     {
         Alert.alert("Please enter valid Mobile number.", 'It should be 13 digit number including first "+" sign and Country Code.');
         return null;
     }
     this.props.uiStartLoading('Updating Number...');
     let user = await Auth.currentAuthenticatedUser();
     let params = {};
     params['phone_number'] = value;
     let result = await Auth.updateUserAttributes(user, params);
     if(result.toLowerCase() === Constant.BLE_RESPONSE_STATUS)
     {
        AsyncStorage.setItem('number',JSON.stringify(value));
        this.setState ({number:value});
        this.props.uiStopLoading();
     }
     else
     {
        this.props.uiStopLoading();
        alert("Error updating Number");
      }

 }

   render() {
     if (this.props.isLoading) {
          return(
                <View style={styles.activityIndicator}><ActivityIndicator size="large" color={Constant.RED_COLOR} />
                <Text style={{ margin: 4, fontWeight: "bold" }}>{this.props.isMessage}</Text>
                </View>
             );
     }

     else
     {
      if(this.state.gateways.length !== 0)
      {
          emailView = ( <View>
                            <TouchableOpacity style={styles.buttonView} onPress ={() => {
                                this.updateNotificationValue (this.state.emailNotify,'email')
                            }}>
                            <Text style={[styles.emailText,{textAlign: 'center',marginTop: '12%'}]}>{this.state.emailNotify}</Text>
                             </TouchableOpacity>
                        </View>
                      );
          smsView = (
                     <View style={{width:'60%',flexDirection:'row'}}>
                      <TouchableOpacity onPress={() => {this.showModal()}}>
                        <MaterialIcon name="edit" size={width * 0.056} style={{ paddingLeft: '12%',paddingTop: '12%', color: '#fff',height : width * 0.1,marginLeft: width * 0.09,width : width * 0.1,backgroundColor: Constant.RED_COLOR,borderRadius: 10,marginTop: '8%'}} />
                      </TouchableOpacity>
                        <TouchableOpacity  style={styles.buttonViewWithEdit} onPress ={() => {
                            this.updateNotificationValue (this.state.SmsNotify,'phoneNo')
                        }}>
                             <Text style={[styles.emailText,{textAlign: 'center',marginTop: '12%'}]}>{this.state.SmsNotify}</Text>
                        </TouchableOpacity>
                     </View>

          );
      }
      else
      {
           emailView = (
            <View style = {styles.buttonView}>
                 <Text style={[styles.emailText,{textAlign: 'center',marginTop: '12%'}]}>{this.state.emailNotify}</Text>
             </View>
           );
           smsView = (
                      <View style={{width:'60%',flexDirection:'row'}}>
                       <TouchableOpacity onPress={() => {this.showModal()}}>
                         <MaterialIcon name="edit" size={width * 0.056} style={{ paddingLeft: '12%',paddingTop: '12%', color: '#fff',height : width * 0.1,marginLeft: width * 0.09,width : width * 0.1,backgroundColor: Constant.RED_COLOR,borderRadius: 10,marginTop: '8%'}} />
                       </TouchableOpacity>
                       <View style={styles.buttonViewWithEdit}>
                        <Text style={[styles.emailText,{textAlign: 'center',marginTop: '12%'}]}>{this.state.SmsNotify}</Text>
                       </View>
                      </View>

           );

      }

      return (
        <View style={styles.container}>
        <View style={styles.greenBackgroundContainer} />
        <View style={styles.titleTextContainer}>
          <View style={{width:'60%'}}><Text style={styles.titleText}>Settings</Text></View>

          <View style={{width:'40%',flexDirection:'row',alignItems:'flex-end',alignContent:'flex-end',alignSelf:'flex-end',justifyContent:'flex-end'}}>
            <TouchableOpacity onPress={() => {this.signOut()}}>
            <Image source={ require('../../assets/images/signout.png')} style={[styles.signOutIcon,{marginBottom: '6%'}]} ></Image>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {this.openDashboardPage() }}>
            <Image source={ require('../../assets/images/home1.png')} style={[styles.homeIcon,{marginBottom: '6%'}]} ></Image>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.squareRound}>
            <Text style={styles.text}>Notifications</Text>
            <View style= {styles.rectangle}>
                <Text style={styles.emailText}>Email : </Text>
                 <Text style={[styles.emailText,{marginTop: '0.5%'}]}>{this.state.email}</Text>
            </View>
            {emailView}
            <View><Text style= {styles.tapText}>(Data Charges may apply)</Text></View>
            <View style= {[styles.rectangle,{marginTop: '1%'}]}>
                 <Text style={[styles.emailText,{padding: (0,0,5,5)}]}>Text : </Text>
                 <Text style={[styles.emailText,{marginTop: '0.5%'}]}>{this.state.number}</Text>
            </View>
            {smsView}
             <DialogInput
                         dialogIsVisible={this.state.isVisible}
                         closeDialogInput={() => {this.showModal()}}
                         submitInput={(textValue) => this.updatePhNumber(textValue)}
                         outerContainerStyle={{ backgroundColor: '#737373',opacity: 0.8}}
                         containerStyle={{ backgroundColor: '#d91f2b', borderColor: 'black', borderWidth: 2}}
                         titleStyle={{ color: 'white',fontSize : RFPercentage(3) }}
                         title="Mobile Number"
                         subTitleStyle={{ color: 'white' }}
                         subtitle="Update your Number"
                         placeholderInput= " "
                         placeholderTextColor="white"
                         textInputStyle={{ borderColor: 'white',color: 'black', borderWidth: 2,fontStyle: 'bold',fontSize : RFPercentage(2)  }}
                         secureTextEntry={false}
                         buttonsStyle={{ borderColor: 'white' }}
                         textCancelStyle={{ color: 'white',fontSize: RFPercentage(2.5) }}
                         submitTextStyle={{ color: 'white', fontStyle: 'bold',fontSize: RFPercentage(2.5)}}
                         cancelButtonText="CANCEL"
                         submitButtonText="SUBMIT"
              />
        </View>
        <View style= {[styles.rectangle,{width: width * 0.6,marginLeft: '20%',marginTop: width * 0.135,height: height * 0.06}]}>
          <TouchableOpacity onPress={() => {this.openGatewayPage()}}>
             <Text style={[styles.emailText,{marginTop: '4.5%'}]}>Configure Gateway</Text>
          </TouchableOpacity>
        </View>

        <View style= {[styles.rectangle,{width: width * 0.6,marginLeft: '20%',marginBottom: height * 0.02,height: height * 0.06}]}>
          <TouchableOpacity onPress={() => {this.openSensorPage()}}>
             <Text style={[styles.emailText,{marginTop: '4.5%'}]}>Configure Sensors</Text>
          </TouchableOpacity>
          <View></View>
        </View>
      </View>

      );
    }
    }
}

const styles = StyleSheet.create({
  container: {
   flex: 1,
   flexDirection: 'column',
   backgroundColor: Constant.LIGHT_GREY_COLOR
  },
  titleTextContainer: {
     flexDirection: 'row',
     alignItems: "center",
   },
  greenBackgroundContainer: {
     backgroundColor: Constant.RED_COLOR,
     width: '100%',
     height: height * 0.085,
     position: 'absolute'
   },
  squareRound:
   {
     borderWidth: 3,
     borderRadius: 50,
     marginTop: '15%',
     marginRight: height * 0.05,
     marginLeft: height * 0.05,
     borderColor: Constant.RED_COLOR,
     height: height * 0.49,
   },
   rectangle:
   {
       borderRadius: 20,
       backgroundColor: Constant.RED_COLOR,
       marginTop: '4%',
       marginRight: height * 0.03,
       marginLeft: height * 0.03,
       height: height * 0.11,

   },
   text:
   {
      flexDirection: 'row',
      color: Constant.BLACK_COLOR,
      fontSize: RFPercentage(4),
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: '1%',

   },
   tapText:
   {
       color: Constant.BLACK_COLOR,
       fontSize: RFPercentage(2.5),
       textAlign: 'center',
       marginTop: '5%',
   },
   buttonViewWithEdit:
   {
      backgroundColor: Constant.RED_COLOR,
      width: width * 0.15,
      height: width * 0.1,
      borderRadius: 10,
      marginTop: '4%',
      marginBottom: '0.05%',
      marginLeft: width * 0.35,

   },
   buttonView:
   {
         backgroundColor: Constant.RED_COLOR,
         width: width * 0.15,
         height: width * 0.1,
         borderRadius: 10,
         marginLeft: width * 0.54,
         marginTop: '2.5%',
         marginBottom: '0.05%'
   },
   emailText:
   {
        flexDirection: 'row',
        color: Constant.WHITE_COLOR,
        fontSize: RFPercentage(2.5),
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: '3%',
   },
  titleText: {
    fontSize: RFPercentage(4.5),
    color: Constant.WHITE_TEXT_COLOR,
    fontWeight: "bold",
    marginLeft: width * 0.03,
  },
  signOutIcon: {
    height: height * 0.04,
    width: width * 0.068,
    marginHorizontal:width * 0.03
  },
  homeIcon: {
    height: height * 0.045,
    width: width * 0.068,
    marginHorizontal:width * 0.03
  },

   Button: {
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

  ButtonText: {
      fontSize: 19,
      marginLeft: 7,
      color: Constant.WHITE_COLOR,
      fontWeight: "bold",
      textAlign: 'center'
    },
    activityIndicator: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      color : Constant.RED_COLOR,
    },
  });

mapStatesToProps = state => {
  return {
    isLoading: state.ui.isLoading,
    isMessage: state.ui.isMessage
  }
};

mapDispatchToProps = dispatch => {


  return {
    uiStartLoading : (message) => dispatch(uiStartLoading(message)),
    uiStopLoading : () => dispatch(uiStopLoading())
  }
};

  export default connect(mapStatesToProps, mapDispatchToProps)(Settings);