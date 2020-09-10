import React, { Component } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions
} from "react-native";
import * as Constant from '../Constant';



class Slide extends Component {

    render() {
        let screenWidth = Dimensions.get('window').width;
        console.log(Object.keys({ '1': '1' }), 'json log', this.props.properties, typeof (this.props.properties));

        let h = Dimensions.get('window').height;
        return (
            <View style={{ flex: 1, alignItems: 'center', alignContent: 'center', justifyContent: 'flex-start', borderWidth: 0.5, borderColor: '#dddddd', width: (screenWidth - 20), backgroundColor: '#fff' }}>

                <View style={{ flexDirection: 'column', marginLeft: '-5%', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '1%', }}>
                    <Text style={{ color: '#000', marginTop: '1%', alignSelf: 'center' }}> {this.props.gatewayName} </Text>
                    <Text style={{ color: Constant.PRIMARY_COLOR, alignSelf: 'center', marginTop: '1%' }}>{this.props.alertName}</Text>

                </View>
                <View style={{ height: 2, width: '100%', backgroundColor: '#000', alignSelf: 'center', justifyContent: 'center', marginTop: '2%' }}></View>

                <View style={{ flexDirection: 'row' }}>
                    {Object.keys(this.props.properties).length !== 0 ?
                        Object.keys(this.props.properties).map((property) => {
                            console.log(property + ' - ' + this.props.properties[property]);
                            return (
                                <View style={{ marginTop: '2%', borderWidth: 0.5, borderColor: '#000', marginHorizontal: "1%" }}>
                                    <Text style={{ color: '#000', alignSelf: 'center', marginHorizontal: "1%" }}>{property}</Text>
                                    <Text style={{ color: '#000', marginTop: '1%', alignSelf: 'center', marginHorizontal: "1%", fontWeight: 'bold' }}>{this.props.properties[property]}</Text>
                                </View>
                            )
                        }
                        ) : <View></View>}
                </View>

                <View style={{ marginVertical: '2%', justifyContent: 'center', alignItems: 'center', height: '25%', width: '25%', }}>
                    <Image
                        source={this.props.uri}
                        style={{ height: '80%', width: '80%', alignSelf: 'center', resizeMode: 'contain', }} />
                </View>


                <View style={{ position: 'relative', alignItems: 'center', marginBottom: '1%', }}>
                    {this.props.messages.map((message, i) => {
                        return (
                            <Text key={i} style={{ color: '#000', fontWeight: 'bold', marginTop: '2%' }}>{message}</Text>
                        )
                    })}
                    <Text style={{ color: '#000', paddingTop: '2%', }}>{this.props.timeStamp}</Text>
                </View>

            </View>
        );

    }
}
export default Slide;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },

});