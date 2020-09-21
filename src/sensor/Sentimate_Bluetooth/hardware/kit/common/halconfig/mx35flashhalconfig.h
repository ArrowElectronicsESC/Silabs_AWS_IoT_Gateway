#ifndef MX35FLASHHALCONFIG_H
#define MX35FLASHHALCONFIG_H

#include "hal-config.h"

#ifdef BSP_EXTFLASH_USART

#if BSP_EXTFLASH_USART == HAL_SPI_PORT_USART0
// USART0
  #define MX35_USART                USART0
  #define MX35_USART_CLK            cmuClock_USART0
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[0]
#elif BSP_EXTFLASH_USART == HAL_SPI_PORT_USART1
// USART1
  #define MX35_USART                USART1
  #define MX35_USART_CLK            cmuClock_USART1
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[1]
#elif BSP_EXTFLASH_USART == HAL_SPI_PORT_USART2
// USART2
  #define MX35_USART                USART2
  #define MX35_USART_CLK            cmuClock_USART2
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[2]
#elif BSP_EXTFLASH_USART == HAL_SPI_PORT_USART3
// USART3
  #define MX35_USART                USART3
  #define MX35_USART_CLK            cmuClock_USART3
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[3]
#elif BSP_EXTFLASH_USART == HAL_SPI_PORT_USART4
// USART4
  #define MX35_USART                USART4
  #define MX35_USART_CLK            cmuClock_USART4
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[4]
#elif BSP_EXTFLASH_USART == HAL_SPI_PORT_USART5
// USART5
  #define MX35_USART                USART5
  #define MX35_USART_CLK            cmuClock_USART5
  #define MX35_USART_ROUTE          GPIO->USARTROUTE[5]
#else
  #error "SPI flash config: Unknown USART selection"
#endif


#define MX35_PORT_MOSI          gpioPortC
#define MX35_PIN_MOSI           6
//#define MX35_LOC_TX             BSP_EXTFLASH_MOSI_LOC
#define MX35_PORT_MISO          gpioPortC
#define MX35_PIN_MISO          7
//#define MX35_LOC_RX             BSP_EXTFLASH_MISO_LOC
#define MX35_PORT_SCLK          gpioPortC
#define MX35_PIN_SCLK           8
//#define MX35_LOC_SCLK           BSP_EXTFLASH_CLK_LOC
#define MX35_PORT_CS            gpioPortC
#define MX35_PIN_CS             9

#define MX35_PORT_WP         gpioPortB
#define MX35_PIN_WP              13

//#define MX35_BAUDRATE           HAL_EXTFLASH_FREQUENCY

#endif //BSP_EXTFLASH_USART

#endif // MX35FLASHHALCONFIG_H
