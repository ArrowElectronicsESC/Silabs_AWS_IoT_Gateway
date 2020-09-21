/*
 * sentimate_app.h
 *
 *  Created on: 13 feb 2019
 *      Author: mauro.gualdi
 */
/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef SENTIMATE_APP_H_
#define SENTIMATE_APP_H_

/* Includes ------------------------------------------------------------------*/
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


#define AUDIO_BUFFER_SIZE	16


/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/
/*
 *  Macro for remap the value range of the variable x
 * NewValue = (((OldValue - OldMin) * (NewMax - NewMin)) / (OldMax - OldMin)) + NewMin
*/
#define __REMAP_VALUE( __N__, __O__, __O_MIN__, __O_MAX__, __N_MIN__, __N_MAX__) \
		((__N__) = (((__O__ - __O_MIN__) * (__N_MAX__ - __N_MIN__)) / (__O_MAX__ - __O_MIN__)) + __N_MIN__)

/* Exported functions ------------------------------------------------------- */

/* Application Function */
void sentimate_bsp_init(void);


/* ADC Function */
void init_ADC (void);
void start_ADC_scan(void);
void sentimate_read_batt(uint8_t *pPercent, int16_t *pmVolt);
void sentimate_read_powersupply(int16_t *pmVolt);
void set_vbatt_measure(uint8_t status);
void ADC0_IRQHandler(void);
uint8_t get_ADC_dataready(void);

/* GPIO */
void init_GPIO(void);
uint8_t get_button_event(void);
void clear_button_event(void);
void GPIO_EVEN_IRQHandler(void);
void GPIO_ODD_IRQHandler(void);


#endif /* SENTIMATE_APP_H_ */
/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
