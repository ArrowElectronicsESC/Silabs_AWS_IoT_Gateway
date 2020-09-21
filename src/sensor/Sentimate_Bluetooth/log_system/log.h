#ifndef _LOG_H_
#define _LOG_H_

#include "stdio.h"
#include "retargetserial.h"
#include "../RTT/SEGGER_RTT.h"
#include "native_gecko.h"

/* General part - High level definitions */
#define LOG_LEVEL									LVL_VERBOSE
#define LOG_PORT									SEGGER_JLINK_VIEWER

#define PORT_VCOM									1
#define SEGGER_JLINK_VIEWER							2

#define NO_LOG										0
#define LVL_ERROR									1
#define LVL_WARNING									2
#define LVL_INFO									3
#define LVL_DEBUG									4
#define LVL_VERBOSE									5

#if (LOG_PORT == SEGGER_JLINK_VIEWER)
#define INIT_LOG()								SEGGER_RTT_Init()
#define LOG(...)								SEGGER_RTT_printf(0, __VA_ARGS__)
#elif (LOG_PORT == PORT_VCOM)
#define INIT_LOG()								RETARGET_SerialInit()
#define LOG(...)								printf(__VA_ARGS__)
#else
#define INIT_LOG()
#define LOG(...)
#endif

#define UINT8_ARRAY_DUMP(array_base, array_size)							\
	do {                                                                    \
        for (int i = 0; i<(array_size); i++)                                \
            LOG("%02X ", ((char*)(array_base))[i]);							\
	} while(0)

#define LOGN()																\
	do{																		\
		LOG("\r\n");														\
	}while(0)

#define LOG_DIRECT_ERR(_prefix_, ...)										\
	do{																		\
			LOG(RTT_CTRL_TEXT_BRIGHT_RED _prefix_, ##__VA_ARGS__);			\
}while(0)

/**
 * Different level log system
 */

/* Error */
#define LOGE(_prefix_, ...)													\
	do{																		\
		if(LOG_LEVEL >=  LVL_ERROR){										\
			LOG(RTT_CTRL_TEXT_BRIGHT_RED"E] " _prefix_, ##__VA_ARGS__);			\
		}																																																\
}while(0)

/* Warning */
#define LOGW(_prefix_, ...)													\
	do{																		\
		if(LOG_LEVEL >=  LVL_WARNING){										\
			LOG(RTT_CTRL_TEXT_BRIGHT_YELLOW"W] " _prefix_, ##__VA_ARGS__);		\
		}																																																\
}while(0)

/* Information */
#define LOGI(_prefix_, ...)													\
	do{																		\
		if(LOG_LEVEL >=  LVL_INFO){											\
			LOG(RTT_CTRL_TEXT_BRIGHT_CYAN"I] " _prefix_, ##__VA_ARGS__);		\
		}																																																\
}while(0)

/* DEBUG */
#define LOGD(_prefix_, ...)													\
	do{																		\
		if(LOG_LEVEL >=  LVL_DEBUG){										\
			LOG(RTT_CTRL_TEXT_BRIGHT_GREEN"D] " _prefix_, ##__VA_ARGS__);		\
		}																																																\
}while(0)

/* Vobase */
#define LOGV(_prefix_, ...)													\
	do{																		\
		if(LOG_LEVEL >=  LVL_VERBOSE){										\
			LOG(RTT_CTRL_RESET"V] " _prefix_, ##__VA_ARGS__);				\
		}																																																\
}while(0)

/* Address error - file and line */
#define ERROR_ADDRESSING()													\
	do{																		\
			LOGE("  |--> File - %s, Line - %d\r\n", __FILE__, __LINE__);	\
	}while(0)

/**
 * Event Log Part
 */
#define EVENT_LOG_LEVEL							VERBOSE

#define NO_EVENT_LOG							0
#define CRITICAL								1
#define IMPORTANT								2
#define VERBOSE									3

#define CRITICAL_COLOR							RTT_CTRL_TEXT_BRIGHT_RED
#define IMPORTANT_COLOR							RTT_CTRL_TEXT_BRIGHT_YELLOW
#define VERBOSE_COLOR							RTT_CTRL_RESET

#define FUNCTION								""
#define EVT_CATEGORY							""

/*FUNCTION Macro doesn't be used yet */
#define EVT_CRITICAL_PREFIX						CRITICAL_COLOR FUNCTION EVT_CATEGORY
#define EVT_IMPORTANT_PREFIX					IMPORTANT_COLOR FUNCTION EVT_CATEGORY
#define EVT_VERBOSE_PREFIX						VERBOSE_COLOR FUNCTION EVT_CATEGORY

#define COEX									1
#define DFU										1
#define ENDPOINT								1
#define PSTORE									1
#define	GATT									1
#define GATT_SERVER								1
#define HARDWARE								1
#define LE_CONNECTION							1
#define LE_GAP									1
#define	LE_SM									1
#define SYSTEM									1
#define TEST									1
#define USER									1

/**
 * Critical events
 */
#define EVT_LOG_C(_evt_name_, _attached_, ...)				\
	do{																									\
		if(EVENT_LOG_LEVEL >= CRITICAL){									\
			LOG(EVT_CRITICAL_PREFIX _evt_name_ _attached_, ##__VA_ARGS__);	\
		}																									\
	}while(0)

/**
 * Important events
 */
#define EVT_LOG_I(_evt_name_, _attached_, ...)				\
	do{																									\
		if(EVENT_LOG_LEVEL >= IMPORTANT){									\
			LOG(EVT_IMPORTANT_PREFIX _evt_name_ _attached_, ##__VA_ARGS__);	\
		}																									\
	}while(0)

/**
 * Verbose events
 */
#define EVT_LOG_V(_evt_name_, _attached_, ...)				\
	do{																									\
		if(EVENT_LOG_LEVEL >= VERBOSE){									\
			LOG(EVT_VERBOSE_PREFIX _evt_name_ _attached_, ##__VA_ARGS__);	\
		}																									\
	}while(0)

/**
 * Test purpose
 */
#define TRY_OUT_ALL_COLORS()				\
	do{																\
		for(uint8_t i=1; i<8; i++){			\
			SEGGER_RTT_printf(0, "[2;3%dm""Normal color. Test For Log out...\r\n", i);	\
			SEGGER_RTT_printf(0, "[1;3%dm""Bright color. Test For Log out...\r\n", i);	\
		}																																							\
	}while(0)

/**
 * Function declarations
 */
uint16_t error_checking(uint16_t error_code, uint8_t directly);
void log_events(const struct gecko_cmd_packet* evt);

#define SE_CALL(x)						\
	do{									\
		if (error_checking(x->result, 0)) {		\
			ERROR_ADDRESSING();		\
		}}while(0)

#define SURROUNDING(x)					"<" x "> - "
#endif
