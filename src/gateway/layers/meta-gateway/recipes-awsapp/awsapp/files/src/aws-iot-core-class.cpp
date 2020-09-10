#include "aws-iot-core-class.hpp"

/**
* @brief Read the config file  and return the key-value.
*
* @param key - to be read
*
* @return value of the key in Aws::String type.
*/
std::string AWSIoTCore::ReadConfigFile(const char * key)
{
	rapidjson::Document data;
	FILE* fp = fopen(CONFIG_FILE, "r+");
        char readBuffer[65536];

        rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
        data.ParseStream(is);
        fclose(fp);
	std::string result = data[key].GetString();
	return result;

}
/**
* @brief Update the config file's key and value
*
* @param key - to be updated
* @param value - the new modified value to be stored.
*
* @return 
*/
int AWSIoTCore::UpdateConfigFile(const char * key, const char * value)
{
	rapidjson::Document data;
        std::ofstream outfile;
	
	FILE* fp = fopen(CONFIG_FILE, "r+");
	char readBuffer[65536];
	
	rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
	data.ParseStream(is);
	fclose(fp);
	data[key].SetString(value, data.GetAllocator());
	fp = fopen(CONFIG_FILE, "w"); // non-Windows use "w"
 
	char writeBuffer[65536];
	rapidjson::FileWriteStream os(fp, writeBuffer, sizeof(writeBuffer));
 
	rapidjson::PrettyWriter<rapidjson::FileWriteStream> writer(os);
	data.Accept(writer);
 
	fclose(fp);
	return 0;
 	
}
/**
* @brief Clear the config file to the default contents
*
* @return 
*/
int AWSIoTCore::ClearConfig()
{
	this->UpdateConfigFile("groupArn", "");
    	this->UpdateConfigFile("groupName", "");
    	this->UpdateConfigFile("certificatePath", "");
    	this->UpdateConfigFile("privateKeyPath", "");
    	this->UpdateConfigFile("certificateArn","");
    	this->UpdateConfigFile("endpoint", "");
    	this->UpdateConfigFile("rootCACertificatePath", "");
    	this->UpdateConfigFile("thingName", "");
    	this->UpdateConfigFile("gatewayId", "");
    	this->UpdateConfigFile("gatewayName", "");
    	this->UpdateConfigFile("provisioned", "");

	rapidjson::Document data;
        std::ofstream outfile;
        FILE* fp = fopen(CONFIG_FILE, "r+");
        char readBuffer[65536];

        rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
        data.ParseStream(is);
        fclose(fp);
	if(data["endDevices"].Size() > 0) // Perform Erase operation only if we have some sensors registered
	{
		data["endDevices"].Erase(data["endDevices"].Begin(), data["endDevices"].End());
        	fp = fopen(CONFIG_FILE, "w"); // non-Windows use "w"
        	char writeBuffer[65536];
        	rapidjson::FileWriteStream os(fp, writeBuffer, sizeof(writeBuffer));
	
		rapidjson::PrettyWriter<rapidjson::FileWriteStream> writer(os);
        	data.Accept(writer);

        	fclose(fp);
	}

	return 0;
}
/**
* @brief Parse the create gateway API response and update the config
*
* @param payload - to be parsed
*
* @return 
*/
int AWSIoTCore::ParseCreateGatewayResponse(std::string payload)
{
	rapidjson::Document data;
	data.Parse(payload.c_str());
#ifdef DEBUG
	LOG_INFO("Payload: %s", payload.c_str());
#endif
	LOG_INFO("Parsing response.....");
	this->UpdateConfigFile("thingName", data["thing"]["thingName"].GetString());
	this->UpdateConfigFile("gatewayName", data["thing"]["gatewayName"].GetString());
	this->UpdateConfigFile("groupArn", data["group"]["thingGroupArn"].GetString());
	this->UpdateConfigFile("groupName", data["group"]["thingGroupName"].GetString());
	this->UpdateConfigFile("gatewayId", data["group"]["thingGroupName"].GetString());
	this->UpdateConfigFile("endpoint", data["endpoint"]["endpointAddress"].GetString());
	this->UpdateConfigFile("provisioned", "true");

	struct stat info;
	if( stat( PATH_TO_CERTS, &info ) != 0 ) {
		LOG_INFO( "cannot access %s", PATH_TO_CERTS );
		LOG_INFO("creating directory...");
		int r = mkdir(PATH_TO_CERTS, 0775);
		if(!r) {
			LOG_INFO("Directory created successfully!");
		}
		else {
			LOG_ERROR("Unable to create directory");
		}
	}
	else if( info.st_mode & S_IFDIR )  // S_ISDIR() doesn't exist on my windows 
		LOG_INFO( "%s directory exists", PATH_TO_CERTS );
	else
		LOG_INFO( "%s is not a directory", PATH_TO_CERTS );
			

	auto certificateId = data["certificates"]["certificateId"].GetString();
	auto certificateArn = data["certificates"]["certificateArn"].GetString();
	auto certificatePem = data["certificates"]["certificatePem"].GetString();
	auto publicKey = data["certificates"]["keyPair"]["PublicKey"].GetString();
	auto privateKey = data["certificates"]["keyPair"]["PrivateKey"].GetString();
	LOG_INFO("Certificate Arn: %s", certificateArn);
	std::string fileName;
	LOG_INFO("Writing certificates to file.....");
	fileName = std::string(PATH_TO_CERTS).c_str() + std::string(certificateId).substr(0,10) + std::string("-certificate") + std::string(".pem.crt");
	this->WriteToFile(fileName.c_str(), certificatePem);
	this->UpdateConfigFile("certificatePath", fileName.c_str());
	fileName = std::string(PATH_TO_CERTS).c_str() + std::string(certificateId).substr(0,10) + std::string("-private") + std::string(".pem.key");
	this->WriteToFile(fileName.c_str(), privateKey);
	this->UpdateConfigFile("privateKeyPath", fileName.c_str());
	fileName = std::string(PATH_TO_CERTS).c_str() + std::string(certificateId).substr(0,10) + std::string("-public") + std::string(".pem.key");
	this->WriteToFile(fileName.c_str(), privateKey);
	this->UpdateConfigFile("certificateArn", certificateArn);

	LOG_INFO("Getting Amazon Root CA cartificate.....");
	auto rootca = this->GetAmazonRootCACertificate();
	
	fileName = std::string(PATH_TO_CERTS).c_str() + std::string("AmazonRootCA1.pem");
	this->WriteToFile(fileName.c_str(), rootca.c_str());
	this->UpdateConfigFile("rootCACertificatePath", fileName.c_str());

	LOG_INFO("Written to file");

	return 0;
}
void AWSIoTCore::print(const rapidjson::Value &json)
{
        using namespace rapidjson;
        StringBuffer sb;
        PrettyWriter<StringBuffer> writer(sb);
        json.Accept(writer);
        auto str = sb.GetString();
        LOG_INFO("%s", str);
}
/**
* @brief Parse the response and update the config file
*
* @param payload - to be parsed
*
* @return 
*/
rapidjson::Document AWSIoTCore::ParseCreateSensorResponse(std::string payload)
{
	rapidjson::Document d;
	d.Parse(payload.c_str());
#ifdef DEBUG
	LOG_INFO("Payload: %s", payload.c_str());
#endif
	LOG_INFO("Parsing the response....");
	rapidjson::Document data;
	std::ofstream outfile;
	FILE* fp = fopen(CONFIG_FILE, "r+");
	char readBuffer[65536];

	rapidjson::FileReadStream is(fp, readBuffer, sizeof(readBuffer));
	data.ParseStream(is);
	fclose(fp);

	rapidjson::Document retDevice;
	for (rapidjson::SizeType i = 0; i < d["thing"].Size(); i++) {
		rapidjson::Value device(rapidjson::kObjectType);
		retDevice.CopyFrom(d["thing"][i], retDevice.GetAllocator());
		device.AddMember("sensorId", d["thing"][i]["thingName"], data.GetAllocator());
		device.AddMember("sensorName", d["thing"][i]["sensorName"], data.GetAllocator());
		device.AddMember("eui64", d["thing"][i]["eui64"], data.GetAllocator());
		device.AddMember("thingId", d["thing"][i]["thingId"], data.GetAllocator());
		device.AddMember("thingArn", d["thing"][i]["thingArn"], data.GetAllocator());
#ifdef DEBUG
		this->print(device);
#endif
		for(rapidjson::Value::ConstValueIterator itr = data["endDevices"].Begin(); itr != data["endDevices"].End(); ++itr)
                {
                        if((*itr)["eui64"] == device["eui64"])
                        {
                                LOG_INFO("Removing existing sensor details from config file.....");
                                data["endDevices"].Erase(itr);
                                break;
                        }
                }
		LOG_INFO("Adding updated details...");
		data["endDevices"].PushBack(device, data.GetAllocator());
#ifdef DEBUG
		this->print(retDevice);
#endif
	}
	fp = fopen(CONFIG_FILE, "w"); // non-Windows use "w"
	char writeBuffer[65536];
	rapidjson::FileWriteStream os(fp, writeBuffer, sizeof(writeBuffer));

	rapidjson::PrettyWriter<rapidjson::FileWriteStream> writer(os);
	data.Accept(writer);

	fclose(fp);
	LOG_INFO("Updated the config file with sensor details...");
	return retDevice;
}

/**
* @brief Call back function to hold the curl response
*
* @param contents
* @param size
* @param nmemb
* @param userp
*
* @return 
*/
size_t AWSIoTCore::WriteCallback(void *contents, size_t size, size_t nmemb, void *userp)
{
            ((std::string*)userp)->append((char*)contents, size * nmemb);
                return size * nmemb;
}

/**
* @brief Call the Create Thing API on AWS
*
* @param body - to be passed in the API body
*
* @return the string response
*/
std::string AWSIoTCore::CallCreateThingAPI(const char * body) {

	LOG_INFO("Calling create things API with body: %s", body);
	CURL *curl;
	long http_code = 0;
	CURLcode res;
	struct curl_slist *headers = NULL;
	std::string readBuffer;

	curl = curl_easy_init();
	if(curl) {
		curl_easy_setopt(curl, CURLOPT_URL, CREATE_THING_ENDPOINT);
		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
		headers = curl_slist_append(headers, "Content-Type: application/json");
		headers = curl_slist_append(headers, "Accept: application/json");
		//curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"name\" : \"abhijit\"}");
		curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
	#ifdef SKIP_PEER_VERIFICATION
		/*
		 * If you want to connect to a site who isn't using a certificate that is
		 * signed by one of the certs in the CA bundle you have, you can skip the
		 * verification of the server's certificate. This makes the connection
		 * A LOT LESS SECURE.
		 *
		 * If you have a CA cert for the server stored someplace else than in the
		 * default bundle, then the CURLOPT_CAPATH option might come handy for
		 * you.
		 */
		curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
	#endif

	#ifdef SKIP_HOSTNAME_VERIFICATION
		/*
		 * If the site you're connecting to uses a different host name that what
		 * they have mentioned in their server certificate's commonName (or
		 * subjectAltName) fields, libcurl will refuse to connect. You can skip
		 * this check, but this will make the connection less secure.
		 */
		curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
	#endif
		/* Perform the request, res will get the return code */
		res = curl_easy_perform(curl);
		curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
		//printf("Response Code: %d", res);
		/* Check for errors */
		if(res != CURLE_OK)
			LOG_ERROR("curl_easy_perform() failed: %s\n", curl_easy_strerror(res));

		//std::cout << readBuffer << std::endl;

		/* always cleanup */
		curl_easy_cleanup(curl);
	}
	if ((http_code == 200 || http_code == 204 ) && res != CURLE_ABORTED_BY_CALLBACK)
        {
                //Succeeded
                LOG_INFO("Successfully fetched the response....");
                LOG_INFO("Response code: %ld", http_code);
                return readBuffer;
        }
        else
        {
                //Failed
                LOG_ERROR("Error calling the API..");
                LOG_ERROR("Response code: %ld", http_code);
                LOG_ERROR("Error: %s", readBuffer.c_str());
                return "ERR";
        }
}
/**
* @brief Get the Amazon root CA certificate by curl
*
* @return the certificate string
*/
std::string AWSIoTCore::GetAmazonRootCACertificate()
{
        CURL *curl;
        CURLcode res;
        struct curl_slist *headers = NULL;
        std::string readBuffer;

        curl = curl_easy_init();
        if(curl) {
                curl_easy_setopt(curl, CURLOPT_URL, AMAZON_ROOT_CA_ENDPOINT);
                curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
                curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
        #ifdef SKIP_PEER_VERIFICATION
                /*
                 * If you want to connect to a site who isn't using a certificate that is
                 * signed by one of the certs in the CA bundle you have, you can skip the
                 * verification of the server's certificate. This makes the connection
                 * A LOT LESS SECURE.
                 *
                 * If you have a CA cert for the server stored someplace else than in the
                 * default bundle, then the CURLOPT_CAPATH option might come handy for
                 * you.
                 */
                curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        #endif
	
	#ifdef SKIP_HOSTNAME_VERIFICATION
                /*
                 * If the site you're connecting to uses a different host name that what
                 * they have mentioned in their server certificate's commonName (or
                 * subjectAltName) fields, libcurl will refuse to connect. You can skip
                 * this check, but this will make the connection less secure.
                 */
                curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        #endif
                /* Perform the request, res will get the return code */
                res = curl_easy_perform(curl);
                //printf("Response Code: %d", res);
                /* Check for errors */
                if(res != CURLE_OK)
                        fprintf(stderr, "curl_easy_perform() failed: %s\n",
                                        curl_easy_strerror(res));

                //std::cout << readBuffer << std::endl;

                /* always cleanup */
                curl_easy_cleanup(curl);
        }
	return readBuffer;
}
/**
* @brief Stringify's the JSON object.
*
* @param o - RapidJson object
*
* @return std::string for the JSON Object
*/
std::string AWSIoTCore::stringify(rapidjson::GenericValue<rapidjson::UTF8<>> & o)
{
	rapidjson::StringBuffer sb;
	rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
	o.Accept(writer);
	return sb.GetString();
}
/**
* @brief Save the contents to a file.
*
* @param fileName - name of the file to be created
* @param data - char * of the data.
*
* @return 
*/
int AWSIoTCore::WriteToFile(const char * fileName, const char * data)
{
	std::ofstream outfile;
	outfile.open(fileName);
	outfile << data ;
	outfile.close();
	return 0;
}
/**
* @brief Constructor for the AWSIoTCore class.
*
* @param config - Client configuration containing necessary details about AWS.
*/
AWSIoTCore::AWSIoTCore()
{
	curl_global_init(CURL_GLOBAL_DEFAULT);
}
AWSIoTCore::~AWSIoTCore()
{
	curl_global_cleanup();
}
