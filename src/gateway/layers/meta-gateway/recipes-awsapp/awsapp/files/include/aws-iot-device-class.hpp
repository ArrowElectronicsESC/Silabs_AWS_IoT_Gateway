#ifndef AWS_IOT_DEVICE_CLASS_H
#define AWS_IOT_DEVICE_CLASS_H

#include "mqtt/Client.hpp"
#include "NetworkConnection.hpp"
#include "common/ConfigCommon.hpp"
#ifdef USE_WEBSOCKETS
#include "network/WebSocket/WebSocketConnection.hpp"
#elif defined USE_MBEDTLS
#include "network/MbedTLS/MbedTLSConnection.hpp"
#else
#include "network/OpenSSL/OpenSSLConnection.hpp"
#endif

#include "util/logging/Logging.hpp"
#include "util/logging/LogMacros.hpp"
#include "util/logging/ConsoleLogSystem.hpp"

#include <vector>
#include <iostream>
#include <fstream>
#include <sstream>
#include "rapidjson/document.h"
#include "rapidjson/reader.h"
#include "rapidjson/writer.h"
#include "rapidjson/prettywriter.h"
#include "rapidjson/filereadstream.h"
#include "rapidjson/filewritestream.h"
#include "aws-iot-core-class.hpp"


#include <chrono>
#include <thread>
#include <mosquitto.h>
#include "macrologger.h"

#ifndef CONFIG_FILE
#define CONFIG_FILE	"/opt/awsapp/config.json"
#endif

#define MAX_RETRY_COUNT    2 // No. of tries for establishing MQTT connection
#define CLIENT_ID_PREFIX   "EFR32Gateway_"

extern int count; // Externalize count variable so that we can check if mqtt connection was established

#define AWS_SDK_DEBUG   0

class AWSIoTDevice
{
	public:
		AWSIoTDevice();
		awsiotsdk::ResponseCode DisconnectCallback(awsiotsdk::util::String client_id,
                                                std::shared_ptr<awsiotsdk::DisconnectCallbackContextData> p_app_handler_data);
		int Publish(const char * topic, const char * payload);
		int Subscribe(awsiotsdk::util::String topicName);
                awsiotsdk::ResponseCode SubscribeCallback(awsiotsdk::util::String topic_name,
                                awsiotsdk::util::String payload,
                                std::shared_ptr<awsiotsdk::mqtt::SubscriptionHandlerContextData> p_app_handler_data);
		~AWSIoTDevice();
	private:
		std::shared_ptr<awsiotsdk::network::OpenSSLConnection> p_network_connection;
		std::shared_ptr<awsiotsdk::MqttClient> p_iot_client_;
		rapidjson::Document document;
		AWSIoTCore core;
};
#endif // #ifndef AWS_IOT_DEVICE_CLASS_H
