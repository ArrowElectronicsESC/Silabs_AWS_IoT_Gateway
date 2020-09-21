///*
// * sentimate_app.c
// *
// *  Created on: 13 feb 2019
// *      Author: mauro.gualdi
// */
//
///* Includes ------------------------------------------------------------------*/
//#include <stdio.h>
//#include "em_device.h"
//#include "em_chip.h"
//#include "em_cmu.h"
//#include "em_emu.h"
//#include "em_adc.h"
//#include "em_gpio.h"
//#include "em_timer.h"
//#include "em_cryotimer.h"
//
//#include "arm_math.h"
//
//#include "led_rgb.h"
//#include "sys_tick.h"
//#include "ambimate.h"
//#include "sentimate_app.h"
///* Private define ------------------------------------------------------------*/
//
///* Sentimate hardware Version */
//#define SENTIMATE_HW		2
//
//
///*
// * Voltage Divider
// */
//#if (SENTIMATE_HW == 1)
//	#define AN_ALIM_R1		(float)100000.0		/* 100K */
//	#define AN_ALIM_R2		(float)10000.0		/* 10K */
//
//	#define AN_VBATT_R1		(float)10000.0		/* 10K */
//	#define AN_VBATT_R2		(float)100000.0		/* 100K */
//#else
//	#define AN_ALIM_R1		(float)100000.0		/* 100K */
//	#define AN_ALIM_R2		(float)8200.0		/* 8K2 */
//
//	#define AN_VBATT_R1		(float)10000.0		/* 10K */
//	#define AN_VBATT_R2		(float)100000.0		/* 100K */
//#endif
//
//#define AN_ALIM_RATIO		((AN_ALIM_R1 + AN_ALIM_R2) / AN_ALIM_R2)
//#define AN_VBATT_RATIO		((AN_VBATT_R1 + AN_VBATT_R2) / AN_VBATT_R2)
//
//#define BATTERY_VOLTAGE_MIN		(float)1900.0	/* 1900 [mV] */
//#define BATTERY_VOLTAGE_MAX		(float)3000.0	/* 3000 [mV] */
//
///* Private typedef -----------------------------------------------------------*/
//
///* Private macro -------------------------------------------------------------*/
///* Private variables ---------------------------------------------------------*/
//
///* ADC Variables */
//volatile uint32_t 	adc_sample[ADC_INPUT_NUM];
//volatile uint32_t 	millivolts;
//uint8_t				adc_data_ready = 0;
//uint8_t				audio_buf_idx = 0;
//uint16_t			audio_buf[AUDIO_BUFFER_SIZE];
//
//Audio_Stat_TypeDef_t 	audio_mic;
//
///* Push Button */
//uint8_t				button_event = 0;
//
///* Private function prototypes -----------------------------------------------*/
///* Functions -----------------------------------------------------------------*/
//
///**************************************************************************//**
// * @brief  Initialization of the AmbiMate Sensor
// *****************************************************************************/
//void sentimate_bsp_init(void)
//{
//	/* Scaling Voltage LOW */
//	EMU_VScaleEM01_TypeDef vscale;
//	CMU_Clock_TypeDef SystemCoreClock, SysTickCoreClock;
//
//	SystemCoreClock = CMU_ClockFreqGet(cmuClock_CORE);
//	vscale = EMU_VScaleGet();
//	if (vscale == emuVScaleEM01_HighPerformance)
//	{
//		scaleDown(cmuHFRCOFreq_7M0Hz);
//	}
//	SystemCoreClock = CMU_ClockFreqGet(cmuClock_CORE);
//	SysTickCoreClock = CMU_ClockFreqGet(cmuClock_SYSTICK);
//
//	/* Init SysTick */
//	init_TIM_SysTick();
//	//SysTick_Config();	/* Under core_cm4.h file*/
//
//	/* Init GPIO for I/O */
//	init_GPIO();
//
//
//	/* Initialize the Cryotimer and EM4 settings */
//	init_CRYOTIMER_event(cryotimerPeriod_1k);
//	initEm4();
//	// Start the Cryotimer
//	//CRYOTIMER_Enable(true);
//
//	/* Init PWM for LED RGB
//	 * PA0 -> LED_R
//	 * PA1 -> LED_G
//	 * PA2 -> LED_B
//	 */
//	init_TIM_PWM_LED();
//
//	/* Init GPIO for ADC
//	 * PA4 -> AN_VBATT
//	 * PB11 -> AN_ALIM
//	 * PF6 -> AN_AUDIO
//	 */
//	init_ADC();
//	// Start first conversion
//	//start_ADC_scan();
//	audio_mic.noise_mid_th = 30;
//	audio_mic.noise_high_th = 60;
//
//	/* Init GPIO for ZWAVE UART0
//	 * PF5 -> SER0_RX
//	 * PF4 -> SER0_TX
//	 */
//
//
//	/* Init AmbiMate Sensor */
//	ambimate_init();
//}
//
//
//
//
///**************************************************************************//**
// * @brief  Initialize ADC function
// *****************************************************************************/
//void init_ADC(void)
//{
//	// Enable GPIO and clock
//	CMU_ClockEnable(cmuClock_GPIO, true);
//	// Enable ADC0 clock
//	CMU_ClockEnable(cmuClock_ADC0, true);
//
//	// Declare init structs
//	ADC_Init_TypeDef init = ADC_INIT_DEFAULT;
//	ADC_InitSingle_TypeDef initSingle = ADC_INITSINGLE_DEFAULT;
//	ADC_InitScan_TypeDef initScan = ADC_INITSCAN_DEFAULT;
//
//	// Modify init structs and initialize
//	init.prescale = ADC_PrescaleCalc(ADC_FREQ, 0); // Init to max ADC clock for Series 1
//
//#if ADC_SINGLE_CH /* Single Input Polling */
//	initSingle.diff       = false;        // single ended
//	initSingle.reference  = adcRefVDD;    // internal 2.5V reference
//	initSingle.resolution = adcRes12Bit;  // 12-bit resolution
//	initSingle.acqTime    = adcAcqTime64; // set acquisition time to meet optimal acquisition
//
//	// Select ADC input. See README for corresponding EXP header pin.
//	initSingle.posSel = adcPosSelAPORT3XCH12;
//
//	ADC_Init(ADC0, &init);
//	ADC_InitSingle(ADC0, &initSingle);
//#else	/* Scan Multiple Input whit IRQ */
//	initScan.diff       = 0;            // single ended
//	initScan.reference  = adcRefVDD;    // External VDD reference (3.3V)
//	initScan.resolution = adcRes12Bit;  // 12-bit resolution
//	initScan.acqTime    = adcAcqTime64; // set acquisition time to meet optimal acquisition
//	initScan.fifoOverwrite = true;      // FIFO overflow overwrites old data
//
//	// Select ADC input. See README for corresponding EXP header pin.
//	// Add VDD to scan for demonstration purposes
//	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup0, adcPosSelAPORT3XCH12);
//	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup1, adcPosSelAPORT4XCH27);
//	ADC_ScanSingleEndedInputAdd(&initScan, adcScanInputGroup2, adcPosSelAPORT1XCH22);
//
//	// Set scan data valid level (DVL) to 2
//	ADC0->SCANCTRLX |= (ADC_INPUT_NUM - 1) << _ADC_SCANCTRLX_DVL_SHIFT;
//
//	// Clear ADC Scan fifo
//	ADC0->SCANFIFOCLEAR = ADC_SCANFIFOCLEAR_SCANFIFOCLEAR;
//
//	// Initialize ADC and Scan
//	ADC_Init(ADC0, &init);
//	ADC_InitScan(ADC0, &initScan);
//
//	// Enable Scan interrupts
//	ADC_IntEnable(ADC0, ADC_IEN_SCAN);
//
//	// Enable ADC interrupts
//	NVIC_ClearPendingIRQ(ADC0_IRQn);
//	NVIC_EnableIRQ(ADC0_IRQn);
//#endif
//}
//
///**************************************************************************//**
// * @brief  Start ADC Scan conversion
// *****************************************************************************/
//void start_ADC_scan(void)
//{
//	/* Enable AN_BATT Measure */
//	set_vbatt_measure(1);
//	/* Clear Flag */
//	adc_data_ready = 0;
//	/* Start next ADC conversion */
//	ADC_Start(ADC0, adcStartScan);
//}
//
///**************************************************************************//**
// * @brief  Read Battery status from ADC
// *****************************************************************************/
///* NOTE
// * Calculate input voltage in mV:
// * BATT-IN_____
// * 			|
// * 			R1 = 10K
// * 			|
// * 			-- AN_VBATT->ADC
// * 			|
// * 			R2 = 100K
// * 			|
// * 			 /-- EN_AN_VBATT<-GPIO
// * 			|
// * 			GND
// * 	V_BATT = AN_VBATT * (R1 + R2) / R2 = AN_VBATT * (100000 + 10000) / 100000 = AN_VBATT * AN_VBATT_RATIO
// * 	AN_VBATT = (ADC * ADC_VREF) / ADC_RESOLUTION
// *
// * Calculate Battery in Percent (%):
// * VBattMax = 3000mV
// * VBattmin = 2400mV
// * Conversion voltage to Percent whit REMAP Macro
// */
//
//void sentimate_read_batt(uint8_t *pPercent, int16_t *pmVolt)
//{
//#if ADC_SINGLE_CH /* Single Input Polling */
//	/* Enable AN_BATT Measure */
//	set_vbatt_measure(1);
//	/* Add delay of 5ms (1 ms ~3100) */
//	for(volatile long i = 0; i < (3100 * 5); i++);
//
//	// Start ADC conversion
//	ADC_Start(ADC0, adcStartSingle);
//	// Wait for conversion to be complete
//	while(!(ADC0->STATUS & _ADC_STATUS_SINGLEDV_MASK));
//	// Get ADC result
//	adc_sample[0] = ADC_DataSingleGet(ADC0);
//
//	/* Calculate input voltage in mV */
//	*pmVolt = (uint32_t)(((float)adc_sample[0] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * 1.10;
//	if (*pmVolt > 3000)
//	{
//		*pmVolt = 3000;
//	}
//
//	/* Calculate Battery % */
//	__REMAP_VALUE(*pPercent, *pmVolt, 2400, 3000, 10, 100);
//
//	/* Disable AN_BATT Measure */
//	set_vbatt_measure(0);
//#else
//	//if (adc_data_ready == 0)
//	if (adc_sample[0] == 0)
//	{
//		return;
//	}
//	/* Calculate input voltage in mV */
//	*pmVolt = (int16_t)(((float)adc_sample[0] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * AN_VBATT_RATIO;	//1.10;
//	if (*pmVolt > BATTERY_VOLTAGE_MAX)
//	{
//		*pmVolt = BATTERY_VOLTAGE_MAX;
//	}
//	if (*pmVolt < BATTERY_VOLTAGE_MIN)
//	{
//		*pmVolt = BATTERY_VOLTAGE_MIN;
//	}
//	/* Calculate Battery % */
//	__REMAP_VALUE(*pPercent, *pmVolt, BATTERY_VOLTAGE_MIN, BATTERY_VOLTAGE_MAX, 1, 100);
//#endif
//}
//
///* NOTE
// * Calculate input voltage in mV:
// * VALIM_____
// * 			|
// * 			R1 = 100K
// * 			|
// * 			-- AN_ALIM->ADC
// * 			|
// * 			R2 = 10K
// * 			|
// * 			GND
// * 	VALIM = AN_ALIM * (R1 + R2) / R2 = AN_ALIM * (10000 + 100000) / 10000 = AN_ALIM * AN_ALIM_RATIO
// * 	AN_ALIM = (ADC * ADC_VREF) / ADC_RESOLUTION
// */
//
//void sentimate_read_powersupply(int16_t *pmVolt)
//{
//	//if (adc_data_ready == 0)
//	if (adc_sample[1] == 0)
//	{
//		return;
//	}
//	/* Calculate input voltage in mV */
//	*pmVolt = (int16_t)(((float)adc_sample[1] * ADC_VOLTAGE_REF) / ADC_RESOLUTION) * AN_ALIM_RATIO;	//11.0;
//	/*
//	if (*pmVolt > 40000)
//	{
//		*pmVolt = 40000;
//	}
//	*/
//}
//
///**************************************************************************//**
// * @brief  Select Vbatt Measurement function
// *****************************************************************************/
//void set_vbatt_measure(uint8_t status)
//{
//#if (SENTIMATE_HW == 1)
//	/* Enable with N-MOS */
//	if (status == 1)
//	{
//		GPIO_PinOutSet(gpioPortA, 5);
//	}
//	else
//	{
//		GPIO_PinOutClear(gpioPortA, 5);
//	}
//#else
//	/* Enable with P-MOS */
//	if (status == 1)
//	{
//		GPIO_PinOutClear(gpioPortA, 5);
//	}
//	else
//	{
//		GPIO_PinOutSet(gpioPortA, 5);
//	}
//#endif
//}
//
///**************************************************************************//**
// * @brief  ADC Handler
// *****************************************************************************/
//void ADC0_IRQHandler(void)
//{
//	uint32_t data, i, id;
//
//	// Get ADC results
//	for(i = 0; i < ADC_INPUT_NUM; i++)
//	{
//		// Read data from ADC
//		data = ADC_DataIdScanGet(ADC0, &id);
//		// Convert data to mV and store into array
//		//adc_sample[i] = (uint32_t)(((float)data * ADC_VOLTAGE_REF) / ADC_RESOLUTION);
//		adc_sample[i] = data;
//	}
//	/* Disable AN_BATT Measure */
//	set_vbatt_measure(0);
//	/* Set Flag */
//	adc_data_ready = 1;
//	/* Store Audio */
//	if (audio_buf_idx >= AUDIO_BUFFER_SIZE)
//	{
//		audio_buf_idx = 0;
//		/* Calculate RMS = sqr(Summ x²) */
//		arm_rms_q15((q15_t*)&audio_buf[0], AUDIO_BUFFER_SIZE, (q15_t*)&audio_mic.rms_val);
//		/* Calculate min-Max */
//		arm_max_q15((q15_t*)&audio_buf[0], AUDIO_BUFFER_SIZE, (q15_t*)&audio_mic.max_val, &audio_mic.max_idx);
//		arm_min_q15((q15_t*)&audio_buf[0], AUDIO_BUFFER_SIZE, (q15_t*)&audio_mic.min_val, &audio_mic.min_idx);
//		/* Calculate Average value */
//		arm_mean_q15((q15_t*)&audio_buf[0], AUDIO_BUFFER_SIZE, (q15_t*)&audio_mic.mean_val);
//		/* Calculate Difference */
//		audio_mic.diff_val = (audio_mic.rms_val - audio_mic.mean_val);
//		if (audio_mic.diff_val > audio_mic.noise_high_th)
//		{
//			audio_mic.noise_event = 2;
//		}
//		else if (audio_mic.diff_val > audio_mic.noise_mid_th)
//		{
//			audio_mic.noise_event = 1;
//		}
//	}
//	else
//	{
//		/* Conversion and apply a Gain */
//		audio_buf[audio_buf_idx++] = (uint16_t)(adc_sample[2] * 2.0);
//	}
//}
//
///**************************************************************************//**
// * @brief  Get ADC Data Ready Flag
// *****************************************************************************/
//uint8_t get_ADC_dataready(void)
//{
//	return 	adc_data_ready;
//}
//
//
///**************************************************************************//**
// * @brief
// *    Initialize the GPIO clock and set button as an input
// *
// * @details
// *    The buttons are active low and therefore the code triggers on a falling
// *    edge.
// *****************************************************************************/
//void init_GPIO(void)
//{
//	/* Enabling clock to the GPIO */
//	CMU_ClockEnable(cmuClock_GPIO, true);
//
//#if (SENTIMATE_HW == 1)
//	/* PA5 -> EN_AN_VBATT	OUT */
//	/* Configure GPIO as OUTPUT Push-Pull */
//	GPIO_PinModeSet(gpioPortA, 5, gpioModePushPull, 0);
//	GPIO_PinOutClear(gpioPortA, 5);
//	/* PD13 -> WAKE_ZWAVE	OUT */
//	GPIO_PinModeSet(gpioPortD, 13, gpioModePushPull, 1);
//	/* PD15 -> EN_PP		OUT */
//	GPIO_PinModeSet(gpioPortD, 15, gpioModePushPull, 1);
//	/* PB13 -> WP_FLASH		OUT */
//	GPIO_PinModeSet(gpioPortB, 13, gpioModePushPull, 1);
//	/* PF7 -> RST_ZWAVE		OUT */
//	GPIO_PinModeSet(gpioPortF, 7, gpioModePushPull, 0);
//	GPIO_PinOutClear(gpioPortF, 7);
//#else
//	/* PA5 -> EN_AN_VBATT	OUT */
//	/* Configure GPIO as OUTPUT Open Drain */
//	GPIO_PinModeSet(gpioPortA, 5, gpioModeWiredAnd, 0);
//	GPIO_PinOutSet(gpioPortA, 5);
//	/* PD13 -> WAKE_ZWAVE	OUT */
//	GPIO_PinModeSet(gpioPortD, 13, gpioModePushPull, 1);
//	/* PD15 -> EN_AMBI		OUT */
//	GPIO_PinModeSet(gpioPortD, 15, gpioModePushPull, 1);
//	/* PB13 -> WP_FLASH		OUT */
//	GPIO_PinModeSet(gpioPortB, 13, gpioModePushPull, 1);
//	/* PF7 -> EN_ZWAVE		OUT */
//	GPIO_PinModeSet(gpioPortF, 7, gpioModePushPull, 0);
//	GPIO_PinOutClear(gpioPortF, 7);
//
//#endif
//
//	/* PD14 -> BUTTON		INPUT IRQ */
//	/* Set Button as an input with pull-up and filter enabled */
//	GPIO_PinModeSet(gpioPortD, 14, gpioModeInputPullFilter, 1);
//	// Enable GPIO_EVEN interrupt
//	if ((14 & 0x01) == 0)
//	{
//		NVIC_EnableIRQ(GPIO_EVEN_IRQn);
//	}
//	// Enable GPIO_ODD interrupt
//	else
//	{
//		NVIC_EnableIRQ(GPIO_ODD_IRQn);
//	}
//	/* Configure Interrupt as Falling Edge */
//	GPIO_IntConfig(gpioPortD, 14, false, true, true);
//}
//
///**************************************************************************//**
// * @brief
// *    Get button Event
// *****************************************************************************/
//uint8_t get_button_event(void)
//{
//	return button_event;
//}
//
///**************************************************************************//**
// * @brief
// *    Clear button Event
// *****************************************************************************/
//void clear_button_event(void)
//{
//	button_event = 0;
//}
//
///**************************************************************************//**
// * @brief
// *    Even GPIO pin handler
// *****************************************************************************/
//void GPIO_EVEN_IRQHandler(void)
//{
//  // Acknowledge the interrupt
//  uint32_t flags = GPIO_IntGet();
//
//  if ((GPIO_PinInGet(gpioPortD, 14) == 0) && button_event == 0)
//  {
//	  button_event = 1;
//	  app_LED_feedback(6, 0);
//  }
//
//  /* Clear */
//  GPIO_IntClear(flags);
//}
//
///**************************************************************************//**
// * @brief
// *    Odd GPIO pin handler
// *****************************************************************************/
//void GPIO_ODD_IRQHandler(void)
//{
//  // Acknowledge the interrupt
//  uint32_t flags = GPIO_IntGet();
//  GPIO_IntClear(flags);
//}
//
//
///***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
