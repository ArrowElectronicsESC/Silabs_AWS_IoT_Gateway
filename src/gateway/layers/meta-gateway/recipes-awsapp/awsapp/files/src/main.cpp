#include "aws-iot-core-class.hpp"
#include "aws-iot-device-class.hpp"
#include "mqtt-handlers.h"
//#include "rapidjson/document.h"

#define mqtt_host "localhost"
#define mqtt_port 1883

//#define MQTT_SUB_CREATE_THING      "awsapp/gw/+/create/thing"

// #### Global variables defination ####

AWSIoTCore* core;
AWSIoTDevice* device = NULL;
struct mosquitto *mosq = NULL;
rapidjson::Document document;
std::string groupName = "";

// #####################################

void message_callback(struct mosquitto *mosq, void *obj, const struct mosquitto_message *message)
{
	bool match = 0;
	int i, status;

	LOG_INFO("got message '%.*s' for topic '%s'\n", message->payloadlen, (char*) message->payload, message->topic);


	for ( i = 0; i < NUMBER_OF_FUNCTION ; i++) {

                mosquitto_topic_matches_sub((const char *) mosquitto_message_handler_array[i].mosquitto_topic, message->topic, &match);
                if (match) {
                        status = mosquitto_message_handler_array[i].handler(mosq,message);
                        if ( status == -1)
                        {
                                LOG_ERROR("Failed to handle message on topic :: %s\n", message->topic);
                        }
                        break;
                }
        }

}
void connect_callback(struct mosquitto *mosq, void *obj, int result)
{
        int l_count = 0;
        int status = MOSQ_ERR_INVAL;

        if ( result == 0 ) {
                LOG_INFO("Sucessfully connects to mosquitto service");
        } else {
                LOG_ERROR("Failed to connects mosquitto service");
        }

        if ( mosq == NULL ){
                 LOG_ERROR("Invalid pointer");
                return;
        }
        for ( l_count = MQTT_TYPE_MIN ; l_count < MQTT_TYPE_MAX ; l_count++){

                status = mosquitto_subscribe(mosq, NULL, mqtt_topic_subscribe[l_count], 0);
                if ( status != MOSQ_ERR_SUCCESS){
                       LOG_ERROR("could not subscribe to topic:%s err:%d", mqtt_topic_subscribe[l_count], status);
                        /* TODO : If any topic failed to subscribe then restart mosquitto and all services*/
                }
                LOG_INFO("Subscribe to topic : %s\n",mqtt_topic_subscribe[l_count]);
        }
}

int telemetry(struct mosquitto *mosq, const struct mosquitto_message *message)
{
	LOG_INFO("Received message for telemetry: %s", (char *)message->payload);
	auto gatewayId = core->ReadConfigFile("gatewayId");

	rapidjson::Document data;
	rapidjson::Value payload(rapidjson::kObjectType);
	data.Parse((char *)message->payload);
	
	rapidjson::Document config;
        FILE* fp = fopen(CONFIG_FILE, "r+");
        char readBuffer[65536];

        rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
        config.ParseStream(is);
        fclose(fp);

	assert(config.IsObject()); 

	auto timestamp = data["timestamp"].GetInt64();
        auto stringifiedTimestamp = std::to_string(timestamp);
        LOG_INFO("Timestamp: %ld", timestamp);
        LOG_INFO("Stringified Timestamp: %ld", stringifiedTimestamp);

	for (rapidjson::SizeType i = 0; i < config["endDevices"].Size(); i++) {
		if (config["endDevices"][i]["eui64"] == data["eui64"]) {
			payload.AddMember("gatewayId", config["gatewayId"], data.GetAllocator());
			payload.AddMember("sensorId", config["endDevices"][i]["sensorId"], data.GetAllocator());
			payload.AddMember("sensorName", config["endDevices"][i]["sensorName"], data.GetAllocator());
			//payload.AddMember("timestamp", data["timestamp"], data.GetAllocator());
			payload.AddMember("timestamp", rapidjson::Value().SetString(stringifiedTimestamp.c_str(), document.GetAllocator()),data.GetAllocator());
			payload.AddMember(data["attributeName"], data[data["attributeName"].GetString()], data.GetAllocator());
    		}
	}	
	core->print(payload);

	if(device == NULL) 
        {
        	LOG_INFO("Initializing AWS MQTT connections");
                device = new AWSIoTDevice();
                if(count >= MAX_RETRY_COUNT)
                {
			LOG_INFO("Failed to establish AWS MQTT connection");
                        LOG_INFO("Clearing device object...");
                        delete device;
			device = NULL;
			return -1;
                }
        }
	auto topicName = std::string("gateway/") + std::string(gatewayId.c_str()) + "/telemetry"; 
	LOG_INFO("Publishing message to topic: %s", topicName.c_str());
	auto stringifiedPayload = core->stringify(payload);
	auto rc = device->Publish(topicName.c_str(), stringifiedPayload.c_str());
	return rc;
}

int deleteThing(struct mosquitto *mosq, const struct mosquitto_message *message)
{
	document.Parse((char *)message->payload);
        FILE* fp = fopen(CONFIG_FILE, "r+");
        char readBuffer[65536];

        rapidjson::Document data;
        rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
        data.ParseStream(is);
        fclose(fp);
        for( rapidjson::SizeType i = 0; i < document.Size(); i++ )
        {
                if(document[i]["deviceType"] == DEVICE_TYPE_GATEWAY)
                {
                        LOG_INFO("Clearing config file.....");
                        core->ClearConfig();
                        std::exit(42);
                }
                else if(document[i]["deviceType"] == DEVICE_TYPE_SENTIMATE)
                {
                        LOG_INFO("in sentimate type");
                        for(rapidjson::Value::ConstValueIterator itr = data["endDevices"].Begin(); itr != data["endDevices"].End(); ++itr)
                        {
                                if((*itr)["eui64"] == document[i]["eui64"])
                                {
                                        LOG_INFO("Match found!");
                                        LOG_INFO("Removing sensor details from config file.....");
                                        data["endDevices"].Erase(itr);
					break;
                                }
                        }
                }
        }
        fp = fopen(CONFIG_FILE, "w"); // non-Windows use "w"
        char writeBuffer[65536];
        rapidjson::FileWriteStream os(fp, writeBuffer, sizeof(writeBuffer));

	rapidjson::PrettyWriter<rapidjson::FileWriteStream> writer(os);
        data.Accept(writer);

        fclose(fp);
        return 0;
}
/**
* @brief handler to create a thing(gateway or end device) based on the MQTT message from growhouse server.
*
* @param mosq 
* @param message
*
* @return 
*/
int createThing(struct mosquitto *mosq, const struct mosquitto_message *message)
{


	int rc;
	bool status;
	document.Parse((char *) message->payload); // Parse the mqtt payload to JSON.
	for( rapidjson::SizeType i = 0; i < document.Size(); i++) 
	{
		if(document[i]["deviceType"] == DEVICE_TYPE_GATEWAY )
		{
			LOG_INFO("Create gateway thing call");
			// Call Create thing API for gateway
			auto response = core->CallCreateThingAPI((char *) message->payload);
			if(response != "ERR") {
                                // Parse and store response for gateway type
                                rc = core->ParseCreateGatewayResponse(response);
                                rapidjson::Value resp(rapidjson::kObjectType);
                                resp.AddMember("result", "success", document.GetAllocator());
                                resp.AddMember("statusMessage", "Successfully Registered Gateway", document.GetAllocator());
				auto gatewayId = core->ReadConfigFile("gatewayId");
				resp.AddMember("gatewayId", rapidjson::Value().SetString(gatewayId.c_str(), document.GetAllocator()), document.GetAllocator());
                                /* Publish to growhouse-server*/
                                rapidjson::StringBuffer jsonResponse;
                                rapidjson::Writer<rapidjson::StringBuffer> writer(jsonResponse);
                                resp.Accept(writer);
                                status = mosquitto_publish(mosq, NULL, MQTT_PUB_BLE_RESPONSE, strlen(jsonResponse.GetString()), jsonResponse.GetString(), 1, false);
                                if ( status != MOSQ_ERR_SUCCESS){
                                        LOG_ERROR("could not publish to topic:%s err:%d", MQTT_PUB_BLE_RESPONSE, status);
                                } else {
                                        LOG_INFO("Successfully publish respone : \"%s\" on topic %s\n", jsonResponse.GetString(), MQTT_PUB_BLE_RESPONSE);
                                }
                        }
			else {
                                LOG_ERROR("Error calling createThing API");
                                rapidjson::Value resp(rapidjson::kObjectType);
                                resp.AddMember("result", "fail", document.GetAllocator());
                                resp.AddMember("statusMessage", "Error registering device", document.GetAllocator());
                                /* Publish to growhouse-server*/
                                rapidjson::StringBuffer jsonResponse;
                                rapidjson::Writer<rapidjson::StringBuffer> writer(jsonResponse);
                                resp.Accept(writer);
                                status = mosquitto_publish(mosq, NULL, MQTT_PUB_BLE_RESPONSE, strlen(jsonResponse.GetString()), jsonResponse.GetString(), 1, false);
                                if ( status != MOSQ_ERR_SUCCESS){
                                        LOG_ERROR("could not publish to topic:%s err:%d", MQTT_PUB_BLE_RESPONSE, status);
                                } else {
                                        LOG_INFO("Successfully publish respone : \"%s\" on topic %s\n", jsonResponse.GetString(), MQTT_PUB_BLE_RESPONSE);
                                }
                        }
		}
		else if(document[i]["deviceType"] == DEVICE_TYPE_SENTIMATE)
		{
			LOG_INFO("Create sensor thing call");
			auto response = core->CallCreateThingAPI((char *) message->payload);
			if(response != "ERR") {
                                auto device = core->ParseCreateSensorResponse(response);
                                rapidjson::Value resp(rapidjson::kObjectType);
                                resp.AddMember("result", "success", document.GetAllocator());
                                resp.AddMember("statusMessage", "Successfully registered device", document.GetAllocator());
                                resp.AddMember("sensorId", device["thingName"], document.GetAllocator());
                                resp.AddMember("eui64", device["eui64"], document.GetAllocator());
                                /* Publish to growhouse-server*/
                                rapidjson::StringBuffer jsonResponse;
                                rapidjson::Writer<rapidjson::StringBuffer> writer(jsonResponse);
                                resp.Accept(writer);
                                status = mosquitto_publish(mosq, NULL, MQTT_PUB_BLE_RESPONSE, strlen(jsonResponse.GetString()), jsonResponse.GetString(), 1, false);
                                if ( status != MOSQ_ERR_SUCCESS){
                                        LOG_ERROR("could not publish to topic:%s err:%d", MQTT_PUB_BLE_RESPONSE, status);
                                } else {
                                        LOG_INFO("Successfully publish respone : \"%s\" on topic %s\n", jsonResponse.GetString(), MQTT_PUB_BLE_RESPONSE);
                                }
                                break;
                        }
			else {
                                LOG_ERROR("Error calling createThing API");
                                rapidjson::Value resp(rapidjson::kObjectType);
                                resp.AddMember("result", "fail", document.GetAllocator());
                                resp.AddMember("statusMessage", "Error registering device", document.GetAllocator());
                                /* Publish to growhouse-server*/
                                rapidjson::StringBuffer jsonResponse;
                                rapidjson::Writer<rapidjson::StringBuffer> writer(jsonResponse);
                                resp.Accept(writer);
                                status = mosquitto_publish(mosq, NULL, MQTT_PUB_BLE_RESPONSE, strlen(jsonResponse.GetString()), jsonResponse.GetString(), 1, false);
                                if ( status != MOSQ_ERR_SUCCESS){
                                        LOG_ERROR("could not publish to topic:%s err:%d", MQTT_PUB_BLE_RESPONSE, status);
                                } else {
                                        LOG_INFO("Successfully publish respone : \"%s\" on topic %s\n", jsonResponse.GetString(), MQTT_PUB_BLE_RESPONSE);
                                }
                                break;
                        }
		}
	}
	if(!rc) {
		if(device == NULL) 
		{
			LOG_INFO("Initializing AWS MQTT connections");
			device = new AWSIoTDevice();
		}
	}
	else {
		LOG_INFO("Failed to parse the response...");
	}
	return 0;
}



int main(int argc, char** argv)
{

	char clientid[24];
	int rc = 0;

	core = new AWSIoTCore();

	/* initialize random seed: */
	srand (time(NULL));	

	LOG_INFO("Starting AWSAPP....");
	auto cert = core->ReadConfigFile("certificatePath");
	if(cert != "")
	{
		LOG_INFO("AWS certificates are present...");
		LOG_INFO("Initializing AWS MQTT Connections...");
		device = new AWSIoTDevice();
		if(count >= MAX_RETRY_COUNT)
		{
			LOG_INFO("Failed to establish AWS MQTT connection");
			LOG_INFO("Clearing device object...");
			delete device;
			device = NULL;
		}		
	} 

	mosquitto_lib_init();
	memset(clientid, 0, 24);
        snprintf(clientid, 23, "AWSApp_1234" );

	mosq = mosquitto_new(clientid, true, 0);
        if(!mosq){
                mosquitto_lib_cleanup();
                LOG_ERROR("failed to start mosquitto\n");
                return -1;
        }
	if(mosq){

                mosquitto_connect_callback_set(mosq, connect_callback);
                mosquitto_message_callback_set(mosq, message_callback);

                if (mosquitto_connect(mosq, mqtt_host, mqtt_port, MOSQUITTO_PING_TIMEOUT)){
                        mosquitto_lib_cleanup();
                        LOG_ERROR("Unable to connect Mosquitto.\n");
                        return 1;
                }

                /*TODO : Add support for gracefully shoutdown appllication*/
                while(1){
                        rc = mosquitto_loop(mosq, -1, 1);
                        if(rc){
                                LOG_ERROR("connection error!\n");
                                std::this_thread::sleep_for(std::chrono::milliseconds(10000)); // 10s sleep
                                mosquitto_reconnect(mosq);
                        }
                }
                mosquitto_disconnect(mosq);
                mosquitto_destroy(mosq);
        }

        mosquitto_lib_cleanup();

	return 0;
}
