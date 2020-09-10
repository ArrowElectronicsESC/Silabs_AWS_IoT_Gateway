#include "aws-iot-device-class.hpp"

int count = 0;
awsiotsdk::ResponseCode AWSIoTDevice::DisconnectCallback(awsiotsdk::util::String client_id,
                                                std::shared_ptr<awsiotsdk::DisconnectCallbackContextData> p_app_handler_data) 
{
	LOG_INFO("AWS MQTT disconnected!");
	LOG_INFO("Restarting application....");
	system("systemctl restart awsapp");
	return awsiotsdk::ResponseCode::SUCCESS;
}

AWSIoTDevice::AWSIoTDevice()
{
	LOG_INFO("Constructor called");

	if(AWS_SDK_DEBUG)
	{
		std::shared_ptr<awsiotsdk::util::Logging::ConsoleLogSystem> p_log_system =
        	        std::make_shared<awsiotsdk::util::Logging::ConsoleLogSystem>(awsiotsdk::util::Logging::LogLevel::Debug);
	        awsiotsdk::util::Logging::InitializeAWSLogging(p_log_system);
	}

	awsiotsdk::ResponseCode configResponse = awsiotsdk::ConfigCommon::InitializeCommon(CONFIG_FILE);
        if (awsiotsdk::ResponseCode::SUCCESS == configResponse) {
                LOG_INFO("Config file loaded successfully");
        }
	else
	{
        	LOG_ERROR("Error Response: %s", awsiotsdk::ResponseHelper::ToString(configResponse).c_str());
	}
	LOG_INFO("root_ca_path: %s",awsiotsdk::ConfigCommon::root_ca_path_.c_str());
	p_network_connection =
                std::make_shared<awsiotsdk::network::OpenSSLConnection>(awsiotsdk::ConfigCommon::endpoint_,
                                                             awsiotsdk::ConfigCommon::endpoint_mqtt_port_,
                                                             awsiotsdk::ConfigCommon::root_ca_path_,
                                                             awsiotsdk::ConfigCommon::client_cert_path_,
                                                             awsiotsdk::ConfigCommon::client_key_path_,
                                                             awsiotsdk::ConfigCommon::tls_handshake_timeout_,
                                                             awsiotsdk::ConfigCommon::tls_read_timeout_,
                                                             awsiotsdk::ConfigCommon::tls_write_timeout_, true);
	awsiotsdk::ResponseCode rc = p_network_connection->Initialize();
        if(awsiotsdk::ResponseCode::SUCCESS == rc) {
                LOG_INFO("Network Connection Initialized");
        }
	
	awsiotsdk::ClientCoreState::ApplicationDisconnectCallbackPtr p_disconnect_handler =
                std::bind(&AWSIoTDevice::DisconnectCallback, this, std::placeholders::_1, std::placeholders::_2);


        p_iot_client_ = awsiotsdk::MqttClient::Create(p_network_connection,
                                                awsiotsdk::ConfigCommon::mqtt_command_timeout_,
                                                p_disconnect_handler, nullptr,
                                                nullptr, nullptr,
                                                nullptr, nullptr);



	awsiotsdk::util::String clientIdTagged = CLIENT_ID_PREFIX;
        clientIdTagged.append(std::to_string(rand()));
        std::unique_ptr<awsiotsdk::Utf8String> clientId = awsiotsdk::Utf8String::Create(clientIdTagged);
	


	LOG_INFO("Trying MQTT Connect");
	count = 1;
        while(count <= MAX_RETRY_COUNT) {
                LOG_INFO("Trying now...count: %d", count);
                rc = p_iot_client_->Connect(std::chrono::milliseconds(30000), false, awsiotsdk::mqtt::Version::MQTT_3_1_1, std::chrono::seconds(60), std::move(clientId), nullptr, nullptr, nullptr);

                if(awsiotsdk::ResponseCode::MQTT_CONNACK_CONNECTION_ACCEPTED == rc) {
			awsiotsdk::util::String topicName = AWS_SUB_TOPIC ;
                        LOG_INFO("MQTT Connection established!");
                	LOG_INFO("Response: %s", awsiotsdk::ResponseHelper::ToString(rc).c_str());
                        LOG_INFO("Subscribing to topic: %s", topicName.c_str());
                        auto rc2 = this->Subscribe(topicName);
                        LOG_INFO("Subscribed successfully!");
			break;
                }
                else {
                	LOG_INFO("Response: %s", awsiotsdk::ResponseHelper::ToString(rc).c_str());
                }
                count++;
	}
}

int AWSIoTDevice::Publish(const char * topic, const char * payload)
{
	awsiotsdk::util::String p_pub_topic_name_str = topic;
        std::unique_ptr<awsiotsdk::Utf8String> p_pub_topic_name = awsiotsdk::Utf8String::Create(p_pub_topic_name_str);
        awsiotsdk::util::String payloadData = payload;
        awsiotsdk::ResponseCode rc = p_iot_client_->Publish(std::move(p_pub_topic_name), false, false, awsiotsdk::mqtt::QoS::QOS1, payloadData, std::chrono::milliseconds(30000));
	if(rc == awsiotsdk::ResponseCode::SUCCESS)
	{
		LOG_INFO("Message successfully published on topic: %s", topic);
		return 0;
	}
	return -1;
}

int AWSIoTDevice::Subscribe(awsiotsdk::util::String topicName)
{
        awsiotsdk::util::String p_topic_name_str = topicName;
        std::unique_ptr<awsiotsdk::Utf8String> p_topic_name = awsiotsdk::Utf8String::Create(p_topic_name_str);
        awsiotsdk::mqtt::Subscription::ApplicationCallbackHandlerPtr p_sub_handler = std::bind(&AWSIoTDevice::SubscribeCallback,
                        this,
                        std::placeholders::_1,
                        std::placeholders::_2,
                        std::placeholders::_3);
        std::shared_ptr<awsiotsdk::mqtt::Subscription> p_subscription =
                awsiotsdk::mqtt::Subscription::Create(std::move(p_topic_name), awsiotsdk::mqtt::QoS::QOS0, p_sub_handler, nullptr);
        awsiotsdk::util::Vector<std::shared_ptr<awsiotsdk::mqtt::Subscription>> topic_vector;
        topic_vector.push_back(p_subscription);

        awsiotsdk::ResponseCode rc = p_iot_client_->Subscribe(topic_vector, awsiotsdk::ConfigCommon::mqtt_command_timeout_);
        LOG_INFO("Response: %s", awsiotsdk::ResponseHelper::ToString(rc).c_str());
        //std::this_thread::sleep_for(std::chrono::seconds(3));
        //return rc;
        return 0;
}
awsiotsdk::ResponseCode AWSIoTDevice::SubscribeCallback(awsiotsdk::util::String topic_name,
                                               awsiotsdk::util::String payload,
                                               std::shared_ptr<awsiotsdk::mqtt::SubscriptionHandlerContextData> p_app_handler_data) 
{
        LOG_INFO("Received Message on topic: %s", topic_name.c_str());
        LOG_INFO("Payload: %s", payload.c_str());
        document.Parse(payload.c_str());
        for( rapidjson::SizeType i = 0; i < document.Size(); i++)
        {
                if(document[i]["deviceType"] == DEVICE_TYPE_GATEWAY && document[i]["gatewayId"] == core.ReadConfigFile("gatewayId").c_str())
                {
        		LOG_INFO("Existing gatewayName: %s", core.ReadConfigFile("gatewayName").c_str());
                        LOG_INFO("Found new gateway name: %s", document[i]["gatewayName"].GetString());
                        LOG_INFO("Updating new name in config....");
                        core.UpdateConfigFile("gatewayName", document[i]["gatewayName"].GetString());
        		LOG_INFO("Updated GatewayName: %s", core.ReadConfigFile("gatewayName").c_str());
                }
                else if(document[i]["deviceType"] == DEVICE_TYPE_SENTIMATE)
                {
                        FILE* fp = fopen(CONFIG_FILE, "r+");
                        char readBuffer[65536];

                        rapidjson::Document data;
                        rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
                        data.ParseStream(is);
                        fclose(fp);
			for (rapidjson::SizeType i = 0; i < data["endDevices"].Size(); i++)
                        {
                                if(data["endDevices"][i]["sensorId"] == document[i]["sensorId"] && data["gatewayId"] == document[i]["gatewayId"])
                                {
                        		LOG_INFO("Found new sensor name: %s", document[i]["sensorName"].GetString());
                        		LOG_INFO("Updating new name in config....");
                                        data["endDevices"][i]["sensorName"] = document[i]["sensorName"];
					LOG_INFO("Updated sensor name: %s", data["endDevices"][i]["sensorName"].GetString());
                                        break;
                                }
                        }
                        fp = fopen(CONFIG_FILE, "w"); // non-Windows use "w"
                        char writeBuffer[65536];
                        rapidjson::FileWriteStream os(fp, writeBuffer, sizeof(writeBuffer));

                        rapidjson::PrettyWriter<rapidjson::FileWriteStream> writer(os);
                        data.Accept(writer);

                        fclose(fp);
                }
        }
        return awsiotsdk::ResponseCode::SUCCESS;
}
/**
* @brief Destructor for the AWSIoTDevice class.
*/
AWSIoTDevice::~AWSIoTDevice()
{
	if(AWS_SDK_DEBUG)
		awsiotsdk::util::Logging::ShutdownAWSLogging();
}
