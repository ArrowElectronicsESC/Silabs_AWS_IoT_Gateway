/*
 * ambimate.h
 *
 *  Created on: 11 feb 2019
 *      Author: mauro.gualdi
 */
/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef HARDWARE_AMBIMATE_AMBIMATE_H_
#define HARDWARE_AMBIMATE_AMBIMATE_H_

/* Includes ------------------------------------------------------------------*/
/* Exported define -----------------------------------------------------------*/
/* I2C DEVICE ADDRESS */
#define		AM_DEV_I2C_ADD_7B	(uint8_t)0x2A
#define		AM_DEV_I2C_ADD		(uint8_t)(0x2A << 1)
#define 	AM_DEV_I2C_BUS		I2C0

/* SINGLE READABLE REGISTER DEFINE */
#define		AM_REG_STATUS_H		(uint8_t)0x00
#define		AM_REG_TEMP_H		(uint8_t)0x01
#define		AM_REG_TEMP_L		(uint8_t)0x02
#define		AM_REG_HUM_H		(uint8_t)0x03
#define		AM_REG_HIM_L		(uint8_t)0x04
#define		AM_REG_LIGHT_H		(uint8_t)0x05
#define		AM_REG_LIGHT_L		(uint8_t)0x06
#define		AM_REG_AUDIO_H		(uint8_t)0x07
#define		AM_REG_AUDIO_L		(uint8_t)0x08
#define		AM_REG_BATTV_H		(uint8_t)0x09
#define		AM_REG_BATTV_L		(uint8_t)0x0A
#define		AM_REG_CO2_H		(uint8_t)0x0B
#define		AM_REG_CO2_L		(uint8_t)0x0C
#define		AM_REG_VOC_H		(uint8_t)0x0D
#define		AM_REG_VOC_L		(uint8_t)0x0E

/* SINGLE READABLE REGISTER DEFINE */
#define		AM_REG_STATUS		(uint8_t)0x40
#define		AM_REG_TEMP			(uint8_t)0x41
#define		AM_REG_HUM			(uint8_t)0x42
#define		AM_REG_LIGHT		(uint8_t)0x43
#define		AM_REG_AUDIO		(uint8_t)0x44
#define		AM_REG_BATTV		(uint8_t)0x45
#define		AM_REG_CO2			(uint8_t)0x46
#define		AM_REG_VOC			(uint8_t)0x47

/* SINGLE READABLE REGISTER DEFINE */
#define		AM_REG_FW_VER		(uint8_t)0x80
#define		AM_REG_FW_SVER		(uint8_t)0x81
#define		AM_REG_OPTIONAL		(uint8_t)0x82

/* SINGLE READ/WRITE REGISTER DEFINE */
#define		AM_REG_SCAN_START	(uint8_t)0xC0
#define		AM_REG_AUDIO_EV_LVL	(uint8_t)0xC1
#define		AM_REG_RESET		(uint8_t)0xF0		/* Accepr only 0xA5 value for Reset device */


/* AM_REG_STATUS Bit field define */
#define 	AM_BIT_STATUS_PIR		(uint8_t)0x01
#define 	AM_BIT_STATUS_AUDIO		(uint8_t)0x02
#define 	AM_BIT_STATUS_EVENT		(uint8_t)0x04
#define 	AM_BIT_STATUS_PIR_EV	(uint8_t)0x80


/* AM_REG_SCAN_START Bit field define */
#define 	AM_BIT_SCAN_START_PIR	(uint8_t)0x01
#define 	AM_BIT_SCAN_START_TEMP	(uint8_t)0x02
#define 	AM_BIT_SCAN_START_HUM	(uint8_t)0x04
#define 	AM_BIT_SCAN_START_LIGHT	(uint8_t)0x08
#define 	AM_BIT_SCAN_START_AUD	(uint8_t)0x10
#define 	AM_BIT_SCAN_START_BATT	(uint8_t)0x20
#define 	AM_BIT_SCAN_START_GAS	(uint8_t)0x40

/* AUDIO LEVEL EVENT */
#define AM_AUDIO_LVL_MAX			(uint8_t)100		/* Equal to 100dB or Disable Event */
#define AM_AUDIO_LVL_MIN			(uint8_t)1
#define AM_AUDIO_LVL_DEDAULT		(uint8_t)2			/* Equal to 2dB */


/* Exported types ------------------------------------------------------------*/
typedef struct
{
	/* Full resolution register */
	uint8_t 	status;
	//float		temperatureC;
	//float		temperatureF;
	//float		humidity;
	uint16_t	temperatureC;
	uint16_t	humidity;
	uint16_t	light;
	uint16_t	audio;
	//float		battV;
	uint16_t	battV;
	uint16_t	co2_ppm;
	uint16_t	voc_ppm;
	/* 8 Bit resolution register */
	uint8_t 	lr_status;			/* Is the same register */
	uint8_t		lr_temperature;
	uint8_t		lr_humidity;
	uint8_t		lr_light;
	uint8_t		lr_audio;
	uint8_t		lr_battV;
	uint8_t		lr_co2_ppm;
	uint8_t		lr_voc_ppm;
	/* Fw information */
	uint8_t		fw_ver;
	uint8_t		fw_sub_ver;
	uint8_t		dev_opt;
	/* Config Register */
	uint8_t		scan_start;
	uint8_t		scan_start_old;
	uint8_t		audio_ev_lvl;
	uint8_t		reset;

}AmbiMate_Devie_TypeDef_t;

/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/

/* Exported functions ------------------------------------------------------- */

void ambimate_init(void);
uint8_t ambimate_read_all(void);
uint8_t ambimate_read_reg(uint8_t reg);
uint8_t ambimate_write_reg(uint8_t reg, uint8_t value);
uint8_t ambimate_read_multi(uint8_t reg, uint8_t *pData, uint8_t size);

//Sentimate Sensor
void configure_interrupt_event_out(void);
void halInternalEventOutIsr(uint8_t pin);
/* AmbiMate Device */
extern AmbiMate_Devie_TypeDef_t	am_dev;

void ambimate_i2c_init(I2C_TypeDef *i2c);


#endif /* HARDWARE_AMBIMATE_AMBIMATE_H_ */
/***************** (C) FAE TECHNOLOGY S.P.A. 2019 ****** END OF FILE ***********/

