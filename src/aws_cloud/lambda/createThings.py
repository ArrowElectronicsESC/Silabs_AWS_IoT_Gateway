import boto3
import botocore
import json
from boto3.dynamodb.conditions import Key

GATEWAY_TYPE = "gateway"
SENSOR_TYPE = "sentimate"

isGatewayPolicy = False
policyName = "gateway-policy"

iot = boto3.client('iot')
response = {}

def FindGatewayByGatewayId(gatewayId):
    print(type(gatewayId))
    dynamodb_table=getClient()
    table = dynamodb_table.Table('devices')
    response = table.get_item(
    Key={
        'gatewayId': gatewayId
        }
    )
    return response
    
    
def getClient():
    dynamodb = boto3.client('dynamodb' ,region_name='us-east-2')
    dynamodb_table = boto3.resource('dynamodb')
    print('Return db client.....')
    return dynamodb_table
    
    
def addToDB(payload, deviceType):
    outputObj={}
    print('Payload: {}'.format(payload))
    if(deviceType == GATEWAY_TYPE):
        print('in if')
        print(type(payload))
        try:
            dynamodb_table=getClient()
            table = dynamodb_table.Table('devices')
            response=table.put_item(
                    Item=payload
                    )
            print("Response: {}".format(response))
            if response['ResponseMetadata']['HTTPStatusCode']==200:
                outputObj['statusCode']=201
                outputObj['message']="Gateway registered successfully in dynamodb"
                return outputObj
        except botocore.exceptions.ClientError as error:
            print("Exception in dbData")
            print("Error: {}".format(error))
            outputObj['statusCode']=500
            outputObj['message']=error
            return outputObj
            
    elif (deviceType == SENSOR_TYPE):
        dynamodb_table=getClient()
        table = dynamodb_table.Table('devices')
        try:
            gatewayId=payload['gatewayId']
            print("Gateway id :"+gatewayId)
            payload.pop('gatewayId')
            gateway_response=FindGatewayByGatewayId(gatewayId)
            print(gateway_response)
            if 'Item' in gateway_response:
                gateway=gateway_response['Item']
                sensors=gateway['sensors']
                sensors.append(payload)
                response = table.update_item(
                    Key={
                        'gatewayId': gatewayId
                    },
                    UpdateExpression="set #s = :r",
                    ExpressionAttributeNames={
                    '#s': 'sensors'
                    },
                    ExpressionAttributeValues={
                        ':r': sensors,
                    },
                    ReturnValues="UPDATED_NEW"
                    )
                print(response)
                if 'Attributes' in response:
                    outputObj['statusCode']=201
                    outputObj['message']="Sensors registered successfully in dynamodb"
                    return outputObj
        except botocore.exceptions.ClientError as error:
            print("Exception in dbData")
            print("Error: {}".format(error))
            outputObj['statusCode']=500
            outputObj['message']=error
            return outputObj

def createDevice(payload):
    response["thing"] = []
    for data in payload:
        if(data["deviceType"] == GATEWAY_TYPE):
            print("Device type is: {}".format(GATEWAY_TYPE))
            macAddress = data["macAddress"]
            gatewayName = data["gatewayName"]
            description = data["description"]
            #groupName = "group-"+GATEWAY_TYPE+"-"+macAddress
            groupName = GATEWAY_TYPE+"-"+macAddress
            print("Creating group.....\nGroup name: {}".format(groupName))
            try:
                r = iot.create_thing_group(thingGroupName=groupName)
                print("Successfully created thing group!")
                response["group"] = r
            except botocore.exceptions.ClientError as error:
                if error.response['Error']['Code']  == 'ResourceAlreadyExistsException':
                    print(error.response['Error']['Code'])
                    print('Thing Group already exists')
                    response['error'] = "Thing Group already exists"
                    return response
                    
            groupArn = r['thingGroupArn']
            print("Group ARN: {}".format(groupArn))
            print("Attaching policy with the group: {}".format(groupArn))
            try:
                r = iot.attach_policy(policyName=policyName, target=groupArn)
                print("Successfully attached policy with the group!")
            except botocore.exceptions.ClientError as error:
                print("Error attaching the policy: {0} to the group: {1}".format(policyName, groupName))
                print(error.response['Error']['Code'])
                response['error'] = "Error attaching policy"
                return response

            thingName = data["deviceType"] + "-" + data["macAddress"]

            print("Creating thing: {}".format(thingName))
            try:
                r = iot.create_thing(thingName=thingName, thingTypeName=GATEWAY_TYPE)
                print("Thing: {} created successfully!".format(thingName))
                response["thing"] = r
                response["thing"]["gatewayName"] = gatewayName
            except botocore.exceptions.ClientError as error:
                print("Error creating the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response['error'] = "Error creating thing.."
                return response
        
            print("Attaching the thing with the group: {}".format(groupName))

            try:
                r = iot.add_thing_to_thing_group(thingName=thingName, thingGroupName=groupName)
                print("Successfully attached the thing: {0} with the group: {1}".format(thingName, groupName))
            except botocore.exceptions.ClientError as error:
                print("Error adding the thing: {} to the group: {}".format(thingName, groupName))
                print(error.response['Error']['Code'])
                response['error'] = "Error attaching thing to group"
                return response

            print("Creating certificates....")

            try:
                r = iot.create_keys_and_certificate(setAsActive=True)
                print("Successfully created certificates!")
                response["certificates"] = r
                certificateArn = r['certificateArn']
            except botocore.exceptions.ClientError as error:
                print("Error creating certificates.")
                print(error.response['Error']['Code'])
                response['error'] = "Error creating certificates"
                return response   

            print("Attaching policy with the certificate...")

            try:
                r = iot.attach_policy(policyName=policyName, target=certificateArn)
                print("Successfully attached the policy!")
            except botocore.exceptions.ClientError as error:
                print("Error attaching the policy to certificates.")
                print(error.response['Error']['Code'])
                response['error'] = "Error attaching policy to certificates"
                return response

            print("Attaching the created certificates with the thing: {}".format(thingName))

            try:
                r = iot.attach_thing_principal(thingName=thingName, principal=certificateArn)
                print("Successfully attached the certificate to thing: {}".format(thingName))
            except botocore.exceptions.ClientError as error:
                print("Error attaching certificates to the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response['error'] = "Error attaching things to certificates..."
                return response
            
            print("Getting endpoint details....")

            try:
                r = iot.describe_endpoint(endpointType="iot:Data-ATS")
                response["endpoint"] = r
            except botocore.exceptions.ClientError as error:
                print("Error attaching the policy to certificates.")
                print(error.response['Error']['Code'])
                response['error'] = "Error getting endpoint..."
                return response
            
            dbData = {}
            dbData["userId"] = data["userId"] 
            dbData["gatewayId"] = GATEWAY_TYPE+"-"+macAddress
            dbData["gatewayName"] = gatewayName
            dbData["description"] = description
            dbData["macAddress"] = data["macAddress"]
            dbData["sensors"] = []
            dbData["sendEmailNotifications"] = True
            dbData["sendSmsNotifications"] = False
            
            r = addToDB(dbData, GATEWAY_TYPE)
            response["db"] = r
            
            
            # Creating SNS Subscription
            snsClient = boto3.client('sns')
            
            subscribeResponse = snsClient.subscribe(
                TopicArn='arn:aws:sns:us-east-1:454143665149:EFR32_RuleNotifications',
                Protocol='email',
                Endpoint=data["userId"],
                ReturnSubscriptionArn=True
            )
            
            setAttributeResponse = snsClient.set_subscription_attributes(
                SubscriptionArn=subscribeResponse['SubscriptionArn'],
                AttributeName='FilterPolicy',
                AttributeValue='{"userId": ["' + data["userId"] +'"]}'
            )
            
            
        elif(data["deviceType"] == SENSOR_TYPE):
            print("Device type is: {}".format(SENSOR_TYPE))
            eui64 = data["eui64"]
            gatewayId = data["gatewayId"]
            
            thingName = "sensor" + "-" + data["eui64"]

            print("Creating thing: {}".format(thingName))
            try:
                r = iot.create_thing(thingName=thingName, thingTypeName=SENSOR_TYPE)
                print("Thing: {} created successfully!".format(thingName))
                r["eui64"] = eui64
                r["sensorName"] = data["sensorName"]
                response["thing"].append(r)
            except botocore.exceptions.ClientError as error:
                print("Error creating the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response['error'] = "Error creating sensor thing"
                return response
        
            print("Attaching the thing with the group: {}".format(gatewayId))

            try:
                r = iot.add_thing_to_thing_group(thingName=thingName, thingGroupName=gatewayId)
                print("Successfully attached the thing: {0} with the group: {1}".format(thingName, gatewayId))
            except botocore.exceptions.ClientError as error:
                print("Error adding the thing: {} to the group: {}".format(thingName, gatewayId))
                print(error.response['Error']['Code'])
                response['error'] = "Error adding sensor thing to group"
                return response
            
            dbData = {}
            dbData["gatewayId"] = gatewayId
            dbData["eui64"] = eui64
            dbData["sensorName"] = data["sensorName"]
            dbData["sensorId"] = "sensor" + "-" + eui64
            dbData["description"] = data["description"]
            dbData["thresholdValues"] = {
                    "highTemp": 105,
                    "lowTemp": 55,
                    "highHumidity": 80,
                    "lowHumidity": 40,
                    "highCO2": 7000,
                    "lowCO2": 1500
            }
            
            r = addToDB(dbData, SENSOR_TYPE)
            response["db"] = r
                
                
    return response

            
            

def checkThingTypes():
    isSensorDevice = False
    isGateway = False
    r = iot.list_thing_types()
    #print(r)
    for thingType in enumerate(r['thingTypes']):
        if(thingType[1]['thingTypeName'] == GATEWAY_TYPE):
            print('Gateway thing type exists')
            isGateway = True
        elif(thingType[1]['thingTypeName'] == SENSOR_TYPE):
            print('Sensor thing exists')
            isSensorDevice = True

    if(not isGateway):
        print("Creating Gateway thing type")
        r = iot.create_thing_type(thingTypeName=GATEWAY_TYPE)
        if(r['ResponseMetadata']['HTTPStatusCode'] == 200):
            print("Successfully created gateway thing type")
        else:
            print("Error Creating gateway thing type")
            print("HTTPResponseCode: "+r['ResponseMetadata']['HTTPStatusCode'])

    if(not isSensorDevice):
        print("Creating sensor thing type")
        r = iot.create_thing_type(thingTypeName=SENSOR_TYPE)
        if(r['ResponseMetadata']['HTTPStatusCode'] == 200):
            print("Successfully created sensor thing type")
        else:
            print("Error Creating gateway thing type")
            print("HTTPResponseCode: "+r['ResponseMetadata']['HTTPStatusCode'])

def createPolicy():
    policyDocument = "{ \"Version\": \"2012-10-17\",\"Statement\": [{ \"Effect\": \"Allow\", \"Action\": \"iot:*\", \"Resource\": \"*\"}]}"
    global policyName
    r = iot.create_policy(policyName=policyName, policyDocument=policyDocument)
    return r

def checkPolicies():
    global policyName
    global isGatewayPolicy
    listPoliciesResponse = iot.list_policies()
    for policy in enumerate(listPoliciesResponse['policies']):
        #print(policy)
        if(policy[1]["policyName"] == policyName):
            isGatewayPolicy = True

    if(isGatewayPolicy):
        print("Gateway Policy Exists")
    else:
        print("Gateway policy does not exist. Creating a new policy")
        r = createPolicy()
        if(r['ResponseMetadata']['HTTPStatusCode'] == 200):
            print("Created new policy successfully")
        else:
            print("Error creating new policy")
            print("Response Code: "+r['ResponseMetadata']['HTTPStatusCode'])
        #print(r)
        response['policy'] = r


def lambda_handler(event, context):
    # TODO implement
    checkPolicies()
    checkThingTypes()
    body = json.loads(event['body'])
    global response
    response = {}
    r = createDevice(body)
    if 'error' in r:
        return {
            'statusCode': 500,
            'body': json.dumps(r)
        }
    else:
        return {
            'statusCode': 200,
            'body': json.dumps(r)
        }
