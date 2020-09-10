/*
 * adc.c
 *
 *  Created on: 14 feb 2019
 *      Author: mauro.gualdi
 */
/* Includes ------------------------------------------------------------------*/
#include "adc.h"
#include <stdio.h>
#include "em_device.h"
#include "em_chip.h"
#include "em_cmu.h"
#include "em_gpio.h"
#include "em_timer.h"
#include "em_adc.h"
//#include "arm_math.h"

/* Private define ------------------------------------------------------------*/
/* Private typedef -----------------------------------------------------------*/

/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/

/* ADC Variables */
volatile uint32_t 	adc_sample[ADC_INPUT_NUM];
volatile uint32_t 	millivolts;
uint8_t				adc_data_ready = 0;
uint32_t				audio_buf_idx = 0;
uint16_t			audio_buf[AUDIO_BUFFER_SIZE];

Audio_Stat_TypeDef_t 	audio_mic;
uint8_t buffer_audio_full = 0;

/* Private function prototypes -----------------------------------------------*/
/* Functions -----------------------------------------------------------------*/


/**************************************************************************//**
 * @brief Initialize GPIO for reading battery voltage
 *****************************************************************************/
void init_GPIO_Vbatt(void)
{
	CMU_ClockEnable(cmuClock_GPIO, true);
	/* PA5 -> EN_AN_VBATT	OUT */
	/* Configure GPIO as OUTPUT Open Drain */
	GPIO_PinModeSet(gpioPortA, 5, gpioModeWiredAnd, 0);
	GPIO_PinOutSet(gpioPortA, 5);

}

/**************************************************************************//**
 * @brief  Initialize ADC function
 *****************************************************************************/
void init_ADC(void)
{
	// Enable GPIO and clock
	CMU_ClockEnable(cmuClock_GPIO, true);
	// Enable ADC0 clock
	CMU_ClockEnable(cmuClock_ADC0, true);

	// Declare init structs
	ADC_Init_TypeDef init = ADC_INIT_DEFAULT;
	ADC_InitSingle_TypeDef initSingle = ADC_INITSINGLE_DEFAULT;
	ADC_InitScan_TypeDef initScan = ADC_INITSCAN_DEFAULT;

	// Modify init structs and initialize
	init.prescale = ADC_PrescaleCalc(ADC_FREQ, 0); // Init to max ADC clock for Series 1

#if ADC_SINGLE_CH /* Single Input Polling */
	initSingle.diff       = false;        // single ended
	initSingle.reference  = adcRefVDD;    // internal 2.5V reference
	initSingle.resolution = adcRes12Bit;  // 12-bit resolution
	initSingle.acqTime    = adcAcqTime64; // set acquisition time to meet optimal acquisition

	// Select ADC input. See README for corresponding EXP header pin.
	initSingle.posSel = adcPosSelAPORT3XCH12;

	ADC_Init(ADC0, &init);
	ADC_InitSingle(ADC0, &initSingle);
#else	/* Scan Multiple Input whit IRQ */
	initScan.diff       = 0;            // single ended
	initScan.reference  = adcRefVDD;    // External VDD reference (3.3V)
	initScan.resolution = adcRes12Bit;  // 12-bit resolution
	initScan.acqTime    = adcAcqTime64; // set acquisition time to meet optimal acquisition
	initScan.fifoOverwrite = true;      // FIFO overflow overwrites old data

	// Select ADC input. See README for corresponding EXP header pin.
	// Add VDD to scan for demonstration purposes
	/* Init GPIO for ADC
    * PA4 -> AN_VBATT
    * PB11 -> AN_ALIM
	* PF6 -> AN_AUDIO
    */
	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup0, adcPosSelAPORT3XCH12);
	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup1, adcPosSelAPORT4XCH27);
	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup2, adcPosSelAPORT1XCH22);

	// Set scan data valid level (DVL) to 2
	ADC0->SCANCTRLX |= (ADC_INPUT_NUM - 1) << _ADC_SCANCTRLX_DVL_SHIFT;

	// Clear ADC Scan fifo
	ADC0->SCANFIFOCLEAR = ADC_SCANFIFOCLEAR_SCANFIFOCLEAR;

	// Initialize ADC and Scan
	ADC_Init(ADC0, &init);
	ADC_InitScan(ADC0, &initScan);

	// Enable Scan interrupts
	ADC_IntEnable(ADC0, ADC_IEN_SCAN);

	// Enable ADC interrupts
	NVIC_ClearPendingIRQ(ADC0_IRQn);
	NVIC_EnableIRQ(ADC0_IRQn);
#endif
}

/**************************************************************************//**
 * @brief  Get ADC Data Ready Flag
 *****************************************************************************/
uint8_t get_ADC_dataready(void)
{
	return 	adc_data_ready;
}

/**************************************************************************//**
 * @brief  ADC Handler
 *****************************************************************************/
void ADC0_IRQHandler(void)
{
	uint32_t data, i, id;

		// Get ADC results
		for(i = 0; i < ADC_INPUT_NUM; i++)
		{
			// Read data from ADC
			data = ADC_DataIdScanGet(ADC0, &id);
			// Convert data to mV and store into array
			//adc_sample[i] = (uint32_t)(((float)data * ADC_VOLTAGE_REF) / ADC_RESOLUTION);
			adc_sample[i] = data;
		}
		/* Disable AN_BATT Measure */
		set_vbatt_measure(0);
		/* Set Flag */
		adc_data_ready = 1;
		/* Store Audio */
			if (audio_buf_idx >= AUDIO_BUFFER_SIZE)
			{
				if(buffer_audio_full)
					return;
				buffer_audio_full = 1;
			}
			else
			{
				/* Conversion and apply a Gain */
				audio_buf[audio_buf_idx++] = (uint16_t)(adc_sample[2]);
			}

}


/**************************************************************************//**
 * @brief  Select Vbatt Measurement function
 *****************************************************************************/
void set_vbatt_measure(uint8_t status)
{
	if (status == 1)
	{
		GPIO_PinOutClear(gpioPortA, 5);
	}
	else
	{
		GPIO_PinOutSet(gpioPortA, 5);
	}
}

/**************************************************************************//**
 * @brief  Start ADC Scan conversion
 *****************************************************************************/
void start_ADC_scan(void)
{
	/* Enable AN_BATT Measure */
	set_vbatt_measure(1);
	/* Clear Flag */
	adc_data_ready = 0;
	/* Start next ADC conversion */
	ADC_Start(ADC0, adcStartScan);
}


/**************************************************************************//**
 * @brief  Read Battery status from ADC
 *****************************************************************************/
/* NOTE
 * Calculate input voltage in mV:
 * BATT-IN_____
 * 			|
 * 			R1 = 10K
 * 			|
 * 			-- AN_VBATT->ADC
 * 			|
 * 			R2 = 100K
 * 			|
 * 			 /-- EN_AN_VBATT<-GPIO
 * 			|
 * 			GND
 * 	V_BATT = AN_VBATT * (R1 + R2) / R2 = AN_VBATT * (100000 + 10000) / 100000 = AN_VBATT * 1.1
 * 	AN_VBATT = (ADC * ADC_VREF) / ADC_RESOLUTION
 *
 * Calculate Battery in Percent (%):
 * VBattMax = 3000mV
 * VBattmin = 2400mV
 * Conversion voltage to Percent whit REMAP Macro
 */

void read_Batt(uint8_t *pPercent, int16_t *pmVolt)
{
#if ADC_SINGLE_CH /* Single Input Polling */
	/* Enable AN_BATT Measure */
	set_vbatt_measure(1);
	/* Add delay of 5ms (1 ms ~3100) */
	for(volatile long i = 0; i < (3100 * 5); i++);

	// Start ADC conversion
	ADC_Start(ADC0, adcStartSingle);
	// Wait for conversion to be complete
	while(!(ADC0->STATUS & _ADC_STATUS_SINGLEDV_MASK));
	// Get ADC result
	adc_sample[0] = ADC_DataSingleGet(ADC0);

	/* Calculate input voltage in mV */
	*pmVolt = (uint32_t)(((float)adc_sample[0] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * 1.10;
	if (*pmVolt > 3000)
	{
		*pmVolt = 3000;
	}

	/* Calculate Battery % */
	__REMAP_VALUE(*pPercent, *pmVolt, 2400, 3000, 10, 100);

	/* Disable AN_BATT Measure */
	set_vbatt_measure(0);
#else
	//if (adc_data_ready == 0)
	if (adc_sample[0] == 0)
	{
		return;
	}
	/* Calculate input voltage in mV */
	*pmVolt = (int16_t)(((float)adc_sample[0] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * AN_VBATT_RATIO;	//1.10;
	if (*pmVolt > BATTERY_VOLTAGE_MAX)
	{
		*pmVolt = BATTERY_VOLTAGE_MAX;
	}
	if (*pmVolt < BATTERY_VOLTAGE_MIN)
	{
		*pmVolt = BATTERY_VOLTAGE_MIN;
	}
	/* Calculate Battery % */
	__REMAP_VALUE(*pPercent, *pmVolt, BATTERY_VOLTAGE_MIN, BATTERY_VOLTAGE_MAX, 1, 100);
#endif
}


void read_Powersupply(int16_t *pmVolt)
{
	//if (adc_data_ready == 0)
	if (adc_sample[1] == 0)
	{
		return;
	}
	/* Calculate input voltage in mV */
	*pmVolt = (int16_t)(((float)adc_sample[1] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * AN_ALIM_RATIO;	//11.0;
	/*
	if (*pmVolt > 40000)
	{
	 *pmVolt = 40000;
	}
	 */
}
