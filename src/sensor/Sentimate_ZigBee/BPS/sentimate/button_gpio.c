/*
 * led_rgb.c
 *
 *  Created on: 14 feb 2019
 *      Author: mauro.gualdi
 */
/* Includes ------------------------------------------------------------------*/
#include "button_gpio.h"
#include <stdio.h>
#include "em_device.h"
#include "em_chip.h"
#include "em_cmu.h"
#include "em_gpio.h"
#include "em_timer.h"

/* Private define ------------------------------------------------------------*/
/* Private typedef -----------------------------------------------------------*/

/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/

/* Private function prototypes -----------------------------------------------*/
/* Functions -----------------------------------------------------------------*/


void init_GPIO_Button(void)
{
	// Enable GPIO and clock
	CMU_ClockEnable(cmuClock_GPIO, true);

	/* Configure GPIO as INPUT */
	// Set Button as an input with pull-up and filter enabled
	GPIO_PinModeSet(gpioPortD, 14, gpioModeInputPullFilter, 0);


	NVIC_EnableIRQ(GPIO_EVEN_IRQn);

	/* Configure Interrupt as Rising and Falling Edge */
	GPIO_IntConfig(gpioPortD, 14, true, true, true);

}

