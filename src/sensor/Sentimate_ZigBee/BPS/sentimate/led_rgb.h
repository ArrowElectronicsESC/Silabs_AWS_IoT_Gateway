/*
 * led_rgb.h
 *
 *  Created on: 14 feb 2019
 *      Author: mauro.gualdi
 */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef HARDWARE_SENTIMATE_LED_RGB_H_
#define HARDWARE_SENTIMATE_LED_RGB_H_

/* Includes ------------------------------------------------------------------*/
#include <stdio.h>
/* Exported define -----------------------------------------------------------*/
/*
 *	PWM TIMER define
*/
#define PWM_LED_TIM			TIMER0
#define PWM_LED_R_CH		0
#define PWM_LED_G_CH		1
#define PWM_LED_B_CH		2

#define PWM_LED_FREQ		65000		// this PWM_FREQ = 65000 creates about 1kHz signal.
#define PWM_LED_STEP		1
#define PWM_LED_MAX			100
#define PWM_LED_MIN			0
#define PWM_LED_START		0
/* Exported types ------------------------------------------------------------*/

/* LED RGB Structure*/
typedef struct
{
	uint8_t	duty_led_r;
	uint8_t	duty_led_g;
	uint8_t	duty_led_b;
}LED_RGB_TypeDef_t;

/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/

/* Exported functions ------------------------------------------------------- */

void init_GPIO_LED(void);
void turn_On_Red_Led(void);
void turn_On_Green_Led(void);
void turn_On_Blue_Led(void);
void turn_Off_Red_Led(void);
void turn_Off_Green_Led(void);
void turn_Off_Blue_Led(void);
void toggle_Red_Led(void);
void toggle_Green_Led(void);
void toggle_Blue_Led(void);
void turn_off_all(void);
void turn_on_all(void);
void change_Led_Color(uint8_t* pin);
void init_TIM_PWM_LED(void);
void rainbow_LED_effect(void);
void change_PWM_LED_colors();

#endif /* HARDWARE_SENTIMATE_LED_RGB_H_ */
/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
