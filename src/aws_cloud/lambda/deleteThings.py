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

def deleteDevice(payload):
    global response
    outputObj = {}
    for data in payload:
        if(data["deviceType"] == GATEWAY_TYPE):
            print("Device type is: {}".format(GATEWAY_TYPE))
            #macAddress = data["macAddress"]
            #groupName = "group-" + GATEWAY_TYPE + "-" + macAddress
            groupName = data["gatewayId"]
            thingName = data["gatewayId"]
            print("Listing associated principals with thing: {}".format(thingName))
            try:
                r = iot.list_thing_principals(thingName=thingName)
            except botocore.exceptions.ClientError as error:
                print("Error listing principals with the thing: {}".format(thingName))
                print(error.response)
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured while listing thing principals"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response
            certificateArn = r['principals'][0]

            print("Detaching policy from the certificate: {}".format(certificateArn))
            try:
                iot.detach_policy(policyName=policyName, target=certificateArn)
                print("Successfully detached policy!")
            except botocore.exceptions.ClientError as error:
                print("Error detaching the policy")
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured detaching policy"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response

            print("Detaching the certificate from the thing: {}".format(thingName))

            try:
                iot.detach_thing_principal(thingName=thingName, principal=certificateArn)
                print("Successfully detached certificate!")
            except botocore.exceptions.ClientError as error:
                print("Error detaching the certificate from the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured detaching the certificate from the thing"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response

            certificateId=certificateArn.split('/')[1]

            print("Updating the certificate: {}".format(certificateArn))  
            try:
                iot.update_certificate(certificateId=certificateId, newStatus='INACTIVE')
                print("Successfully updated certificate to inactive!")
            except botocore.exceptions.ClientError as error:
                print("Error deleting the certificate: {}".format(certificateArn))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured updating the certificate"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response


            print("Deleting the certificate: {}".format(certificateArn))
            
            try:
                iot.delete_certificate(certificateId=certificateId, forceDelete=True)
                print("Successfully deleted certificate!")
            except botocore.exceptions.ClientError as error:
                print("Error deleting the certificate: {}".format(certificateArn))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured deleting the certificate"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response

            print("Deleting thing: {}".format(thingName))
            try:
                r = iot.delete_thing(thingName=thingName)
                print("Successfully deleted the thing...")
            except botocore.exceptions.ClientError as error:
                print("Error deleting the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured deleting the thing"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response

            print("Deleting the group: {}".format(groupName))
            try:
                r = iot.delete_thing_group(thingGroupName=groupName)
                print("Successfully deleted the thing group: {}".format(groupName))
                response["message"] = "Successfully deleted!"
                response["errorCode"]  = 200
            except botocore.exceptions.ClientError as error:
                print("Error deleting the thing group: {}".format(groupName))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured deleting the group"
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response
            
            gateway_id = groupName
            gateway_response=checkGateway(gateway_id)
            if 'Item' in gateway_response:
                delete_gateway_response=deleteGateway(gateway_id)
                if delete_gateway_response['ResponseMetadata']['HTTPStatusCode']==200:
                    outputObj['statusCode']=200
                    outputObj['message']="Gateway deleted successfully"
                    response["db"] = outputObj   
                else:
                    outputObj['statusCode']=500
                    outputObj['message']="Internal server error"
                    response["db"] = outputObj
            else:
                outputObj['statusCode']=200
                outputObj['message']="Gateway not found in database"
                response["db"] = outputObj
            
        elif(data["deviceType"] == SENSOR_TYPE):
            print("Device type is: {}".format(SENSOR_TYPE))
            #macAddress = data["macAddress"]
            groupName = data["gatewayId"]
            #thingName = SENSOR_TYPE + "-" + macAddress
            thingName = data["sensorId"]
            print("Deleting thing: {}".format(thingName))
            try:
                r = iot.delete_thing(thingName=thingName)
                print("Successfully deleted the thing...")
                response["message"] = "Successfully deleted!"
                response["errorCode"] = 200
            except botocore.exceptions.ClientError as error:
                print("Error deleting the thing: {}".format(thingName))
                print(error.response['Error']['Code'])
                response["message"] = "Error Occcured deleting the thing {}".format(thingName)
                response["errorType"] = error.response['Error']['Code']
                response["errorCode"] = 500
                return response
            
            
            gatewayId=groupName
            sensorId=data["sensorId"]
            gateway_response=checkGateway(gatewayId)
            if 'Item' in gateway_response:
                print("Gateway Response: {}".format(gateway_response))
                gateway=gateway_response['Item']
                print("gateway: {}".format(gateway))
                sensors=gateway['sensors']
                print("Sensors: {}".format(sensors))
                newSensors=[]
                for i in sensors:
                    print("in for loop: ")
                    print(i)
                    if i['sensorId']==sensorId:
                        print("found match")
                    else:
                        newSensors.append(i)
                dynamodb_table=getClient()
                table = dynamodb_table.Table('devices')       
                response1 = table.update_item(
                        Key={
                            'gatewayId': gatewayId
                        },
                        UpdateExpression="set #s = :r", 
                        ExpressionAttributeNames={
                        '#s': 'sensors'
                        },
                        ExpressionAttributeValues={
                            ':r': newSensors,
                        },
                        ReturnValues="UPDATED_NEW"
                        )
                print(response1)
                if 'Attributes' in response1:
                    response['errorCode'] = 200
                    response['message'] = 'Successfully deleted!'
                    outputObj['statusCode']=200
                    outputObj['message']="Sensors deleted successfully in dynamodb"
                    response["db"] = outputObj
        
    return response
    
def checkGateway(gatewayId):
    dynamodb_table=getClient()
    table = dynamodb_table.Table('devices')
    response = table.get_item(
        Key={
        'gatewayId':gatewayId
        }
        )
    return response
    
def deleteGateway(gatewayId):
    dynamodb_table=getClient()
    table = dynamodb_table.Table('devices')
    response = table.delete_item(
        Key={
            'gatewayId':gatewayId,
            }
        )
    return response
    
def getClient():
    dynamodb = boto3.client('dynamodb' ,region_name='us-east-2')
    dynamodb_table = boto3.resource('dynamodb')
    return dynamodb_table
    

def lambda_handler(event, context):
    # TODO implement
    print("input from mobile-"+ event['body'])
    print("input from type mobile-" )
    print(type(event['body']))
    body = json.loads(event['body'])
    print(type(body))
    
    ret = deleteDevice(body)
    print("received ret from deleteDevice:")
    print(ret)
    print(ret['errorCode'])
    if (ret['errorCode'] != 200) or (ret['db']['statusCode'] != 200):
        return {
            'statusCode': 500,
            'body': json.dumps(ret)
        }
    else:
        return {
            'statusCode': 200,
            'body': json.dumps(ret)
        }
