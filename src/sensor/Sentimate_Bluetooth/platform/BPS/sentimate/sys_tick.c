/*
 * sys_tick.c
 *
 *  Created on: 14 feb 2019
 *  Author: mauro.gualdi
 */

/* Includes ------------------------------------------------------------------*/
#include <stdio.h>
#include "em_device.h"
#include "em_chip.h"
#include "em_emu.h"
#include "em_cmu.h"
#include "em_gpio.h"
#include "em_timer.h"
#include "sys_tick.h"

/* Private define ------------------------------------------------------------*/
/* Private typedef -----------------------------------------------------------*/

/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
static volatile uint32_t SysTick_Count = 0;

/* Private function prototypes -----------------------------------------------*/
/* Functions -----------------------------------------------------------------*/


void Delay(uint32_t dlyTicks)
{
      uint32_t curTicks;

      curTicks = SysTick_Count;
      while ((SysTick_Count - curTicks) < dlyTicks) ;
}

void SysTick_Handler(void)
{
      /* Increment counter necessary in Delay()*/
	SysTick_Count++;
}

uint32_t Get_SysTick()
{
	return SysTick_Count;
}

/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
