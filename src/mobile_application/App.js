
import GrowAreasScreen from './src/screens/GrowAreas';
import DevicesScreen from './src/screens/Devices';
import LoginScreen from './src/screens/Login';
import SideDrawer from './src/screens/SideDrawer';
import SettingsScreen from './src/screens/Settings';
import HistoricalChart from './src/screens/HistoricalChart';
import { AsyncStorage, Alert } from 'react-native';
import { Navigation } from 'react-native-navigation';
import * as Constant from './src/Constant';
import { debug, allowExceptionsInDevMode } from './app.json';
import configureStore from "./src/store/configureStore";
import { Provider } from "react-redux";
import Icon from 'react-native-vector-icons/Ionicons';
import RNRestart from 'react-native-restart'; // Import package from node modules 
import Dashboard from './src/screens/Dashboard';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import { Platform } from 'react-native';
import { RFPercentage, RFValue } from "react-native-responsive-fontsize";


let tabCount = 0;
let position = false;



const store = configureStore();

Navigation.registerComponentWithRedux('GrowAreasScreen', () => GrowAreasScreen, Provider, store);

Navigation.registerComponentWithRedux('DevicesScreen', () => DevicesScreen, Provider, store);

Navigation.registerComponentWithRedux('LoginScreen', () => LoginScreen, Provider, store);

Navigation.registerComponentWithRedux('SideDrawer', () => SideDrawer, Provider, store);

Navigation.registerComponentWithRedux('DashboardScreen', () => Dashboard, Provider, store);

Navigation.registerComponentWithRedux('Chart', () => HistoricalChart, Provider, store);

Navigation.registerComponentWithRedux('SettingsScreen', () => SettingsScreen, Provider, store);



const forceAppQuit = false;
const executeDefaultHandler = true;

const jsExceptionhandler = (error, isFatal) => {
  if (isFatal) {
    console.log("\n\n\n\n\nJSExceptionHandler:" + error);
  } else {
    console.log("\n\n\n\n\nJSExceptionHandler:" + error); // So that we can see it in the ADB logs in case of Android if needed
  }
  // This is your custom global error handler
  // You do stuff like show an error dialog
  // or hit google analytics to track crashes
  // or hit a custom api to inform the dev team.
};
setJSExceptionHandler(jsExceptionhandler, allowExceptionsInDevMode);
// - exceptionhandler is the exception handler function
// - allowInDevMode is an optional parameter is a boolean.
//   If set to true the handler to be called in place of RED screen
//   in development mode also.

const nativeExceptionhandler = exceptionString => {
  console.log("\n\n\n\n\nNative Exception:" + exceptionString);
  return {}
  // This is your custom global error handler
  // You do stuff likehit google analytics to track crashes.
  // or hit a custom api to inform the dev team.
  //NOTE: alert or showing any UI change via JS
  //WILL NOT WORK in case of NATIVE ERRORS.
};

setNativeExceptionHandler(
  nativeExceptionhandler,
  forceAppQuit,
  executeDefaultHandler
);

// - exceptionhandler is the exception handler function
// - forceAppQuit is an optional ANDROID specific parameter that defines
//    if the app should be force quit on error.  default value is true.
//    To see usecase check the common issues section.
// - executeDefaultHandler is an optional boolean (both IOS, ANDROID)
//    It executes previous exception handlers if set by some other module.
//    It will come handy when you use any other crash analytics module along with this one
//    Default value is set to false. Set to true if you are using other analytics modules.


export default (pageIndex) => {
  Navigation.setDefaultOptions({
    bottomTabs: {
      hideShadow: true,
      backgroundColor: 'white'
    },
    layout: {
      orientation: 'portrait'
    }
  });
  Promise.all([
    AsyncStorage.getItem('accessToken'),
    Icon.getImageSource("ios-menu", 30)
  ]).then(sources => {
    if (!sources[0]) {
      Navigation.setRoot({
        root: {
          component: {
            name: 'LoginScreen'
          }
        }
      });

    } else {
      startTABBasedNavigation(pageIndex, sources[1]);

    }
  });
}


const startTABBasedNavigation = (pageIndex, iconSrc) => {
  let index = pageIndex ? pageIndex : 0;
  Navigation.setRoot({
    root: {
      sideMenu: {
        id: 'SideMenu',
        left: {
          component: {
            id: 'sideDrawer',
            name: 'SideDrawer',
          },
        },
        center: {
          root: {

          },
          bottomTabs: {
            id: 'BottomTabsId',
            children: [
             
              {
                stack: {
                  id: 'CONTAINER',
                  children: [{
                    component: {
                      name: 'DashboardScreen',
                      options: {
                        bottomTab: {
                          icon: require('./assets/images/home.png'),
                          iconColor:'#000000',
                        },
                        popGesture: true,
                        sideMenu: {
                          left: {
                            visible: false,
                          }

                        }
                      }
                    }
                  }]
                }
              },
            ],
            options: {
              bottomTabs: {
                hideShadow: true,
                visible:false,
                currentTabIndex: index,
                backgroundColor: 'white'

              },
              popGesture: true,
              topBar: {
                visible: false,
               hideOnScroll: true,
                drawBehind: true,
                background: {
                  color: Constant.PRIMARY_COLOR,
                },
              },
              layout: {
                orientation: ['portrait'] // An array of supported orientations
              },
            },
          },
        },
      },
    },
    options: {
      layout: {
        orientation: ['portrait'],
      },
    }
  });
}

Navigation.events().registerBottomTabSelectedListener(async (res) => {
  let currentTabIndex = 0;
  try {
    tabCount++;
    setTimeout(() => {
      tabCount = 0;
    }, 1000)
    if (tabCount === 2) {
      tabCount = 0;
      if (res.selectedTabIndex === res.unselectedTabIndex) {
        currentTabIndex = res.selectedTabIndex;        
        await Navigation.popToRoot(Constant.rootStack[res.selectedTabIndex]);
      }
    }
  } catch (error) {
    if (error.message === 'Nothing to pop') {
      Icon.getImageSource("ios-menu", 30).then((src) => {
        startTABBasedNavigation(currentTabIndex, src);
      });
    }
  }
});


Navigation.events().registerNavigationButtonPressedListener((res) => {
  position = !position
  Platform.OS === 'ios' ?
    Navigation.mergeOptions(res.componentId, {
      sideMenu: {
        left: {
          visible: position,
          enabled: false,
        }
      }
    })
    :
    Navigation.mergeOptions(res.componentId, {
      sideMenu: {
        left: {
          visible: true,
          enabled: true
        }
      }
    })
})