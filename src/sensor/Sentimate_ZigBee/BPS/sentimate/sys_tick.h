/*
 * sys_tick.h
 *
 *  Created on: 14 feb 2019
 *  Author: mauro.gualdi
 */
/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef HARDWARE_SENTIMATE_SYS_TICK_H_
#define HARDWARE_SENTIMATE_SYS_TICK_H_

/* Includes ------------------------------------------------------------------*/

/* Exported define -----------------------------------------------------------*/

/* Exported types ------------------------------------------------------------*/

/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/

/* Exported functions ------------------------------------------------------- */

/* TIMER */
uint32_t Get_SysTick();
void Delay(uint32_t dlyTicks);

#endif /* HARDWARE_SENTIMATE_SYS_TICK_H_ */
/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/
