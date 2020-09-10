#ifndef AWS_IOT_CORE_CLASS_H
#define AWS_IOT_CORE_CLASS_H
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
#include <curl/curl.h>
#include <sys/types.h>
#include <sys/stat.h>


#include <chrono>
#include <thread>
#include <mosquitto.h>
#include "macrologger.h"

#define DEVICE_TYPE_GATEWAY        "gateway"
#define DEVICE_TYPE_SENTIMATE      "sentimate"
#define PATH_TO_CERTS      "/opt/awsapp/certs/"
#define CONFIG_FILE        "/opt/awsapp/config.json"

#define AWS_SUB_TOPIC	"gateway/update"
#define SKIP_PEER_VERIFICATION

// Define DEBUG macro to enable debug logs.
// To enable DEBUG logs, uncomment the next line
//#define DEBUG

// Change the Endpoint below to your AWS API endpoint
#define CREATE_THING_ENDPOINT "<AWS API endpoint>"

#define AMAZON_ROOT_CA_ENDPOINT "https://www.amazontrust.com/repository/AmazonRootCA1.pem"

class AWSIoTCore
{
	public:
		AWSIoTCore();
		std::string stringify(rapidjson::GenericValue<rapidjson::UTF8<> >& o);
		int UpdateConfigFile(const char * key, const char * value);
		int WriteToFile(const char * fileName, const char * data);
		std::string ReadConfigFile(const char * key);
		std::string CallCreateThingAPI(const char * body);
		static size_t WriteCallback(void *contents, size_t size, size_t nmemb, void *userp);
		int ParseCreateGatewayResponse(std::string response);
		rapidjson::Document ParseCreateSensorResponse(std::string response);
		int ClearConfig();
		std::string GetAmazonRootCACertificate();
		void print(const rapidjson::Value &json);
		~AWSIoTCore();
	private:
		rapidjson::Document document;
};
#endif // #ifndef AWS_IOT_CORE_CLASS_H
