#include <mosquitto.h>

#define MQTT_SUB_CREATE_THING      "awsapp/provision"
#define MQTT_SUB_TELEMETRY         "awsapp/mqtt/tel"
#define MQTT_SUB_DELETE		   "awsapp/delete"
#define MQTT_PUB_BLE_RESPONSE	   "awsapp/provision/response"



/*
 * Default mosquitto.conf file sets the keepalive seconds
 * to be 60, so we set the keepailve interval of 120 seconds
 */
#define MOSQUITTO_PING_TIMEOUT 120


int createThing(struct mosquitto *mosq, const struct mosquitto_message *message);
int telemetry(struct mosquitto *mosq, const struct mosquitto_message *message);
int deleteThing(struct mosquitto *mosq, const struct mosquitto_message *message);


enum mqtt_topic {

        MQTT_TYPE_MIN,
        MQTT_TYPE_CREATE_THING = MQTT_TYPE_MIN,
	MQTT_TYPE_TELEMETRY,
	MQTT_TYPE_DELETE,
        MQTT_TYPE_MAX

};

const char * mqtt_topic_subscribe [] = {

        [MQTT_TYPE_CREATE_THING] = MQTT_SUB_CREATE_THING,
	[MQTT_TYPE_TELEMETRY] = MQTT_SUB_TELEMETRY,
	[MQTT_TYPE_DELETE] = MQTT_SUB_DELETE
};

typedef struct mosquitto_message_handler {

        int * mosquitto_topic;
        int (* handler)(struct mosquitto *, const struct mosquitto_message*);

}MOSQUITTO_MSG_HANDLER;

static const MOSQUITTO_MSG_HANDLER mosquitto_message_handler_array[] = {

        { .mosquitto_topic = (int *) MQTT_SUB_CREATE_THING,
                .handler = &createThing },
	{ .mosquitto_topic = (int *) MQTT_SUB_TELEMETRY,
                .handler = &telemetry },
	{ .mosquitto_topic = (int *) MQTT_SUB_DELETE,
                .handler = &deleteThing }

};

/*
 * Total number of function handler
 */
#define NUMBER_OF_FUNCTION  sizeof(mosquitto_message_handler_array)/sizeof(MOSQUITTO_MSG_HANDLER)


