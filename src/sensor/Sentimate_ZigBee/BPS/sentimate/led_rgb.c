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

// Note: change this to set the desired duty cycle (used to update CCVB value)
static  LED_RGB_TypeDef_t BoardLED = {PWM_LED_START, PWM_LED_START, PWM_LED_START};

/* Private function prototypes -----------------------------------------------*/
/* Functions -----------------------------------------------------------------*/


/**************************************************************************//**
 * @brief  Initialize LED GPIOs
 *****************************************************************************/
void init_GPIO_LED(void)
{
	// Enable GPIO and clock
	CMU_ClockEnable(cmuClock_GPIO, true);

	/*
	GPIOA0-> RED
	GPIOA1-> GREEN
	GPIOA2-> BLUE
	 */

	/* Configure LED GPIO as output */
	GPIO_PinModeSet(gpioPortA, 0, gpioModePushPull, 0);
	GPIO_PinModeSet(gpioPortA, 1, gpioModePushPull, 0);
	GPIO_PinModeSet(gpioPortA, 2, gpioModePushPull, 0);
}

/**************************************************************************//**
 * @brief  Turn on red LED
 *****************************************************************************/
void turn_On_Red_Led(void)
{
	GPIO_PinOutSet(gpioPortA, 0);
}

/**************************************************************************//**
 * @brief  Turn on green LED
 *****************************************************************************/
void turn_On_Green_Led(void)
{
	GPIO_PinOutSet(gpioPortA, 1);
}

/**************************************************************************//**
 * @brief  Turn on blue LED
 *****************************************************************************/
void turn_On_Blue_Led(void)
{
	GPIO_PinOutSet(gpioPortA, 2);
}

/**************************************************************************//**
 * @brief  Turn off red LED
 *****************************************************************************/
void turn_Off_Red_Led(void)
{
	GPIO_PinOutClear(gpioPortA, 0);
}

/**************************************************************************//**
 * @brief  Turn off green LED
 *****************************************************************************/
void turn_Off_Green_Led(void)
{
	GPIO_PinOutClear(gpioPortA, 1);
}

/**************************************************************************//**
 * @brief  Turn off blue LED
 *****************************************************************************/
void turn_Off_Blue_Led(void)
{
	GPIO_PinOutClear(gpioPortA, 2);
}

/**************************************************************************//**
 * @brief  Toggle red LED
 *****************************************************************************/
void toggle_Red_Led(void)
{
	GPIO_PinOutToggle(gpioPortA, 0);
}

/**************************************************************************//**
 * @brief  Toggle green LED
 *****************************************************************************/
void toggle_Green_Led(void)
{
	GPIO_PinOutToggle(gpioPortA, 1);
}

/**************************************************************************//**
 * @brief  Toggle blue LED
 *****************************************************************************/
void toggle_Blue_Led(void)
{
	GPIO_PinOutToggle(gpioPortA, 2);
}

/**************************************************************************//**
 * @brief  Turn off all 3 colors
 *****************************************************************************/
void turn_off_all(void)
{
	turn_Off_Blue_Led();
	turn_Off_Green_Led();
	turn_Off_Red_Led();
}

/**************************************************************************//**
 * @brief  Turn on all 3 colors (white color)
 *****************************************************************************/
void turn_on_all(void)
{
	turn_On_Blue_Led();
	turn_On_Green_Led();
	turn_On_Red_Led();
}

/**************************************************************************//**
 * @brief Turn on the Led with the pin corresponding to the given input
 * and turn off the previous one, following the sequence R->G->B->R...
 * The input pin, passed as a pointer is increased.
 *****************************************************************************/
void change_Led_Color(uint8_t* pin)
{
	switch (*pin)
	{
	case 0:
	{
		turn_Off_Blue_Led();
		turn_On_Red_Led();
		break;
	}
	case 1:
	{
		turn_Off_Red_Led();
		turn_On_Green_Led();
		break;
	}
	case 2:
	{
		turn_Off_Green_Led();
		turn_On_Blue_Led();
		break;
	}
	}
	*pin = ((*pin) + 1) % 3;
}


/**************************************************************************//**
 * @brief  Initialize LED gpios and TIMER PWM
 *****************************************************************************/
void init_TIM_PWM_LED(void)
{
	TIMER_InitCC_TypeDef timerCCInit = TIMER_INITCC_DEFAULT;

	// Enable GPIO and clock
	CMU_ClockEnable(cmuClock_GPIO, true);
	// Enable clock for TIMER0 module
	CMU_ClockEnable(cmuClock_TIMER0, true);

	/* Configure GPIO as output */
	GPIO_PinModeSet(gpioPortA, 0, gpioModePushPull, 0);
	GPIO_PinModeSet(gpioPortA, 1, gpioModePushPull, 0);
	GPIO_PinModeSet(gpioPortA, 2, gpioModePushPull, 0);

	/* Configure TIMER Compare/Capture for output compare
	 * PA0 -> TIM1_CC0 #0
	 * PA1 -> TIM1_CC1 #0
	 * PA2 -> TIM1_CC2 #0
	 */
	// Use PWM mode, which sets output on overflow and clears on compare events
	timerCCInit.mode = timerCCModePWM;
	TIMER_InitCC(PWM_LED_TIM, PWM_LED_R_CH, &timerCCInit);
	TIMER_InitCC(PWM_LED_TIM, PWM_LED_G_CH, &timerCCInit);
	TIMER_InitCC(PWM_LED_TIM, PWM_LED_B_CH, &timerCCInit);
	// Route TIMER0 CCx to location x and enable CCx route pin
	PWM_LED_TIM->ROUTELOC0 |=  TIMER_ROUTELOC0_CC0LOC_LOC0;
	PWM_LED_TIM->ROUTEPEN |= TIMER_ROUTEPEN_CC0PEN;
	PWM_LED_TIM->ROUTELOC0 |=  TIMER_ROUTELOC0_CC1LOC_LOC0;
	PWM_LED_TIM->ROUTEPEN |= TIMER_ROUTEPEN_CC1PEN;
	PWM_LED_TIM->ROUTELOC0 |=  TIMER_ROUTELOC0_CC2LOC_LOC0;
	PWM_LED_TIM->ROUTEPEN |= TIMER_ROUTEPEN_CC2PEN;

	// Set top value to overflow at the desired PWM_FREQ frequency
	TIMER_TopSet(PWM_LED_TIM, CMU_ClockFreqGet(cmuClock_TIMER1) / PWM_LED_FREQ);

	// Set compare value for initial duty cycle
	TIMER_CompareSet(PWM_LED_TIM, 0, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_r) / 100);
	TIMER_CompareSet(PWM_LED_TIM, 1, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_g) / 100);
	TIMER_CompareSet(PWM_LED_TIM, 2, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_b) / 100);

	// Initialize the timer
	TIMER_Init_TypeDef timerInit = TIMER_INIT_DEFAULT;
	TIMER_Init(PWM_LED_TIM, &timerInit);

	// Enable TIMER0 compare event interrupts to update the duty cycle
	TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC0);
	TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC1);
	TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC2);
}

/**************************************************************************//**
 * @brief  Rainbow effect on LED RGB
 *****************************************************************************/
void rainbow_LED_effect(void)
{
	static uint8_t rainbow_stage = 0;

	switch(rainbow_stage)
	{
	case 0:	/* Red Up */
		BoardLED.duty_led_r += PWM_LED_STEP;
		if (BoardLED.duty_led_r >= PWM_LED_MAX)
		{
			BoardLED.duty_led_r = PWM_LED_MAX;
			rainbow_stage++;
		}
		break;
	case 1: /* Blue UP */
		BoardLED.duty_led_b += PWM_LED_STEP;
		if (BoardLED.duty_led_b >= PWM_LED_MAX)
		{
			BoardLED.duty_led_b = PWM_LED_MAX;
			rainbow_stage++;
		}
		break;
	case 2:	/* Red Down */
		if (BoardLED.duty_led_r >= PWM_LED_STEP)
		{
			BoardLED.duty_led_r -= PWM_LED_STEP;
		}
		else
		{
			BoardLED.duty_led_r = PWM_LED_MIN;
			rainbow_stage++;
		}
		break;
	case 3: /* Green Up */
		BoardLED.duty_led_g += PWM_LED_STEP;
		if (BoardLED.duty_led_g >= PWM_LED_MAX)
		{
			BoardLED.duty_led_g = PWM_LED_MAX;
			rainbow_stage++;
		}
		break;
	case 4: /* Blue Down */
		if (BoardLED.duty_led_b >= PWM_LED_STEP)
		{
			BoardLED.duty_led_b -= PWM_LED_STEP;
		}
		else
		{
			BoardLED.duty_led_b = PWM_LED_MIN;
			rainbow_stage++;
		}
		break;
	case 5:	/* Red Up */
		BoardLED.duty_led_r += PWM_LED_STEP;
		if (BoardLED.duty_led_r >= PWM_LED_MAX)
		{
			BoardLED.duty_led_r = PWM_LED_MAX;
			rainbow_stage++;
		}
		break;
	case 6: /* Gree Down */
		if (BoardLED.duty_led_g >= PWM_LED_STEP)
		{
			BoardLED.duty_led_g -= PWM_LED_STEP;
		}
		else
		{
			BoardLED.duty_led_g = PWM_LED_MIN;
			rainbow_stage = 1;
		}
		break;
	default:
		rainbow_stage = 0;
		break;
	}
	/* Update Color */
	change_PWM_LED_colors();
}


/**************************************************************************//**
 * @brief  Modify PWM LED colors according to duty cycle
 *****************************************************************************/
void change_PWM_LED_colors()
{
	if ((BoardLED.duty_led_r == 0) && (BoardLED.duty_led_g == 0) && (BoardLED.duty_led_b == 0))
	{
		/* Stop PWM */
		TIMER_Enable(PWM_LED_TIM, 0);
	}
	else
	{
		/* Update CCVB to alter duty cycle starting next period */
		TIMER_CompareBufSet(PWM_LED_TIM, PWM_LED_R_CH, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_r) / 100);
		TIMER_CompareBufSet(PWM_LED_TIM, PWM_LED_G_CH, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_g) / 100);
		TIMER_CompareBufSet(PWM_LED_TIM, PWM_LED_B_CH, (TIMER_TopGet(PWM_LED_TIM) * BoardLED.duty_led_b) / 100);
		/* */
		TIMER_Enable(PWM_LED_TIM, 1);
		/* Check Enable TIM */
		if ((PWM_LED_TIM->IEN & TIMER_IEN_CC0) == 0)
		{
			TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC0);
			TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC1);
			TIMER_IntEnable(PWM_LED_TIM, TIMER_IEN_CC2);
		}
	}
}
