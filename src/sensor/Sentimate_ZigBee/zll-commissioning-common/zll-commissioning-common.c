/***************************************************************************//**
 * @file
 * @brief Routines for the ZLL Commissioning Common plugin, which defines
 *        functions common to both server and client sides of the ZLL protocol.
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

#include "app/framework/include/af.h"
#include "app/framework/util/af-main.h"
#include "app/framework/util/common.h"
#include "zll-commissioning-common.h"

// AppBuilder already prevents multi-network ZLL configurations.  This is here
// as a reminder that the code below assumes that there is exactly one network
// and that it is ZigBee PRO.
#if EMBER_SUPPORTED_NETWORKS != 1
  #error ZLL is not supported with multiple networks.
#endif

#ifdef EMBER_AF_PLUGIN_NETWORK_CREATOR
  #include EMBER_AF_API_NETWORK_CREATOR
#endif

//------------------------------------------------------------------------------
// Globals

#define isFactoryNew(state) ((state) & EMBER_ZLL_STATE_FACTORY_NEW)

// The target network - used by both client and server sides, the latter mainly for
// the touchlink complete callback to the application.
EmberZllNetwork emAfZllNetwork;

#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT
// Sub-device info (mainly for client, but server needs to initialize the count)
EmberZllDeviceInfoRecord emAfZllSubDevices[EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT_SUB_DEVICE_TABLE_SIZE];
uint8_t emAfZllSubDeviceCount = 0;
#endif

// The module state for both client and server.
uint16_t emAfZllFlags = INITIAL;

#ifdef PLUGIN_DEBUG
static const uint8_t emAfZllCommissioningPluginName[] = "ZLL Commissioning Common";
#define PLUGIN_NAME emAfZllCommissioningPluginName
#endif

// Private ZLL commissioning functions
void emAfZllFinishNetworkFormationForRouter(EmberStatus status);
void emAfZllAbortTouchLink(EmberAfZllCommissioningStatus reason);
void emAfZllStackStatus(EmberStatus status);
void emAfZllInitializeRadio(void);
bool emAfZllStealingAllowed(void);

// Forward references
bool emAfZllAmFactoryNew(void);
#ifdef EZSP_HOST
void emberAfPluginZllCommissioningCommonNcpInitCallback(bool memoryAllocation);
#else
void emberAfPluginZllCommissioningCommonInitCallback(void);
#endif

//------------------------------------------------------------------------------
// Module private functions

static void setProfileInteropState(void)
{
  EmberTokTypeStackZllData token;

  emberZllGetTokenStackZllData(&token);
  token.bitmask |= EMBER_ZLL_STATE_PROFILE_INTEROP;
  emberZllSetTokenStackZllData(&token);
}

static void initFactoryNew(void)
{
  // The initialization is only performed if we are factory new in the BDB sense,
  // i.e. not joined to a centralized or distributed network.
  if (emAfZllAmFactoryNew()) {
    emberAfAppPrintln("ZllCommInit - device is not joined to a network");

    // Set the default ZLL node type for both client and server, for Scan Request
    // and Scan Response messages respectively.
    emberSetZllNodeType((emAfCurrentZigbeeProNetwork->nodeType
                         == EMBER_COORDINATOR)
                        ? EMBER_ROUTER
                        : emAfCurrentZigbeeProNetwork->nodeType);

#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_SERVER
    emAfZllInitializeRadio();
#endif

#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT
    // Set the address assignment capability bit to true for a client in all cases.
    emberSetZllAdditionalState(EMBER_ZLL_STATE_ADDRESS_ASSIGNMENT_CAPABLE);
#endif

#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_COMMON_ZIGBEE3_SUPPORT
    // Set interop bit here if we support Zigbee 3.0.
    setProfileInteropState();
#endif

    // Set the security state here, in case of incoming scan requests, to ensure
    // that our security key bitmask matches that of the initiator, or in case
    // we initiate a touchlink after joining by classical commissioning.
    emberAfZllSetInitialSecurityState();
  }
}

static void completeResetToFactoryNew(void)
{
  emberAfAppPrintln("Resetting to factory new");
  emberAfResetAttributes(EMBER_BROADCAST_ENDPOINT);
  emberAfGroupsClusterClearGroupTableCallback(EMBER_BROADCAST_ENDPOINT);
  emberAfScenesClusterClearSceneTableCallback(EMBER_BROADCAST_ENDPOINT);
#ifdef EZSP_HOST
  emberAfPluginZllCommissioningCommonNcpInitCallback(false);
#else
  emberAfPluginZllCommissioningCommonInitCallback();
#endif
  emberAfPluginZllCommissioningCommonResetToFactoryNewCallback();
  emAfZllFlags = INITIAL;
}

//------------------------------------------------------------------------------
// ZLL commissioning private functions

bool emAfZllAmFactoryNew(void)
{
  EmberTokTypeStackZllData token;
  emberZllGetTokenStackZllData(&token);
  return isFactoryNew(token.bitmask);
}

void emAfZllTouchLinkComplete(void)
{
  EmberNodeType nodeType;
  EmberNetworkParameters parameters;
  emAfZllFlags = INITIAL;
  emberAfGetNetworkParameters(&nodeType, &parameters);
  emAfZllNetwork.zigbeeNetwork.channel = parameters.radioChannel;
  emAfZllNetwork.zigbeeNetwork.panId = parameters.panId;
  MEMMOVE(emAfZllNetwork.zigbeeNetwork.extendedPanId,
          parameters.extendedPanId,
          EXTENDED_PAN_ID_SIZE);
  emAfZllNetwork.zigbeeNetwork.nwkUpdateId = parameters.nwkUpdateId;
#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT
  emberAfPluginZllCommissioningCommonTouchLinkCompleteCallback(&emAfZllNetwork,
                                                               emAfZllSubDeviceCount,
                                                               (emAfZllSubDeviceCount == 0
                                                                ? NULL
                                                                : emAfZllSubDevices));
#else
  emberAfPluginZllCommissioningCommonTouchLinkCompleteCallback(&emAfZllNetwork, 0, NULL);
#endif //EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT
}

EmberNodeType emAfZllGetLogicalNodeType(void)
{
  EmberNodeType nodeType;
  EmberStatus status = emberAfGetNodeType(&nodeType);

  // Note, we only report as a coordinator if we are a currently
  // coordinator on a centralized network.
  if (status == EMBER_NOT_JOINED) {
    nodeType = emAfCurrentZigbeeProNetwork->nodeType;
    if (nodeType == EMBER_COORDINATOR) {
      nodeType = EMBER_ROUTER;
    }
  }
  return nodeType;
}

//------------------------------------------------------------------------------
// Public functions

void emberAfPluginZllCommissioningCommonInitCallback(void)
{
#ifndef EZSP_HOST
  // Set the policy for both server and client.
#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_SERVER
  EmberZllPolicy policy = (emAfZllStealingAllowed() ? EMBER_ZLL_POLICY_ENABLED : EMBER_ZLL_POLICY_NO_TOUCHLINK_FOR_NFN);
#else
  EmberZllPolicy policy = EMBER_ZLL_POLICY_ENABLED;
#endif
  emberZllSetPolicy(policy);

  // Set the primary and secondary channel masks for both server and client.
  emberSetZllPrimaryChannelMask(EMBER_AF_PLUGIN_ZLL_COMMISSIONING_COMMON_PRIMARY_CHANNEL_MASK);
  emberSetZllSecondaryChannelMask(EMBER_AF_PLUGIN_ZLL_COMMISSIONING_COMMON_SECONDARY_CHANNEL_MASK);

  // Factory new initialization
  initFactoryNew();
#endif // #ifndef EZSP_HOST
}

void emberAfPluginZllCommissioningCommonNcpInitCallback(bool memoryAllocation)
{
#ifdef EZSP_HOST
  if (!memoryAllocation) {
    // Set the policy for both server and client.
#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_SERVER
    EmberZllPolicy policy = (emAfZllStealingAllowed() ? EMBER_ZLL_POLICY_ENABLED : EMBER_ZLL_POLICY_NO_TOUCHLINK_FOR_NFN);
#else
    EmberZllPolicy policy = EMBER_ZLL_POLICY_ENABLED;
#endif
    emberAfSetEzspPolicy(EZSP_ZLL_POLICY,
                         policy,
                         "ZLL policy",
                         "enable");

    // Set the primary and secondary channel masks for both server and client.
    emberSetZllPrimaryChannelMask(EMBER_AF_PLUGIN_ZLL_COMMISSIONING_COMMON_PRIMARY_CHANNEL_MASK);
    emberSetZllSecondaryChannelMask(EMBER_AF_PLUGIN_ZLL_COMMISSIONING_COMMON_SECONDARY_CHANNEL_MASK);

    // Factory new initialization
    initFactoryNew();
  }
#endif // #ifdef EZSP_HOST
}

EmberStatus emberAfZllSetInitialSecurityState(void)
{
  EmberKeyData networkKey;
  EmberZllInitialSecurityState securityState = {
    0, // bitmask - unused
    EMBER_ZLL_KEY_INDEX_CERTIFICATION,
    EMBER_ZLL_CERTIFICATION_ENCRYPTION_KEY,
    EMBER_ZLL_CERTIFICATION_PRECONFIGURED_LINK_KEY,
  };
  EmberStatus status;

  // We can only initialize security information while not on a network - this
  // also covers the case where we are joined as a coordinator.
  if (emberAfNetworkState() != EMBER_NO_NETWORK) {
    return EMBER_SUCCESS;
  }

  status = emberAfGenerateRandomKey(&networkKey);
  if (status != EMBER_SUCCESS) {
    emberAfAppPrintln("%p%p failed 0x%x",
                      "Error: ",
                      "Generating random key",
                      status);
    return status;
  }

  emberAfPluginZllCommissioningCommonInitialSecurityStateCallback(&securityState);
  status = emberZllSetInitialSecurityState(&networkKey, &securityState);

  if (status != EMBER_SUCCESS) {
    emberAfAppPrintln("%p%p failed 0x%x",
                      "Error: ",
                      "Initializing security",
                      status);
  }
  return status;
}

bool emberAfZllTouchLinkInProgress(void)
{
  return touchLinkInProgress();
}

void emberAfZllResetToFactoryNew(void)
{
  // The leave will cause the ZLL state to be set to 'factory new',
  // but after a short delay.
  emAfZllFlags |= RESETTING_TO_FACTORY_NEW;
  EmberStatus status = emberLeaveNetwork();
  if (status != EMBER_SUCCESS) {
    emberAfAppPrintln("Error: Failed to leave network, status: 0x%X",
                      status);
    emberZllClearTokens();
    completeResetToFactoryNew();
  }
}

void emberAfPluginZllCommissioningCommonStackStatusCallback(EmberStatus status)
{
  // If we are forming a network for a router initiator, then we handle
  // this status separately.
  // During touch linking, EMBER_NETWORK_UP means the process is complete.  Any
  // other status, unless we're busy joining or rejoining, means that the touch
  // link failed.
  debugPrintln("%p: ZllCommStackStatus: status = %X, flags = %X", PLUGIN_NAME, status, emAfZllFlags);

#if defined(EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT) && defined(EMBER_AF_PLUGIN_NETWORK_CREATOR)
  if (formingNetwork()) {
    emAfZllFinishNetworkFormationForRouter(status);
  } else
#endif

  if (touchLinkInProgress()) { // including TOUCH_LINK_TARGET
    if (status == EMBER_NETWORK_UP) {
      emAfZllTouchLinkComplete();
    } else if (status == EMBER_NETWORK_DOWN) {
      // We don't do anything here for a network down.
    } else {
      emberAfAppPrintln("%p%p%p: status = %X, flags = %X",
                        "Error: ",
                        "Touch linking failed: ",
                        "joining failed",
                        status, emAfZllFlags);
#ifdef EMBER_AF_PLUGIN_ZLL_COMMISSIONING_CLIENT
      if (!touchLinkTarget()) {
        emAfZllAbortTouchLink(EMBER_AF_ZLL_JOINING_FAILED);
      }
#endif
    }
  } else if (resettingToFactoryNew()) {
    if (status == EMBER_NETWORK_DOWN) {
      completeResetToFactoryNew();
    }
  } else {
    // Here we catch all fresh non-ZLL network joins, and set the ZLL state accordingly.
    EmberTokTypeStackZllData token;
    emberZllGetTokenStackZllData(&token);

    if (status == EMBER_NETWORK_UP && (token.bitmask & EMBER_ZLL_STATE_FACTORY_NEW)) {
      // When either a router or an end device joins a non-ZLL network, it is
      // no longer factory new.  On a non-ZLL network, ZLL devices that are
      // normally address assignment capable do not have free network or group
      // addresses nor do they have a range of group addresses for themselves.
      // (Note, to ensure that ZLL devices will always operate as ZigBee 3.0 applications,
      // we need to set the ZLL profile interop bit even when the application
      // joins a classical ZigBee network. This way, if the device is stolen from
      // a classical ZigBee network to a ZLL network, it will operate as a
      // ZigBee 3.0 device. This is now set at plugin initialization time.)
      token.bitmask &= ~EMBER_ZLL_STATE_FACTORY_NEW;
      token.freeNodeIdMin = token.freeNodeIdMax = EMBER_ZLL_NULL_NODE_ID;
      token.myGroupIdMin = EMBER_ZLL_NULL_GROUP_ID;
      token.freeGroupIdMin = token.freeGroupIdMax = EMBER_ZLL_NULL_GROUP_ID;
      emberZllSetTokenStackZllData(&token);
      emberZllSetNonZllNetwork();
    }
    // Otherwise, we just ignore the status, for example, a network up
    // from a rejoin or a join at startup.
  }
}
