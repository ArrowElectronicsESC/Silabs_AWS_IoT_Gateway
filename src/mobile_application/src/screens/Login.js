import React from "react"
import { StyleSheet,Dimensions, Text, View,Button,AsyncStorage,ActivityIndicator } from "react-native"
import Amplify from '@aws-amplify/core';
import Auth from '@aws-amplify/auth';
import config from "../../aws-exports"
import App from "../../App";
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";
import * as Urls from '../Urls';
// New ----
import { AmplifyTheme } from 'aws-amplify-react-native';
import { withAuthenticator } from "aws-amplify-react-native"
import * as Constant from '../Constant';

const {width,height} = Dimensions.get('window');


//Amplify.configure(config)
Amplify.configure({
  ...config,
  Analytics: {
    disabled: true,
  },
});

const new_theme = {
  ...AmplifyTheme,

  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    width: '100%',
    marginTop: '2%',
  },

  button: {
    alignItems: 'center',
    padding: '1%',
    backgroundColor: Constant.RED_COLOR,
    marginTop: height * 0.03,
  },

  buttonText: {
      fontSize: RFPercentage(2.5),
      textAlign: 'center',
      color: Constant.WHITE_TEXT_COLOR,
  },
  errorRowText: {
  		fontSize: RFPercentage(1.9),
  	},

   inputLabel: {
      marginTop: height * 0.01,
      fontSize: RFPercentage(2),
      color: Constant.BLACK_COLOR,
    },
   input: {
      margin: height * 0.01,
      marginTop:height * 0.02,
      height: height * 0.05,
      borderColor: '#D3D3D3',
      backgroundColor: '#FFFFFF',
      borderWidth: 3,
      padding: '1%',
      fontSize : RFPercentage(1.6),
   },
   phoneInput: {
         margin: height * 0.01,
         marginTop:height * 0.02,
         height: height * 0.05,
         width: width * 0.56,
         borderColor: '#D3D3D3',
         backgroundColor: '#FFFFFF',
         borderWidth: 3,
         padding: '1%',
         fontSize : RFPercentage(1.6),
   },
   picker: {
    ...AmplifyTheme.picker,
   		height: height * 0.05,
   		marginLeft : width * 0.040,
   		margin: height * 0.01,
   		marginTop:height * 0.02,

   	},
   buttonDisabled: {
   	...AmplifyTheme.buttonDisabled,
   	    alignItems: 'center',
        padding: '1%',
        marginTop: height * 0.03,
        backgroundColor: Constant.GREY_OUT_RED_COLOR,
   	},

    sectionHeaderText:
    {
        ...AmplifyTheme.sectionHeaderText,
       fontSize : RFPercentage(2.5),
    },

    sectionFooterLink: {
         ...AmplifyTheme.sectionFooterLink,
		fontSize: RFPercentage(1.8),
		color: Constant.GREY_OUT_RED_COLOR,

	},
	sectionFooterLinkDisabled: {
	        ...AmplifyTheme.sectionFooterLinkDisabled,
    		fontSize: RFPercentage(1.8),
    		color: Constant.GREY_OUT_RED_COLOR,
    },
}


class Login extends React.Component {
 state = {
     isLoading: true
   };

async componentDidMount() {
    const userInfo = await Auth.currentAuthenticatedUser();

    let email=JSON.stringify(userInfo.signInUserSession.idToken.payload.email.trim());
    let phNumber = JSON.stringify(userInfo.signInUserSession.idToken.payload.phone_number);
    let url = Urls.GET_USER+userInfo.signInUserSession.idToken.payload.email;
    let gatewaylist=[];
    let sensorlist=[];

    try{
        const response = await fetch(url,{ method: "GET",headers: {'Accept': 'application/json','Content-Type' : 'application/json' }})
        if(response.ok)
          {
            const result = await response.json();
            AsyncStorage.setItem('listGateway',JSON.stringify(result['gateways']));
            AsyncStorage.setItem('sensorList',JSON.stringify(result['sensors']));
           if(result['gateways'].length !== 0)
           {
                AsyncStorage.setItem('emailNotify',JSON.stringify(JSON.parse(result['gateways'][0].sendEmailNotifications) === true ? 'ON' : 'OFF'));
                AsyncStorage.setItem('SmsNotify',JSON.stringify(JSON.parse(result['gateways'][0].sendSmsNotifications) === true ? 'ON' : 'OFF'));
           }
           else
           {
                AsyncStorage.setItem('emailNotify',JSON.stringify('OFF'));
                AsyncStorage.setItem('SmsNotify',JSON.stringify('OFF'));
           }
          }
        else
         {
            AsyncStorage.setItem('listGateway',JSON.stringify(gatewaylist));
            AsyncStorage.setItem('sensorList',JSON.stringify(sensorlist));
           alert('Error occured while featching user info');
         }
        AsyncStorage.setItem('email',email);
        AsyncStorage.setItem('number',phNumber);
        AsyncStorage.setItem('accessToken',JSON.stringify(userInfo.signInUserSession.accessToken.jwtToken)).then((token) => {
            this.setState({
            isLoading: false
        }); App();
        }).catch((error) => {
              console.log('error in saving name', error);

        })
       }catch(err)
      {
        console.log(err.message);
      }
   }

   ActivityIndicatorLoadingView() {
    return (
      <View style={styles.activityIndicator}>
        <ActivityIndicator size="large" color={Constant.RED_COLOR} /><Text style={{ margin: 4, fontWeight: "bold" }}>Loading...</Text>
      </View>
    );
  }

   render() {
     if (this.state.isLoading) {
      return this.ActivityIndicatorLoadingView();
     }
     // this is the content you want to show after the promise has resolved
     return <View/>;
   }
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Constant.LIGHT_GREY_COLOR,
		alignItems: "center",
		justifyContent: "center"
  } ,
  activityIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
})

// New ----
export default withAuthenticator(Login, includeGreetings = false,authenticatorComponents = [], federated = null, theme = new_theme, signUpConfig = {})
