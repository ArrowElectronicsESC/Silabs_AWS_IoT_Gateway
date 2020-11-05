import App from './App';
import {name as appName} from './app.json';
import { Navigation } from "react-native-navigation"

Navigation.registerComponent(appName, () => App);
Navigation.events().registerAppLaunchedListener(() => {
    App();
});