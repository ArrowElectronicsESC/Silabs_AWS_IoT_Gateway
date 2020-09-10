/*
 * adc.h
 *
 *  Created on: 14 feb 2019
 *      Author: mauro.gualdi
 */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef HARDWARE_SENTIMATE_ADC_H_
#define HARDWARE_SENTIMATE_ADC_H_

/* Includes ------------------------------------------------------------------*/
#include <stdio.h>
/* Exported define -----------------------------------------------------------*/
/*
 *	ADC define
*/
#define ADC_SINGLE_CH		0			/* Select between single conversion or Scan conversion */
#define ADC_INPUT_NUM		3			/* Number of ADC Channel */
#define ADC_FREQ   			16000000	/* 16MHz */
#define ADC_VOLTAGE_REF		3300.0		/* Reference in mV */
#define ADC_RES_BIT			12
#define ADC_RESOLUTION		(1 << ADC_RES_BIT)

#define AN_ALIM_R1		(float)100000.0		/* 100K */
#define AN_ALIM_R2		(float)8200.0		/* 8K2 */

#define AN_VBATT_R1		(float)10000.0		/* 10K */
#define AN_VBATT_R2		(float)100000.0		/* 100K */

#define AN_ALIM_RATIO		((AN_ALIM_R1 + AN_ALIM_R2) / AN_ALIM_R2)
#define AN_VBATT_RATIO		((AN_VBATT_R1 + AN_VBATT_R2) / AN_VBATT_R2)

#define BATTERY_VOLTAGE_MIN		(float)1900.0	/* 1900 [mV] */
#define BATTERY_VOLTAGE_MAX		(float)3000.0	/* 3000 [mV] */

#define AUDIO_BUFFER_SIZE	8000

/* Exported types ------------------------------------------------------------*/
typedef struct
{
	int16_t		min_val;
	int16_t		max_val;
	uint32_t	min_idx;
	uint32_t	max_idx;
	int16_t		rms_val;
	int16_t		mean_val;
	int16_t		diff_val;
	uint8_t		noise_event;
}Audio_Stat_TypeDef_t;

/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/
/*
 *  Macro for remap the value range of the variable x
 * NewValue = (((OldValue - OldMin) * (NewMax - NewMin)) / (OldMax - OldMin)) + NewMin
*/
#define __REMAP_VALUE( __N__, __O__, __O_MIN__, __O_MAX__, __N_MIN__, __N_MAX__) \
		((__N__) = (((__O__ - __O_MIN__) * (__N_MAX__ - __N_MIN__)) / (__O_MAX__ - __O_MIN__)) + __N_MIN__)

/* Exported functions ------------------------------------------------------- */
void init_ADC(void);
uint8_t get_ADC_dataready(void);
void set_vbatt_measure(uint8_t status);
void start_ADC_scan(void);
void read_Batt(uint8_t *pPercent, int16_t *pmVolt);
void init_GPIO_Vbatt(void);
void read_Powersupply(int16_t *pmVolt);

#endif /* HARDWARE_SENTIMATE_LED_RGB_H_ */
/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
