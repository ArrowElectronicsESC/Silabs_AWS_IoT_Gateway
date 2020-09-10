from __future__ import print_function
import boto3
import json
import datetime
from boto3.dynamodb.conditions import Key
from botocore.vendored import requests

TABLE_NAME = 'test_db'
dynamodb = boto3.resource('dynamodb')

# --------------- Helpers that build all of the responses ----------------------


def build_permissions_response(title, output, reprompt_text, should_end_session):
    return {
        'outputSpeech': {
            'type': 'PlainText',
            'text': output
        },
        'card': {
            'type': 'AskForPermissionsConsentCard',
            'permissions': [
                "alexa::profile:email:read"
                ]
        },
        'reprompt': {
            'outputSpeech': {
                'type': 'PlainText',
                'text': reprompt_text
            }
        },
        'shouldEndSession': should_end_session
    }
    
def build_speechlet_response(title, output, reprompt_text, should_end_session):
    return {
        'outputSpeech': {
            'type': 'PlainText',
            'text': output
        },
        'card': {
            'type': 'Simple',
            'title': title,
            'content': output
        },
        'reprompt': {
            'outputSpeech': {
                'type': 'PlainText',
                'text': reprompt_text
            }
        },
        'shouldEndSession': should_end_session
    }


def build_response(session_attributes, speechlet_response):
    return {
        'version': '1.0',
        'sessionAttributes': session_attributes,
        'response': speechlet_response
    }


# --------------- Functions that control the skill's behavior ------------------

EMAIL_API_ENDPOINT = "/v2/accounts/~current/settings/Profile.email"
NAME_API_ENDPOINT = "/v2/accounts/~current/settings/Profile.name"
userEmail = ''

def getAttributeFromDb(userEmail, sensorName, temperature=False, humidity=False, CO2=False):
    r = {}
    if temperature:
        attribute = {'key':'temperature'}
    if humidity:
        print(humidity)
        attribute = {'key':'humidity'}
    if CO2:
        print(CO2)
        attribute = {'key':'CO2'}
        
    deviceTable = dynamodb.Table('devices')
    
    userId = userEmail
    sensorName = sensorName
    sensorId = ''
    
    resp = deviceTable.query(
            IndexName="userId-index",
            KeyConditionExpression=Key('userId').eq(userId),
            )
    
    if len(resp['Items']) == 0:
        r['statusCode'] = 500
        print("Did not find any entry with the email: {}". format(userId))
        r['message'] = 'GatewayNotFoundUnderUser'
        return r
        
    print("The query returned the following items:")
    for item in resp['Items']:
            print(item)
            for sensor in item['sensors']:
                if sensor['sensorName'].lower() == sensorName:
                    sensorId = sensor['sensorId']
                    break
    
    if sensorId == '':
        r['statusCode'] = 501
        print("Did not find sensorName: {0} with the userId: {1}".format(sensorName, userId))
        r['message'] = 'SensorNotFoundUnderUser'
        return r
    print('Found sensorId: {}'.format(sensorId))
    
    telemetryTable = dynamodb.Table('telemetry')
    
    current_time = datetime.datetime.now()  # use datetime.datetime.utcnow() for UTC time
    two_minutes_ago = current_time - datetime.timedelta(minutes=2)
    
    timeDiff = int(two_minutes_ago.timestamp() * 1000)  # in miliseconds
        
    response = telemetryTable.query(
            KeyConditionExpression=Key('sensorId').eq(sensorId) & Key('timestamp').gt(str(timeDiff)),
            ScanIndexForward=False
          )
    
    
    print('Query Result:')
    for item in response['Items']:
        print(item)
        if attribute['key'] in item:
            print("The {0} is: {1}".format(attribute['key'], item[attribute['key']]))
            r['message'] = item[attribute['key']]
            r['statusCode'] = 200
            break
    
    return r
        
    
def getUserEmail(baseUrl, token):
    url = baseUrl + EMAIL_API_ENDPOINT
    headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
    response = requests.request("GET", url, headers=headers)

    r = {}
    r['statusCode'] = response.status_code
    r['message'] = response.text
    return r

def getUserName(baseUrl, token):
    url = baseUrl + NAME_API_ENDPOINT
    headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
    response = requests.request("GET", url, headers=headers)

    r = {}
    r['statusCode'] = response.status_code
    r['message'] = response.text
    return r

def setUserDetailsInSession(context):
    sessionAttributes = {}
    
    cardTitle = "Welcome"
    r = getUserName(context['System']['apiEndpoint'], context['System']['apiAccessToken'])
    print("Get userName response: {}".format(str(r)))
    if r['statusCode'] == 200:
        name = r['message'].strip('\"').split(" ")[0]
        sessionAttributes['name'] = name
    elif r['statusCode'] in ['401', '403']:
        speech_output = "In order to get the sensor data, " \
            "EFR Gateway will need access to your email address and name. " \
            "Go to the home screen in your Alexa app and grant me permissions."
                    
        reprompt_text = "Please, Can you grant me permissions ? "
                                
        return build_response(sessionAttributes, build_speechlet_response(
            card_title, speech_output, reprompt_text, should_end_session))
            
    r = getUserEmail(context['System']['apiEndpoint'], context['System']['apiAccessToken'])
    print("Get email response: {}".format(str(r)))
    if r['statusCode'] == 200:
        email = r['message'].strip('\"')
        sessionAttributes['email'] = email
    elif r['statusCode'] in ['401', '403']:
        speech_output = "In order to get the sensor data, " \
            "EFR Gateway will need access to your email address and name. " \
            "Go to the home screen in your Alexa app and grant me permissions."
            
        reprompt_text = "Please, Can you grant me permissions ? "
                        
        return build_response(sessionAttributes, build_speechlet_response(
            card_title, speech_output, reprompt_text, should_end_session))
            
    return sessionAttributes
    

def get_permissions_not_found_message():
    session_attributes = {}
    card_title = "Permission Error"
    speech_output = "In order to get the sensor data, " \
                    "EFR IoT Gateway will need access to your email address. " \
                    "Go to the home screen in your Alexa app and grant me permissions."
    reprompt_text = "Please, Can you grant me permissions ? "
    should_end_session = True
    return build_response(session_attributes, build_speechlet_response(
        card_title, speech_output, reprompt_text, should_end_session))


def getCO2Details(intent, session, context):
    card_title = intent['name']
    if 'attributes' in session:
        sessionAttributes = session['attributes']
    else:
        sessionAttributes = {}
        sessionAttributes = setUserDetailsInSession(context)
        
    should_end_session = False
    
    if not all(key in sessionAttributes for key in ('email', 'name')):
        print("Could not get the email or name")
        return get_permissions_not_found_message()
    
    if 'sensorName' in intent['slots']:

            sensorName = intent['slots']['sensorName']['value']
            sessionAttributes['sensorName'] = sensorName
            
            r = getAttributeFromDb(sessionAttributes['email'], sensorName, None, None, True)
          
            if (r['statusCode'] == 200):  
                speech_output = "The {0} of your {1} is {2}".format("CO2", sensorName, r['message'])
                                
                reprompt_text = "The {0} of your {1} is {2}".format("CO2", sensorName, r['message'])
            elif (r['statusCode'] == 500):
                speech_output = "Sorry {0}, I couldn't find any gateway associated with your email. " \
                                "Make sure you register a gateway from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'])
                                
                reprompt_text = "Are you sure you have a gateway registered? I couldn't find the details"
            elif (r['statusCode'] == 501):
                speech_output = "Sorry {0}, I couldn't find any sensor with that name associated with your account. " \
                                "Make sure you register a sensor with the name: {1} from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Are you sure you have a sensor with that name registered? I couldn't find the details"
            else:
                speech_output = "Sorry {0}, I don't have data of your {1} for the past 2 mins. " \
                                "Please try again after sometime".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Can you check if the sensor is active? I couldn't find details"
    else:
        speech_output = "I'm not sure about the name. " \
                        " Can you tell the name of sensor again ? "

        reprompt_text = "Can you please tell me the name of the sensor?"

    return build_response(sessionAttributes, build_speechlet_response(
        card_title, speech_output, reprompt_text, should_end_session))


def getHumidityDetails(intent, session, context):
    card_title = intent['name']
    if 'attributes' in session:
        sessionAttributes = session['attributes']
    else:
        sessionAttributes = {}
        sessionAttributes = setUserDetailsInSession(context)
        
    should_end_session = False
    
    if not all(key in sessionAttributes for key in ('email', 'name')):
        print("Could not get the email or name")
        return get_permissions_not_found_message()
    
    if 'sensorName' in intent['slots']:

            sensorName = intent['slots']['sensorName']['value']
            sessionAttributes['sensorName'] = sensorName
            
            r = getAttributeFromDb(sessionAttributes['email'], sensorName, None, True, None)
          
            if (r['statusCode'] == 200):  
                speech_output = "The {0} of your {1} is {2}".format("humidity", sensorName, r['message'])
                                
                reprompt_text = "The {0} of your {1} is {2}".format("humidity", sensorName, r['message'])
            elif (r['statusCode'] == 500):
                speech_output = "Sorry {0}, I couldn't find any gateway associated with your email. " \
                                "Make sure you register a gateway from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'])
                                
                reprompt_text = "Are you sure you have a gateway registered? I couldn't find the details"
            elif (r['statusCode'] == 501):
                speech_output = "Sorry {0}, I couldn't find any sensor with that name associated with your account. " \
                                "Make sure you register a sensor with the name: {1} from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Are you sure you have a sensor with that name registered? I couldn't find the details"
            else:
                speech_output = "Sorry {0}, I don't have data of your {1} for the past 2 mins. " \
                                "Please try again after sometime".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Can you check if the sensor is active? I couldn't find details"
    else:
        speech_output = "I'm not sure about the name. " \
                        " Can you tell the name of sensor again ? "

        reprompt_text = "Can you please tell me the name of the sensor?"

    return build_response(sessionAttributes, build_speechlet_response(
        card_title, speech_output, reprompt_text, should_end_session))


def getTemperatureDetails(intent, session, context):
    
    card_title = intent['name']
    if 'attributes' in session:
        sessionAttributes = session['attributes']
    else:
        print("Getting sessionAttributes....")
        sessionAttributes = {}
        sessionAttributes = setUserDetailsInSession(context)
        print("sessionAttributes: ", sessionAttributes)
        
        
    if not all(key in sessionAttributes for key in ('email', 'name')):
        print("Could not get the email or name")
        return get_permissions_not_found_message()

    should_end_session = False
    
    if 'sensorName' in intent['slots']:

            sensorName = intent['slots']['sensorName']['value']
            sessionAttributes['sensorName'] = sensorName
            
            r = getAttributeFromDb(sessionAttributes['email'], sensorName, True, None, None)
          
            if (r['statusCode'] == 200):  
                speech_output = "The {0} of your {1} is {2} Fahrenheit".format("temperature", sensorName, r['message'])
                                
                reprompt_text = "The {0} of your {1} is {2} Fahrenheit".format("temperature", sensorName, r['message'])
            elif (r['statusCode'] == 500):
                speech_output = "Sorry {0}, I couldn't find any gateway associated with your email. " \
                                "Make sure you register a gateway from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'])
                                
                reprompt_text = "Are you sure you have a gateway registered? I couldn't find the details"
            elif (r['statusCode'] == 501):
                speech_output = "Sorry {0}, I couldn't find any sensor with that name associated with your account. " \
                                "Make sure you register a sensor with the name: {1} from the EFR32 IoT Gateway Mobile Application".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Are you sure you have a sensor with that name registered? I couldn't find the details"
            else:
                speech_output = "Sorry {0}, I don't have data of your {1} for the past 2 mins. " \
                                "Please try again after sometime".format(sessionAttributes['name'], sensorName)
                                
                reprompt_text = "Can you check if the sensor is active? I couldn't find details"
    else:
        speech_output = "I'm not sure about the name. " \
                        " Can you tell the name of sensor again ? "

        reprompt_text = "Can you please tell me the name of the sensor?"

    return build_response(sessionAttributes, build_speechlet_response(
        card_title, speech_output, reprompt_text, should_end_session))



def get_welcome_response(session, context):
    sessionAttributes = {}
    
    cardTitle = "Welcome"
    r = getUserName(context['System']['apiEndpoint'], context['System']['apiAccessToken'])
    if r['statusCode'] == 200:
        name = r['message'].strip('\"').split(" ")[0]
        sessionAttributes['name'] = name
    elif r['statusCode'] in ['401', '403']:
        speech_output = "In order to get the sensor data, " \
            "EFR Gateway will need access to your email address and name. " \
            "Go to the home screen in your Alexa app and grant me permissions."
                    
        reprompt_text = "Please, Can you grant me permissions ? "
                                
        return build_response(sessionAttributes, build_speechlet_response(
            card_title, speech_output, reprompt_text, should_end_session))
            
    r = getUserEmail(context['System']['apiEndpoint'], context['System']['apiAccessToken'])
    if r['statusCode'] == 200:
        email = r['message'].strip('\"')
        sessionAttributes['email'] = email
    elif r['statusCode'] in ['401', '403']:
        speech_output = "In order to get the sensor data, " \
            "EFR Gateway will need access to your email address and name. " \
            "Go to the home screen in your Alexa app and grant me permissions."
            
        reprompt_text = "Please, Can you grant me permissions ? "
                        
        return build_response(sessionAttributes, build_speechlet_response(
            card_title, speech_output, reprompt_text, should_end_session))
            
    speech_output = "Hello " + name + ". " \
                    "How can I help you today?"
    reprompt_text = "Hello " + name + "" \
                    "How can I help you today?"
    should_end_session = False
    ###############
    print("User: ")
    print(sessionAttributes)
    ###############
    return build_response(sessionAttributes, build_speechlet_response(
        cardTitle, speech_output, reprompt_text, should_end_session))


def handle_session_end_request():
    card_title = "Session Ended"
    speech_output = "Good bye! " \
                    "Have a nice day! "
    should_end_session = True
    return build_response({}, build_speechlet_response(
        card_title, speech_output, None, should_end_session))

# --------------- Events ------------------

def on_session_started(session_started_request, session):
    """ Called when the session starts """

    print("on_session_started requestId=" + session_started_request['requestId']
          + ", sessionId=" + session['sessionId'])


def on_launch(launch_request, session, context):
    """ Called when the user launches the skill without specifying what they
    want
    """

    print("on_launch requestId=" + launch_request['requestId'] +
          ", sessionId=" + session['sessionId'])
    if not 'permissions' in session['user']:
        print('User Email Consent not found')
        return get_permissions_not_found_message()
        # Do send fallback message
    else:
        # Dispatch to your skill's launch
        return get_welcome_response(session, context)


def on_intent(intent_request, session, context):
    """ Called when the user specifies an intent for this skill """

    print("on_intent requestId=" + intent_request['requestId'] +
          ", sessionId=" + session['sessionId'])

    intent = intent_request['intent']
    intent_name = intent_request['intent']['name']
    print('Received IntentRequest: {}'.format(intent_name))

    # Dispatch to your skill's intent handlers
    if intent_name == "TemperatureIntent":
        return getTemperatureDetails(intent, session, context)
    if intent_name == "HumidityIntent":
        return getHumidityDetails(intent, session, context)
    if intent_name == "COIntent":
        return getCO2Details(intent, session, context)
    if intent_name == "HelloWorldIntent":
        return set_visitor_name_in_session(intent, session)
    elif intent_name == "EmpNameIsIntent":
        return set_emp_name_in_session(intent, session)
    elif intent_name == "AMAZON.HelpIntent":
        return get_welcome_response()
    elif intent_name == "AMAZON.CancelIntent" or intent_name == "AMAZON.StopIntent":
        return handle_session_end_request()
    else:
        raise ValueError("Invalid intent")


def on_session_ended(session_ended_request, session):
    """ Called when the user ends the session.

    Is not called when the skill returns should_end_session=true
    """
    print("on_session_ended requestId=" + session_ended_request['requestId'] +
          ", sessionId=" + session['sessionId'])
    # add cleanup logic here


# --------------- Main handler ------------------

def lambda_handler(event, context):
    """ Route the incoming request based on type (LaunchRequest, IntentRequest,
    etc.) The JSON body of the request is provided in the event parameter.
    """
    print("event.session.application.applicationId=" +
          event['session']['application']['applicationId'])

    """
    Uncomment this if statement and populate with your skill's application ID to
    prevent someone else from configuring a skill that sends requests to this
    function.
    """
    # if (event['session']['application']['applicationId'] !=
    #         "amzn1.echo-sdk-ams.app.[unique-value-here]"):
    #     raise ValueError("Invalid Application ID")

    print("Event Received: ")
    print(event)
    if event['session']['new']:
        on_session_started({'requestId': event['request']['requestId']},
                           event['session'])

    if event['request']['type'] == "LaunchRequest":
        return on_launch(event['request'], event['session'], event['context'])
    elif event['request']['type'] == "IntentRequest":
        return on_intent(event['request'], event['session'], event['context'])
    elif event['request']['type'] == "SessionEndedRequest":
        return on_session_ended(event['request'], event['session'])

