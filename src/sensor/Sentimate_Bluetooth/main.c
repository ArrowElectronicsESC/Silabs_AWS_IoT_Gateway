/***********************************************************************************************//**
 * \file   main.c
 * \brief  Silicon Labs Empty Example Project
 *
 * This example demonstrates the bare minimum needed for a Blue Gecko C application
 * that allows Over-the-Air Device Firmware Upgrading (OTA DFU). The application
 * starts advertising after boot and restarts advertising after a connection is closed.
 ***************************************************************************************************
 * <b> (C) Copyright 2016 Silicon Labs, http://www.silabs.com</b>
 ***************************************************************************************************
 * This file is licensed under the Silabs License Agreement. See the file
 * "Silabs_License_Agreement.txt" for details. Before using this software for
 * any purpose, you must agree to the terms of that agreement.
 **************************************************************************************************/

#include <stdlib.h>

/* Board headers */
#include "init_mcu.h"
#include "init_board.h"
#include "ble-configuration.h"
#include "board_features.h"

/* Bluetooth stack headers */
#include "bg_types.h"
#include "native_gecko.h"
#include "gatt_db.h"

/* Libraries containing default Gecko configuration values */
#include "em_emu.h"
#include "em_cmu.h"
#include "em_cryotimer.h"
#include "em_timer.h"

/* Device initialization header */
#include "hal-config.h"

#if defined(HAL_CONFIG)
#include "bsphalconfig.h"
#else
#include "bspconfig.h"
#endif

#include "infrastructure.h"

#include "ambimate.h"
#include "sentimate_app.h"
#include "sys_tick.h"
#include "led_rgb.h"
#include "adc.h"

#include "log.h"
#include "retargetserial.h"
#include <stdio.h>

/***********************************************************************************************//**
 * @addtogroup Application
 * @{
 **************************************************************************************************/

/* NOTE:
 * For change the name of the device Bluetooth go in to file gatt_db.c and fin the line
 * "bg_gattdb_data_attribute_field_10_data"
 * the sting is stored as Hex data
 */

/***********************************************************************************************//**
 * @addtogroup app
 * @{
 **************************************************************************************************/
/* Private define ------------------------------------------------------------*/
#ifndef MAX_CONNECTIONS
	#define MAX_CONNECTIONS 4
#endif
#define gattdb_sound_level                   50

#define APP_GENERIC				0	/* Set to 1 if use app different to Blue Gecko */

/* Private typedef -----------------------------------------------------------*/
typedef enum
{
	APP_BOOT = (uint8_t)0,
	APP_IDLE,
	APP_NOT_CONNECTED,
	APP_CONNECTED,
	APP_SEND,
	APP_AUDIO_BEAT
}Conection_Status_TypeDef;

/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/

uint8_t bluetooth_stack_heap[DEFAULT_BLUETOOTH_HEAP(MAX_CONNECTIONS)];

/* Application */
Conection_Status_TypeDef app_status;
uint32_t cryo_event_cnt = 0;
uint32_t adc_event_cnt = 0;
uint32_t led_event_cnt = 0;

/* AmbiMate Device */
extern AmbiMate_Devie_TypeDef_t	am_dev;
int16_t temp = 0;
int16_t press = 0;
int16_t PIR_alert = 0;
int16_t Button_alert = 0;
int16_t analog = 0;
int16_t light = 0;

int16_t humidity = 100;
int16_t co2 = 0;

extern Audio_Stat_TypeDef_t 	audio_mic;

// Gecko configuration parameters (see gecko_configuration.h)
static const gecko_configuration_t config = {
  .config_flags = 0,
  //.sleep.flags = SLEEP_FLAGS_DEEP_SLEEP_ENABLE,
  .sleep.flags = 0,
  .bluetooth.max_connections = MAX_CONNECTIONS,
  .bluetooth.heap = bluetooth_stack_heap,
  .bluetooth.heap_size = sizeof(bluetooth_stack_heap),
  .bluetooth.sleep_clock_accuracy = 100, // ppm
  .gattdb = &bg_gattdb_data,
  .ota.flags = 0,
  .ota.device_name_len = 3,
  .ota.device_name_ptr = "OTA",
#if (HAL_PA_ENABLE) && defined(FEATURE_PA_HIGH_POWER)
  .pa.config_enable = 1, // Enable high power PA
  .pa.input = GECKO_RADIO_PA_INPUT_VBAT, // Configure PA input to VBAT
#endif // (HAL_PA_ENABLE) && defined(FEATURE_PA_HIGH_POWER)
};

// Flag for indicating DFU Reset must be performed
uint8_t boot_to_dfu = 0;

/**
 * @brief  Main function
 */
void main(void)
{
	// Initialize device
	initMcu();
	// Initialize board
	initBoard();
	// Initialize stack
	gecko_init(&config);

	INIT_LOG();
	LOGI(RTT_CTRL_CLEAR"------------Compiled------------ %s %s\n", (uint32_t)__DATE__, (uint32_t)__TIME__);

	//RETARGET_SerialInit();
	//printf("hello world\r\n");

	init_TIMER1();

	init_CRYOTIMER_event(cryotimerPeriod_1k);

	app_status = APP_BOOT;

	INIT_LOG();
	LOGI(RTT_CTRL_CLEAR"------------Compiled------------ %s %s\n", (uint32_t)__DATE__, (uint32_t)__TIME__);
  while (1)
  {
    /* Event pointer for handling events */
    struct gecko_cmd_packet* evt;

    /* Check for stack event. */
    //evt = gecko_wait_event();
    evt = gecko_peek_event();
    //log_events(evt);

    /* Handle events */
    switch (BGLIB_MSG_ID(evt->header)) {
      /* This boot event is generated when the system boots up after reset.
       * Do not call any stack commands before receiving the boot event.
       * Here the system is set to start advertising immediately after boot procedure. */
      case gecko_evt_system_boot_id:

        /* Set advertising parameters. 100ms advertisement interval.
         * The first parameter is advertising set handle
         * The next two parameters are minimum and maximum advertising interval, both in
         * units of (milliseconds * 1.6).
         * The last two parameters are duration and maxevents left as default. */
        gecko_cmd_le_gap_set_advertise_timing(0, 160, 160, 0, 0);

        /* Start general advertising and enable connections. */
        gecko_cmd_le_gap_start_advertising(0, le_gap_general_discoverable, le_gap_connectable_scannable);

    	// Start the Cryotimer
    	CRYOTIMER_Enable(true);
    	//
    	app_status = APP_IDLE;

    	//LOGD("Advertising started.\r\n");
        break;

      case gecko_evt_le_connection_opened_id:
          /* Application Connected */
    	  app_status = APP_CONNECTED;
    	  break;

      case gecko_evt_le_connection_closed_id:
        /* Check if need to boot to dfu mode */
        if (boot_to_dfu) {
          /* Enter to DFU OTA mode */
          gecko_cmd_system_reset(2);
        } else {
          /* Restart advertising after client has disconnected */
          gecko_cmd_le_gap_start_advertising(0, le_gap_general_discoverable, le_gap_connectable_scannable);
          //LOGD("Disconnected, Advertising re-started.\r\n");
        }
        /* Application Disconnected */
    	app_status = APP_NOT_CONNECTED;
        break;

      case gecko_evt_gatt_server_user_write_request_id:
    	  if (evt->data.evt_gatt_server_user_write_request.characteristic == gattdb_sound_level)
    	  {
    		  analog = evt->data.evt_gatt_server_user_write_request.value.data[0];
    		  //audio_mic.noise_mid_th = analog;
    		  //audio_mic.noise_high_th = (int16_t)((float)analog * 1.4);		/* High thr 40% higher */
    		  gecko_cmd_gatt_server_send_user_write_response(evt->data.evt_gatt_server_user_write_request.connection, gattdb_sound_level, 0);
    	  }
    	  break;

      default:
    	  /* No Event */
        break;
    }
    if (cryo_event_cnt > led_event_cnt)
    {
        app_LED_feedback((uint8_t)app_status, cryo_event_cnt);
        led_event_cnt = cryo_event_cnt;
    }
    /* Wait IRQ */
    __WFI();
#if 0
    // Go into EM4 and wait for Cryotimer wakeup
    // At this point, both LEDs will be off since there is no GPIO retention
    EMU_EnterEM4();
#endif
  }
}


void CRYOTIMER_IRQHandler(void)
{
	uint32_t cryo_flags;

	uint8_t htmTempBuffer[5]; 	/* Stores the temperature data in the Health Thermometer (HTM) format. */
	uint8_t flags = 0x00;   	/* HTM flags set as 0 for Celsius, no time stamp and no temperature type. */
	int32_t temperature;   	/* Stores the temperature data read from the sensor in the correct format */
	uint8_t *p = htmTempBuffer; /* Pointer to HTM temperature buffer needed for converting values to bitstream. */
	uint32_t humidity;
	uint16 lux_to_W;
	uint8_t co2_tmp[3];
	uint8_t battery_percent = 0;
	int16_t battery_mV = 0;
	int16_t alim_mV = 0;

	/* Acknowledge the interrupt */
	cryo_flags = CRYOTIMER_IntGet();
	CRYOTIMER_IntClear(cryo_flags);
	cryo_event_cnt++;

	/* Check App status */
	if (app_status != APP_CONNECTED)
	{
		clear_button_event();
		return;
	}

	/* Button Event */
	if (get_button_event() == 1)
	{
		/* Update Alert */
		Button_alert = 0x02;
		clear_button_event();
	}
	else
	{
		Button_alert = 0x00;
	}
	gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_User_Button, 1, (uint8_t*) &Button_alert);

	/* Check frequency send data (every 3 seconds) */
	if ((cryo_event_cnt % 10) != 0)
	{
		return;
	}

	/* Check AmbiMate sensor */
	if (ambimate_read_all() != 0)
	{
		/* No data available */
		return;
	}

	/* LED Feedback */
	app_LED_feedback((uint8_t)app_status, cryo_event_cnt);
    led_event_cnt = cryo_event_cnt;

//	if (get_ADC_dataready() == 1)
	{
		read_Batt(&battery_percent, &battery_mV);
		read_Powersupply(&alim_mV);
		gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_battery_level, 1, &battery_percent);
		gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_analog, sizeof(int16_t), (uint8_t*) &analog);
	}

	/* Check PIR Motion detected Event */
	if (am_dev.status & AM_BIT_STATUS_PIR_EV)
	{
		/* PIR Event HIGH */
		PIR_alert = 0x01;
	}
	else if (am_dev.status & AM_BIT_STATUS_PIR)
	{
		/* PIR Motion Detect MID */
		PIR_alert = 0x01;
	}
	else
	{
		/* Nothing NO */
		PIR_alert = 0x00;
	}
	gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_alert_level_2, 1, (uint8_t*) &PIR_alert);

	//TEMPERATURE
	/* Convert flags to bitstream and append them in the HTM temperature data buffer (htmTempBuffer) */
	//UINT8_TO_BITSTREAM(p, flags);
	/* Convert sensor data to correct temperature format (Decimal point) */
	//temperature = FLT_TO_INT32((am_dev.temperatureC * 100), -2);
	temperature = (uint32_t)(am_dev.temperatureC);

	/* Convert temperature to bitstream and place it in the HTM temperature data buffer (htmTempBuffer) */
	//*p = (uint8_t*)&(htmTempBuffer[0]);
	//UINT32_TO_BITSTREAM(p, temperature);
	/* Send indication of the temperature in htmTempBuffer to all "listening" clients.
	 * This enables the Temperature Measurement in the Blue Gecko app to display the temperature.
	 *  0xFF as connection ID will send indications to all connections. */
	//gecko_cmd_gatt_server_send_characteristic_notification(
		//	0xFF, gattdb_temperature_measurement, 5, htmTempBuffer);
	gecko_cmd_gatt_server_send_characteristic_notification(
			0xFF, gattdb_temperature_measurement, 2, &temperature);

	//HUMIDITY
	/* Convert sensor data to correct humidity format (Percentage) */
//#if APP_GENERIC
	//humidity = (uint32_t)(am_dev.humidity * 100);
//#else
	humidity = (uint32_t)(am_dev.humidity);
//#endif
	/* Send indication of the humidity to all "listening" clients.
	 * This enables the Humidity in the Blue Gecko app to display the humidity.
	 *  0xFF as connection ID will send indications to all connections. */
	gecko_cmd_gatt_server_send_characteristic_notification(
			0xFF, gattdb_humidity, 2, &humidity);

	//LIGHT
	/* Resolution of the Characteristics is 0.1W/m2 */
	lux_to_W = (uint16_t)((0.0079 * (float)am_dev.light) * 10);
	gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_irradiance, 2, (uint8_t*) &lux_to_W);

	//CO2
	co2_tmp[0] = (uint8_t)am_dev.co2_ppm;
	co2_tmp[1] = (uint8_t)(am_dev.co2_ppm >> 8);
	co2_tmp[2] = 0;
	gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_pollen_concentration, 3, co2_tmp);

	/* Check AUDIO Event */
	/*
#if 0
	if (am_dev.status & AM_BIT_STATUS_AUDIO)
	{
		alert = 0x02;
		gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_alert_level_2_2, 1, (uint8_t*) &alert);
	}
	else
	{
		alert = 0x00;
		gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_alert_level_2_2, 1, (uint8_t*) &alert);
	}
#endif
	*/
	//if ((am_dev.audio != 0) || (am_dev.lr_audio != 0))
	/* */
	//gecko_cmd_gatt_server_send_characteristic_notification(0xFF, gattdb_alert_level_2_2, 1, (uint8_t*) &audio_mic.noise_event);
	//if (audio_mic.noise_event)
	//{
		/* LED Feedback */
	//	app_status = APP_AUDIO_BEAT;
		//app_LED_feedback((uint8_t)app_status, cryo_event_cnt);
	//	app_status = APP_CONNECTED;
		/* Clear */
	//	audio_mic.noise_event = 0;
	//}
	/* Update battery value during maximum Load (Bluetooth Activity)*/
	//start_ADC_scan();	//the ADC is Started by Timer @ 1KHz

	/* Add delay of 50ms for LED (1 ms ~3100) @ CPU_FREQUENCY = MAX */
	//for(volatile long i = 0; i < (3100 * 50); i++);
}


void init_TIMER1(void)
{
	TIMER_Init_TypeDef timerInit = TIMER_INIT_DEFAULT;

	// Enable clock for TIMER1 module
	CMU_ClockEnable(cmuClock_TIMER1, true);

	// Set top value to overflow at the desired PWM_FREQ frequency
	TIMER_TopSet(TIMER1, CMU_ClockFreqGet(cmuClock_TIMER1) / 500);

	// Initialize the timer
	TIMER_Init(TIMER1, &timerInit);

	// Enable TIMER0 compare event interrupts to update the duty cycle
	TIMER_IntEnable(TIMER1, TIMER_IEN_OF);
	/* Enable IRQ */
	NVIC_EnableIRQ(TIMER1_IRQn);
	NVIC_SetPriority(TIMER1_IRQn, 0);
}

/**************************************************************************//**
* @brief Interrupt handler for TIMER
*****************************************************************************/
void TIMER1_IRQHandler(void)
{
 // Acknowledge the interrupt
 uint32_t flags = TIMER_IntGet(TIMER1);
 /* Clear flag */
 TIMER_IntClear(TIMER1, flags);
 /* Start ADC conversion @ 1KHz sampling rate */
 start_ADC_scan();
}


/**************************************************************************//**
 * @brief  Initialize CRYOTIMER
 *****************************************************************************/
void init_CRYOTIMER_event(CRYOTIMER_Period_TypeDef period)
{
	CRYOTIMER_Init_TypeDef init = CRYOTIMER_INIT_DEFAULT;

	/* Enable clock to CRYOTIMER module */
	CMU_ClockEnable(cmuClock_CRYOTIMER ,true);
	/* Configure the CRYOTIMER to use the ULFRCO which is running at 1 KHz
	 * and trigger an EM4 wakeup every cryotimerPeriod_1k -> 1024/1000 = 1,024s. */
	init.osc       = cryotimerOscULFRCO;	// Use the ULFRCO
	init.em4Wakeup = true;					// Enable EM4 wakeup upon triggering a Cryotimer interrupt
	init.presc     = cryotimerPresc_1;		// Set the prescaler
	init.period    = period;   				// Set when wakeup events occur
	init.enable    = false;					// Reset the Cryotimer and don't start the timer
	/* Configure */
	CRYOTIMER_Init(&init);
	/* Enable Cryotimer interrupts */
	CRYOTIMER_IntEnable(CRYOTIMER_IEN_PERIOD);
	/* Enable IRQ */
	NVIC_EnableIRQ(CRYOTIMER_IRQn);
	NVIC_SetPriority(CRYOTIMER_IRQn, 10);
}

/** @} (end addtogroup app) */
/** @} (end addtogroup Application) */
