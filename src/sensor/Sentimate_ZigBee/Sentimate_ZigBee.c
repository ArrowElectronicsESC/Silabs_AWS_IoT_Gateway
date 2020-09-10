/***************************************************************************//**
 * @file
 * @brief
 *******************************************************************************
 * # License
 * <b>Copyright 2018 Silicon Laboratories Inc. www.silabs.com</b>
 *******************************************************************************
 *
 * The licensor of this software is Silicon Laboratories Inc. Your use of this
 * software is governed by the terms of Silicon Labs Master Software License
 * Agreement (MSLA) available at
 * www.silabs.com/about-us/legal/master-software-license-agreement. This
 * software is distributed to you in Source Code format and is governed by the
 * sections of the MSLA applicable to Source Code.
 *
 ******************************************************************************/

// This callback file is created for your convenience. You may add application
// code to this file. If you regenerate this file over a previous version, the
// previous version will be overwritten and any code you have added will be
// lost.

#include "app/framework/include/af.h"

//Sentimate Sensor
#include "BPS/ambimate/ambimate.h"
//#include "Sentimate_ZigBee_endpoint_config.h"
extern AmbiMate_Devie_TypeDef_t	am_dev;
extern volatile uint8_t event_out;

#include EMBER_AF_API_NETWORK_STEERING
//#include EMBER_AF_API_ZLL_PROFILE
#include EMBER_AF_API_FIND_AND_BIND_INITIATOR

#define SWITCH_ENDPOINT (1)
#define BUTTON_HOLD_DURATION_MS 5000

//Sentimate Sensor
#define MY_DELAY_IN_MS 1000

#define BUTTON_PRESSED  0

/** @brief Button state is released.
 */
#define BUTTON_RELEASED 1

static bool commissioning = false;

EmberEventControl commissioningEventControl;
EmberEventControl ledEventControl;
EmberEventControl findingAndBindingEventControl;
//Sentimate Sensor
EmberEventControl sentimateSensorDelay;

static uint8_t lastButton;

static uint32_t  buttonPressDurationMs = 0;

/** @brief Main Init
 *
 * This function is called from the application's main function. It gives the
 * application a chance to do any initialization required at system startup. Any
 * code that you would normally put into the top of the application's main()
 * routine should be put into this function. This is called before the clusters,
 * plugins, and the network are initialized so some functionality is not yet
 * available.
        Note: No callback in the Application Framework is
 * associated with resource cleanup. If you are implementing your application on
 * a Unix host where resource cleanup is a consideration, we expect that you
 * will use the standard Posix system calls, including the use of atexit() and
 * handlers for signals such as SIGTERM, SIGINT, SIGCHLD, SIGPIPE and so on. If
 * you use the signal() function to register your signal handler, please mind
 * the returned value which may be an Application Framework function. If the
 * return value is non-null, please make sure that you call the returned
 * function from your handler to avoid negating the resource cleanup of the
 * Application Framework itself.
 *
 */
void emberAfMainInitCallback(void)
{
	
  emberAfCorePrintln("----Inside emberAfMainInitCallback----");
  ambimate_init();
  
  emberAfCorePrintln("----After ambimate_init function----");
  emberAfCorePrintln("fw_ver : %u %x", am_dev.fw_ver, am_dev.fw_ver);
  emberAfCorePrintln("fw_sub_ver : %u %x", am_dev.fw_sub_ver, am_dev.fw_sub_ver);
  emberAfCorePrintln("dev_opt : %u %x", am_dev.dev_opt, am_dev.dev_opt);
  emberAfCorePrintln("status : %u %x", am_dev.status, am_dev.status);
  
  uint8_t typeData = 0x00;
  EmberAfStatus pirTypeStatus = emberAfWriteAttribute(1, ZCL_OCCUPANCY_SENSING_CLUSTER_ID,
														 ZCL_OCCUPANCY_SENSOR_TYPE_ATTRIBUTE_ID,
														 CLUSTER_MASK_SERVER,
														 (uint8_t *)&typeData,
														 ZCL_ENUM8_ATTRIBUTE_TYPE);
  emberAfCorePrintln("EmberAfStatus pirTypeStatus : %d", pirTypeStatus);
  configure_interrupt_event_out();
  /*Reset the sensors*/
  ambimate_write_reg(AM_REG_RESET, 0xA5);
  ambimate_write_reg(AM_REG_SCAN_START, 0x01);
  emberEventControlSetDelayMS(sentimateSensorDelay, 5 * MY_DELAY_IN_MS);  //Set delay for 3 seconds
  
}

void sentimateSensorDelayHandler(void)
{
  // First thing to do inside a delay event is to disable the event till next usage
  emberEventControlSetInactive(sentimateSensorDelay);
  
  //Do something
  emberAfCorePrintln("----Inside sentimateSensorDelay handler----");
  emberAfCorePrintln("----sentimateSensorDelayHandler----event_out : %u", event_out);
  if (event_out)
  { 
		emberAfCorePrintln("----Inside event_out----");
		if (am_dev.status & 0x07)
		{
			event_out = 0;
			emberAfCorePrintln("----PIR Detected----");
			uint8_t statusData = 1;
			EmberAfStatus pirStatus = emberAfWriteAttribute(1, ZCL_OCCUPANCY_SENSING_CLUSTER_ID,
															   ZCL_VERSION_ATTRIBUTE_ID,
															   CLUSTER_MASK_SERVER,
															   (uint8_t *)&statusData,
															   ZCL_BITMAP8_ATTRIBUTE_TYPE);
													
			emberAfCorePrintln("EmberAfStatus pirStatus : %d", pirStatus);
			emberEventControlSetDelayMS(sentimateSensorDelay, 5 * MY_DELAY_IN_MS);  //Set delay for 3 seconds
			return;
		}
		else
		{
			emberAfCorePrintln("----Inside else event_out----");
			if (GPIO_PinInGet(gpioPortA, 3)==1)
			{
				am_dev.status = ambimate_read_reg(AM_REG_STATUS_H);
				emberAfCorePrintln("----sentimateSensorDelayHandler----status : %u %x", am_dev.status, am_dev.status);
			}
			else 
			{
				event_out = 0;
				emberAfCorePrintln("----PIR Not Detected----");
				uint8_t statusData = 0;
				EmberAfStatus pirStatus = emberAfWriteAttribute(1, ZCL_OCCUPANCY_SENSING_CLUSTER_ID,
															   ZCL_VERSION_ATTRIBUTE_ID,
															   CLUSTER_MASK_SERVER,
															   (uint8_t *)&statusData,
															   ZCL_BITMAP8_ATTRIBUTE_TYPE);
				emberEventControlSetDelayMS(sentimateSensorDelay, 5 * MY_DELAY_IN_MS);  //Set delay for 3 seconds
				return;
			}	
		}
		emberEventControlSetDelayMS(sentimateSensorDelay, 100);
		ambimate_write_reg(AM_REG_SCAN_START, 0x01);
		return;
  }
  //Sentimate Sensor Data Read
  emberAfCorePrintln("Reading Sensor Data");
  ambimate_read_all();
  
  emberAfCorePrintln("temperatureC : %u %2x", am_dev.temperatureC, am_dev.temperatureC);
  //emberAfCorePrintln("am_dev.temperatureF : %f", am_dev.temperatureF);
  emberAfCorePrintln("humidity : %u %2x", am_dev.humidity, am_dev.humidity);
  emberAfCorePrintln("light : %u %2x", am_dev.light, am_dev.light);
  emberAfCorePrintln("audio : %u %2x", am_dev.audio, am_dev.audio);
  emberAfCorePrintln("battV : %u %2x", am_dev.battV, am_dev.battV);
  emberAfCorePrintln("co2_ppm : %u %2x", am_dev.co2_ppm, am_dev.co2_ppm);
  emberAfCorePrintln("voc_ppm : %u %2x", am_dev.voc_ppm, am_dev.voc_ppm);
  
  emberAfCorePrintln("fw_ver : %u %x", am_dev.fw_ver, am_dev.fw_ver);
  emberAfCorePrintln("fw_sub_ver : %u %x", am_dev.fw_sub_ver, am_dev.fw_sub_ver);
  emberAfCorePrintln("dev_opt : %u %x", am_dev.dev_opt, am_dev.dev_opt);
  emberAfCorePrintln("status : %u %x", am_dev.status, am_dev.status);
  
  EmberAfStatus tempStatus = emberAfWriteAttribute(1, ZCL_TEMP_MEASUREMENT_CLUSTER_ID,
													  ZCL_CURRENT_TEMPERATURE_ATTRIBUTE_ID,
													  CLUSTER_MASK_SERVER,
													  (uint8_t *)&am_dev.temperatureC,
													  ZCL_INT16U_ATTRIBUTE_TYPE);
													
  emberAfCorePrintln("EmberAfStatus tempStatus : %d", tempStatus);
  EmberAfStatus humStatus = emberAfWriteAttribute(1, ZCL_RELATIVE_HUMIDITY_MEASUREMENT_CLUSTER_ID,
													 ZCL_RELATIVE_HUMIDITY_ATTRIBUTE_ID,
													 CLUSTER_MASK_SERVER,
													 (uint8_t *)&am_dev.humidity,
													 ZCL_INT16U_ATTRIBUTE_TYPE);
													
  emberAfCorePrintln("EmberAfStatus humStatus : %d", humStatus);
  float co2_ppm = am_dev.co2_ppm;
  EmberAfStatus co2Status = emberAfWriteAttribute(1, ZCL_CARBON_DIOXIDE_CONCENTRATION_MEASUREMENT_CLUSTER_ID,
													 ZCL_VERSION_ATTRIBUTE_ID,
													 CLUSTER_MASK_SERVER,
													 (uint8_t *)&co2_ppm,
													 ZCL_FLOAT_SINGLE_ATTRIBUTE_TYPE);
  emberAfCorePrintln("EmberAfStatus co2Status : %d", co2Status);

  /*
  emberAfCorePrintln("lr_temperature : %u %x", am_dev.lr_temperature, am_dev.lr_temperature);
  emberAfCorePrintln("lr_humidity : %u %x", am_dev.lr_humidity, am_dev.lr_humidity);
  emberAfCorePrintln("lr_light : %u %x", am_dev.lr_light, am_dev.lr_light);
  emberAfCorePrintln("lr_audio : %u %x", am_dev.lr_audio, am_dev.lr_audio);
  emberAfCorePrintln("lr_battV : %u %x", am_dev.lr_battV, am_dev.lr_battV);
  emberAfCorePrintln("lr_co2_ppm : %u %x", am_dev.lr_co2_ppm, am_dev.lr_co2_ppm);
  emberAfCorePrintln("lr_voc_ppm : %u %x", am_dev.lr_voc_ppm, am_dev.lr_voc_ppm);
  */	
  //Reschedule the event after a delay of 3 seconds
  emberEventControlSetDelayMS(sentimateSensorDelay, 5 * MY_DELAY_IN_MS);  
}

void commissioningEventHandler(void)
{
  EmberStatus status;

  emberEventControlSetInactive(commissioningEventControl);

  if (buttonPressDurationMs >= BUTTON_HOLD_DURATION_MS) {

      emberLeaveNetwork();
      return;
  }

	EmberNetworkStatus state;
	state = emberAfNetworkState();
	EmberStatus statusnetwork;
	if (state == EMBER_NO_NETWORK) {
		statusnetwork = emberAfPluginNetworkSteeringStart();
	}
	else
	{

	    emberAfGetCommandApsFrame()->sourceEndpoint = SWITCH_ENDPOINT;
		emberAfFillCommandOnOffClusterToggle();
		status = emberAfSendCommandUnicastToBindings();
	}

}
void ledEventHandler(void)
{
  emberEventControlSetInactive(ledEventControl);

  if (commissioning) {
    if (emberAfNetworkState() != EMBER_JOINED_NETWORK) {
      halToggleLed(COMMISSIONING_STATUS_LED);
      emberEventControlSetDelayMS(ledEventControl, LED_BLINK_PERIOD_MS << 1);
    } else {
      halSetLed(COMMISSIONING_STATUS_LED);
    }
  } else if (emberAfNetworkState() == EMBER_JOINED_NETWORK) {
    halSetLed(COMMISSIONING_STATUS_LED);
  }
}

void findingAndBindingEventHandler(void)
{
  emberEventControlSetInactive(findingAndBindingEventControl);
  EmberStatus status = emberAfPluginFindAndBindInitiatorStart(SWITCH_ENDPOINT);
  emberAfCorePrintln("Find and bind initiator %p: 0x%X", "start", status);
}

static void scheduleFindingAndBindingForInitiator(void)
{
  emberEventControlSetDelayMS(findingAndBindingEventControl,
                              FINDING_AND_BINDING_DELAY_MS);
}

/** @brief Stack Status
 *
 * This function is called by the application framework from the stack status
 * handler.  This callbacks provides applications an opportunity to be notified
 * of changes to the stack status and take appropriate action.  The return code
 * from this callback is ignored by the framework.  The framework will always
 * process the stack status after the callback returns.
 *
 * @param status   Ver.: always
 */
bool emberAfStackStatusCallback(EmberStatus status)
{
  if (status == EMBER_NETWORK_DOWN) {
    halClearLed(COMMISSIONING_STATUS_LED);
  } else if (status == EMBER_NETWORK_UP) {
    halSetLed(COMMISSIONING_STATUS_LED);
  }

  // This value is ignored by the framework.
  return false;
}

/** @brief Hal Button Isr
 *
 * This callback is called by the framework whenever a button is pressed on the
 * device. This callback is called within ISR context.
 *
 * @param button The button which has changed state, either BUTTON0 or BUTTON1
 * as defined in the appropriate BOARD_HEADER.  Ver.: always
 * @param state The new state of the button referenced by the button parameter,
 * either ::BUTTON_PRESSED if the button has been pressed or ::BUTTON_RELEASED
 * if the button has been released.  Ver.: always
 */
void emberAfHalButtonIsrCallback(uint8_t button,
		uint8_t state)
{
	static uint32_t timeMs;
	static uint32_t debouncetimeMs;

	if (halCommonGetInt32uMillisecondTick() - debouncetimeMs > 200)
	{
		if (state == BUTTON_PRESSED) {
			buttonPressDurationMs = 0;
			timeMs = halCommonGetInt32uMillisecondTick();
		}
		else {
			buttonPressDurationMs = elapsedTimeInt32u(timeMs, halCommonGetInt32uMillisecondTick());

			debouncetimeMs = halCommonGetInt32uMillisecondTick();

			emberEventControlSetActive(commissioningEventControl);
		}
	}
}

/** @brief Complete
 *
 * This callback is fired when the Network Steering plugin is complete.
 *
 * @param status On success this will be set to EMBER_SUCCESS to indicate a
 * network was joined successfully. On failure this will be the status code of
 * the last join or scan attempt. Ver.: always
 * @param totalBeacons The total number of 802.15.4 beacons that were heard,
 * including beacons from different devices with the same PAN ID. Ver.: always
 * @param joinAttempts The number of join attempts that were made to get onto
 * an open Zigbee network. Ver.: always
 * @param finalState The finishing state of the network steering process. From
 * this, one is able to tell on which channel mask and with which key the
 * process was complete. Ver.: always
 */
void emberAfPluginNetworkSteeringCompleteCallback(EmberStatus status,
                                                  uint8_t totalBeacons,
                                                  uint8_t joinAttempts,
                                                  uint8_t finalState)
{
  emberAfCorePrintln("%p network %p: 0x%X", "Join", "complete", status);

  if (status != EMBER_SUCCESS) {
    commissioning = false;
  } else {
    scheduleFindingAndBindingForInitiator();
  }
}

/** @brief Touch Link Complete
 *
 * This function is called by the ZLL Commissioning Common plugin when touch linking
 * completes.
 *
 * @param networkInfo The ZigBee and ZLL-specific information about the network
 * and target. Ver.: always
 * @param deviceInformationRecordCount The number of sub-device information
 * records for the target. Ver.: always
 * @param deviceInformationRecordList The list of sub-device information
 * records for the target. Ver.: always
 */
void emberAfPluginZllCommissioningCommonTouchLinkCompleteCallback(const EmberZllNetwork *networkInfo,
                                                                  uint8_t deviceInformationRecordCount,
                                                                  const EmberZllDeviceInfoRecord *deviceInformationRecordList)
{
  emberAfCorePrintln("%p network %p: 0x%X",
                     "Touchlink",
                     "complete",
                     EMBER_SUCCESS);

  scheduleFindingAndBindingForInitiator();
}

/** @brief Touch Link Failed
 *
 * This function is called by the ZLL Commissioning Client plugin if touch linking
 * fails.
 *
 * @param status The reason the touch link failed. Ver.: always
 */
/*void emberAfPluginZllCommissioningClientTouchLinkFailedCallback(EmberAfZllCommissioningStatus status)
{
  emberAfCorePrintln("%p network %p: 0x%X",
                     "Touchlink",
                     "complete",
                     EMBER_ERR_FATAL);

  commissioning = false;
}
*/
/** @brief Complete
 *
 * This callback is fired by the initiator when the Find and Bind process is
 * complete.
 *
 * @param status Status code describing the completion of the find and bind
 * process Ver.: always
 */
void emberAfPluginFindAndBindInitiatorCompleteCallback(EmberStatus status)
{
  emberAfCorePrintln("Find and bind initiator %p: 0x%X", "complete", status);

  commissioning = false;
}
