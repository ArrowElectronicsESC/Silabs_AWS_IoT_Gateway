/***************************************************************************//**
 * @file
 * @brief Contains storage and function for retrieving attribute size.
 *******************************************************************************
 * # License
 * <b>Copyright 2018 Silicon Laboratories Inc. www.silabs.com</b>
 *******************************************************************************
 *
 * The licensor of this software is Silicon Laboratories Inc. Your use of this
 * software is governed by the terms of Silicon Labs Master Software License
 * Agreement (MSLA) available at
 * www.silabs.com/about-us/legal/master-software-license-agreement. This
 * software is distributed to you in Source Code format and is governed by the
 * sections of the MSLA applicable to Source Code.
 *
 ******************************************************************************/

#include PLATFORM_HEADER

#include "attribute-type.h"

static const uint8_t attributeSizes[] =
{
#include "attribute-size.h"
};

uint8_t emberAfGetDataSize(uint8_t dataType)
{
  uint8_t i;
  for (i = 0; (i + 1) < sizeof(attributeSizes); i += 2) {
    if (attributeSizes[i] == dataType) {
      return attributeSizes[i + 1];
    }
  }

  return 0;
}
