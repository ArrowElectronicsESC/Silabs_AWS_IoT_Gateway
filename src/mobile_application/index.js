import App from './App';
import { Navigation } from "react-native-navigation";

console.disableYellowBox = true;
Navigation.events().registerAppLaunchedListener(() => {
    App();
});