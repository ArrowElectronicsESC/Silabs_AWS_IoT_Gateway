/*
 * led_rgb.c
 *
 *  Created on: 14 feb 2019
 *      Author: mauro.gualdi
 */
/* Includes ------------------------------------------------------------------*/
#include "led_rgb.h"
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
///* Push Button */
uint8_t				button_event = 0;

/* Private function prototypes -----------------------------------------------*/
/* Functions -----------------------------------------------------------------*/


void init_GPIO_Button(void)
{
	// Enable GPIO and clock
	CMU_ClockEnable(cmuClock_GPIO, true);

	/* Configure GPIO as INPUT */
	// Set Button as an input with pull-up and filter enabled
	GPIO_PinModeSet(gpioPortD, 14, gpioModeInputPullFilter, 1);


	NVIC_EnableIRQ(GPIO_EVEN_IRQn);
	NVIC_SetPriority(GPIO_EVEN_IRQn, 10);

	/* Configure Interrupt as Falling Edge */
	GPIO_IntConfig(gpioPortD, 14, false, true, true);

}


/**************************************************************************//**
 * @brief
 *    Get button Event
 *****************************************************************************/
uint8_t get_button_event(void)
{
	return button_event;
}

/**************************************************************************//**
 * @brief
 *    Clear button Event
 *****************************************************************************/
void clear_button_event(void)
{
	button_event = 0;
}

/**************************************************************************//**
 * @brief
 *    Even GPIO pin handler
 *****************************************************************************/
void GPIO_EVEN_IRQHandler(void)
{
  // Acknowledge the interrupt
  uint32_t flags = GPIO_IntGet();

  if ((GPIO_PinInGet(gpioPortD, 14) == 0) && button_event == 0)
  {
	  button_event = 1;
	  app_LED_feedback(6, 0);
  }

  /* Clear */
  GPIO_IntClear(flags);
}
