/*
 * ambimate.c
 *
 *  Created on: 11 feb 2019
 *      Author: mauro.gualdi
 */
#include <string.h>

#include "em_i2c.h"
#include "em_gpio.h"
#include "em_cmu.h"
#include "ambimate.h"
#include "../sentimate/sys_tick.h"
#include "app/framework/include/af.h"
//#include "Sentimate_ZigBee_endpoint_config.h"

/* Configuration structure initialized as default (Master, Enabled) */
I2C_Init_TypeDef	i2c_config = I2C_INIT_DEFAULT;

/* AmbiMate Device */
AmbiMate_Devie_TypeDef_t	am_dev;

/* Transmission Flags */
bool 					i2c_rxInProgress;
bool  					i2c_startTx;
uint16_t				i2c_rxBufferIndex;

/**************************************************************************//**
 * @brief  Initialization of the AmbiMate Sensor
 *****************************************************************************/
void ambimate_init(void)
{
	uint8_t	ret;

	/* Init I2C Bus */
	ambimate_i2c_init(AM_DEV_I2C_BUS);

	/* Init GPIO Event on PA3 */
	GPIO_PinModeSet(gpioPortA, 3, gpioModeInput, 0);

	/* Read Fw version */
	am_dev.fw_ver = ambimate_read_reg(AM_REG_FW_VER);
	/* Read Fw Sub-version */
	am_dev.fw_sub_ver = ambimate_read_reg(AM_REG_FW_SVER);
	/* Read Optional Byte */
	am_dev.dev_opt = ambimate_read_reg(AM_REG_OPTIONAL);
	/* Read Status */
	am_dev.status = ambimate_read_reg(AM_REG_STATUS_H);
	/* Enable Sensors */
	am_dev.scan_start = 0x00;
	am_dev.scan_start |= AM_BIT_SCAN_START_PIR |\
						AM_BIT_SCAN_START_TEMP |\
						AM_BIT_SCAN_START_HUM |\
						AM_BIT_SCAN_START_LIGHT |\
						AM_BIT_SCAN_START_BATT;
	/* Check Options */
	if (am_dev.dev_opt & 0x01)
	{
		/* Enable CO2 sensor Read */
		am_dev.scan_start |= AM_BIT_SCAN_START_GAS;
	}
	if (am_dev.dev_opt & 0x04)
	{
		/* Enable Audio sensor Read */
		am_dev.scan_start |= AM_BIT_SCAN_START_AUD;
		/* Set Audio Level to  Default */
		ret = ambimate_write_reg(AM_REG_AUDIO_EV_LVL, AM_AUDIO_LVL_DEDAULT);
		am_dev.audio_ev_lvl = ambimate_read_reg(AM_REG_AUDIO_EV_LVL);
	}

	emberAfCorePrintln("----ambimate_init ----> 1----");
	/* Update Scan start register */
	ret = ambimate_write_reg(AM_REG_SCAN_START, am_dev.scan_start);

	/* Read-back Scan start register */
	am_dev.scan_start_old = ambimate_read_reg(AM_REG_SCAN_START);
	
	emberAfCorePrintln("----ambimate_init ----> 2----");
	/* Add delay of 100ms */
	//Delay(100);
}

/**************************************************************************//**
 * @brief  Read All data from AmbiMate sensor
 *
 * @note
 * 		- CO2/VOC sensor is only updated in AmbiMate every 60 seconds
 * 		- Max interval for read sensors is 0.5seconds (2Hz)
 *****************************************************************************/
uint8_t ambimate_read_all(void)
{
	uint8_t		ret = 0;
	/* I2C Message buffer */
	uint8_t		am_rx_buff[16];

	/* Check Rise EVENT Pin */
#if 0	/* Bypass beacause the event not occur regular.... */
	if (GPIO_PinInGet(gpioPortA, 3) == 0)
	{
		/* No Event */
		return 1;
	}
#endif
#if 0
	/* Read-back Scan start register */
	am_dev.scan_start = ambimate_read_reg(AM_REG_SCAN_START);
	if (am_dev.scan_start == am_dev.scan_start_old)
	{
		/* No Event */
		return 1;
	}
#endif

	/* Clear Buffer */
	memset(am_rx_buff, 0x00, 16);
	/* Read Status */
	am_dev.status = ambimate_read_reg(AM_REG_STATUS_H);
	//am_dev.lr_status = ambimate_read_reg(AM_REG_STATUS);

	/* Read Data */
	ret = ambimate_read_multi(AM_REG_TEMP_H, &am_rx_buff[1], 14);
	/* Check read operation */
	if (ret == (uint8_t)i2cTransferDone)
	{
		//am_dev.temperatureC = (am_rx_buff[1] * 256.0 + am_rx_buff[2]) / 10.0;
		//am_dev.temperatureF = ((am_dev.temperatureC * 9.0) / 5.0) + 32.0;
		//am_dev.humidity 	= (am_rx_buff[3] * 256.0 + am_rx_buff[4]) / 10.0;
		am_dev.temperatureC = ((am_rx_buff[1] << 8) + am_rx_buff[2]) * 10;
		am_dev.humidity 	= ((am_rx_buff[3] << 8) + am_rx_buff[4]) * 10;
		am_dev.light 		= ((am_rx_buff[5] << 8) + am_rx_buff[6]);
		am_dev.audio 		= ((am_rx_buff[7] << 8) + am_rx_buff[8]);
		am_dev.battV 		= ((am_rx_buff[9] << 8) + am_rx_buff[10]);
		am_dev.co2_ppm		= ((am_rx_buff[11] << 8) + am_rx_buff[12]);
		am_dev.voc_ppm		= ((am_rx_buff[13] << 8) + am_rx_buff[14]);
	}
	/* Read Data */
	ret = ambimate_read_multi(AM_REG_TEMP, &am_rx_buff[1], 7);
	/* Check read operation */
	if (ret == (uint8_t)i2cTransferDone)
	{
		am_dev.lr_temperature 	= am_rx_buff[1];
		am_dev.lr_humidity 		= am_rx_buff[2];
		am_dev.lr_light 		= am_rx_buff[3];
		am_dev.lr_audio 		= am_rx_buff[4];
		am_dev.lr_battV 		= am_rx_buff[5];
		am_dev.lr_co2_ppm		= am_rx_buff[6];
		am_dev.lr_voc_ppm		= am_rx_buff[7];
	}
	/* Update Scan start register */
	ret = ambimate_write_reg(AM_REG_SCAN_START, am_dev.scan_start_old);
	/* return */
	return ret;
}

/**************************************************************************//**
 * @brief  Read Register
 *****************************************************************************/
uint8_t ambimate_read_reg(uint8_t reg)
{
	/* I2C_FLAG_WRITE_READ: Combined write/read sequence: S+ADDR(W)+DATA0+Sr+ADDR(R)+DATA1+P. */
	/* Step 1. I2C_FLAG_WRITE: Write the address of the register to be read */
	/* Step 2. I2C_FLAG_READ: Read the register value */

	I2C_TransferSeq_TypeDef		am_msg;
	I2C_TransferReturn_TypeDef 	ret;
	uint8_t am_msg_1, am_msg_2;

	am_msg_1 = reg;

	/* Init RX/TX Buffer */
	am_msg.addr = AM_DEV_I2C_ADD;
	am_msg.flags = I2C_FLAG_WRITE_READ;
	am_msg.buf[0].data = &am_msg_1;
	am_msg.buf[0].len = 1;
	am_msg.buf[1].data = &am_msg_2;
	am_msg.buf[1].len = 1;

	/* Do a polled transfer */
	ret = I2C_TransferInit(AM_DEV_I2C_BUS, &am_msg);
	while (ret == i2cTransferInProgress)
	{
		ret = I2C_Transfer(AM_DEV_I2C_BUS);
	}
	/* Return the register value */
	return am_msg_2;
}

/**************************************************************************//**
 * @brief  Write Register
 *****************************************************************************/
uint8_t ambimate_write_reg(uint8_t reg, uint8_t value)
{
	/* I2C_FLAG_WRITE_WRITE: Write sequence using two buffers: S+ADDR(W)+DATA0+DATA1+P.*/

	I2C_TransferSeq_TypeDef		am_msg;
	I2C_TransferReturn_TypeDef 	ret;
	uint8_t am_msg_1, am_msg_2;

	am_msg_1 = reg;
	am_msg_2 = value;

	/* Init RX/TX Buffer */
	am_msg.addr = AM_DEV_I2C_ADD;
	am_msg.flags = I2C_FLAG_WRITE_WRITE;
	am_msg.buf[0].data = &am_msg_1;
	am_msg.buf[0].len = 1;
	am_msg.buf[1].data = &am_msg_2;
	am_msg.buf[1].len = 1;

	/* Do a polled transfer */
	ret = I2C_TransferInit(AM_DEV_I2C_BUS, &am_msg);
	while (ret == i2cTransferInProgress)
	{
		ret = I2C_Transfer(AM_DEV_I2C_BUS);
	}
	/* OK */
	return 0;
}

/**************************************************************************//**
 * @brief  Read Multi Register
 *****************************************************************************/
uint8_t ambimate_read_multi(uint8_t reg, uint8_t *pData, uint8_t size)
{
	/* I2C_FLAG_WRITE_READ: Combined write/read sequence: S+ADDR(W)+DATA0+Sr+ADDR(R)+DATA1+P. */
	/* Step 1. I2C_FLAG_WRITE: Write the address of the register to be read */
	/* Step 2. I2C_FLAG_READ: Read the register value */

	I2C_TransferSeq_TypeDef		am_msg;
	I2C_TransferReturn_TypeDef 	ret;
	uint8_t am_msg_1;

	am_msg_1 = reg;

	/* Init RX/TX Buffer */
	am_msg.addr = AM_DEV_I2C_ADD;
	am_msg.flags = I2C_FLAG_WRITE_READ;
	am_msg.buf[0].data = &am_msg_1;
	am_msg.buf[0].len = 1;
	am_msg.buf[1].data = pData;
	am_msg.buf[1].len = size;

	/* Do a polled transfer */
	ret = I2C_TransferInit(AM_DEV_I2C_BUS, &am_msg);
	while (ret == i2cTransferInProgress)
	{
		ret = I2C_Transfer(AM_DEV_I2C_BUS);
	}
	/* Return OK */
	return (uint8_t)i2cTransferDone;
}


/**************************************************************************//**
 * @brief  Setup I2C
 *****************************************************************************/
void ambimate_i2c_init(I2C_TypeDef *i2c)
{
	/* NOTE: The AmbiMate Max I2C Frequency is equal to 100KHz */
	/* 1. Enabling clock to the I2C */
	if (i2c == I2C0)
	{
		CMU_ClockEnable(cmuClock_I2C0, true);
	}
	else if (i2c == I2C1)
	{
		CMU_ClockEnable(cmuClock_I2C1, true);
	}
	else
	{
		/* Error Only 2I2C Bus is present */
		return;
	}
	/* 2. Enabling clock to the GPIO */
	CMU_ClockEnable(cmuClock_GPIO, true);
	/* 3. */
	CMU_ClockEnable(cmuClock_HFPER, true);

	/* Set BUS frequency */
#if 0
	/* Use ~400khz SCK */
	i2c_config.freq = I2C_FREQ_FAST_MAX;
#else
	/* Use ~100khz SCK */
	i2c_config.freq = I2C_FREQ_STANDARD_MAX;
#endif

	/* GPIO Configigured as Input with Pull-Up */
	GPIO_PinModeSet(gpioPortC, 10, gpioModeWiredAndPullUp, 1);
	GPIO_PinModeSet(gpioPortC, 11, gpioModeWiredAndPullUp, 1);
#if 1
	/* Enable pins at location 15 as specified in datasheet */
	/* GPIO Configuration for SENTEMATE Board
	 * PC10 -> SDA
	 * PC11 -> SCL
	 */
	i2c->ROUTEPEN = I2C_ROUTEPEN_SDAPEN | I2C_ROUTEPEN_SCLPEN;
	i2c->ROUTELOC0 = (i2c->ROUTELOC0 & (~_I2C_ROUTELOC0_SDALOC_MASK)) | I2C_ROUTELOC0_SDALOC_LOC15;
	i2c->ROUTELOC0 = (i2c->ROUTELOC0 & (~_I2C_ROUTELOC0_SCLLOC_MASK)) | I2C_ROUTELOC0_SCLLOC_LOC15;
#else
	/* Enable pins at location 14 and 16 as specified in datasheet */
	/* GPIO Configuration Alternative
	 * PC10 -> SCL
	 * PC11 -> SDA
	 */
	i2c->ROUTEPEN = I2C_ROUTEPEN_SDAPEN | I2C_ROUTEPEN_SCLPEN;
	i2c->ROUTELOC0 = (i2c->ROUTELOC0 & (~_I2C_ROUTELOC0_SDALOC_MASK)) | I2C_ROUTELOC0_SDALOC_LOC16;
	i2c->ROUTELOC0 = (i2c->ROUTELOC0 & (~_I2C_ROUTELOC0_SCLLOC_MASK)) | I2C_ROUTELOC0_SCLLOC_LOC14;
#endif

	/* Init I2C Bus */
	I2C_Init(i2c, &i2c_config);

	/* Setting the status flags and index */
	i2c_rxInProgress = false;
	i2c_startTx = false;
	i2c_rxBufferIndex = 0;

#if 0
	// Setting up to enable slave mode
	I2C0->SADDR = I2C_ADDRESS;
	I2C0->CTRL |= I2C_CTRL_SLAVE | I2C_CTRL_AUTOACK | I2C_CTRL_AUTOSN;
	enableI2cSlaveInterrupts();
#endif

	/* Enable I2C Bus */
	//I2C_Enable(i2c, true);
	/* Configure I2C Bus */
	//I2C_BusFreqSet();
}

/**************************************************************************//**
 * @brief  Interrupt Handler for PIR sensor
 *****************************************************************************/
void configure_interrupt_event_out(void)
{
	emberAfCorePrintln("----Inside configure_interrupt_event_out----");
    // Enable GPIO and clock
    CMU_ClockEnable(cmuClock_GPIO, true);
    /* Configure GPIO as INPUT */
    /* Init GPIO Event on PA3 */
    GPIO_PinModeSet(gpioPortA, 3, gpioModeInput, 1);
    NVIC_EnableIRQ(GPIO_ODD_IRQn);
    /* Configure Interrupt as Falling Edge */
    GPIO_IntConfig(gpioPortA, 3, true, true, true);
    GPIOINT_CallbackRegister(3,
						halInternalEventOutIsr);
}

extern EmberEventControl sentimateSensorDelay;

volatile uint8_t event_out = 0;

void halInternalEventOutIsr(uint8_t pin)
{
	emberAfCorePrintln("pin : %u", pin);
	if (pin != 3){
		return;
	}
	emberAfCorePrintln("----Inside halInternalEventOutIsr----");
    //uint32_t flags = GPIO_IntGet();
    if (GPIO_PinInGet(gpioPortA, 3)==1)
    {
		if (event_out != 1)
		{
			event_out = 1;
			am_dev.status = ambimate_read_reg(AM_REG_STATUS_H);
			emberAfCorePrintln("----halInternalEventOutIsr----status : %u %x", am_dev.status, am_dev.status);
			emberAfCorePrintln("----halInternalEventOutIsr----event_out : %u", event_out);
			emberEventControlSetDelayMS(sentimateSensorDelay, 100);
		}
	
    }/*
	else
	{
		if (event_out != 1)
		{
			event_out = 1;
			//emberEventControlSetActive(sentimateSensorDelay);
		}
	}*/
	//GPIO_IntClear(flags);
}
