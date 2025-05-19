/**
 * @format
 */
import 'react-native-gesture-handler'; // 👈 must come first
import 'react-native-reanimated'; // 👈 recommended second
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
