import json
import boto3
import botocore

GATEWAY_TYPE = "gateway"
SENSOR_TYPE = "sentimate"

dynamodb = boto3.resource('dynamodb')

deviceTable = dynamodb.Table('devices')

iot = boto3.client('iot-data')

def renameDevice(payload):
    print("payload:")
    print(payload)
    print(type(payload))
    for data in payload:
        if(data["deviceType"] == GATEWAY_TYPE):
            try:
                r = deviceTable.get_item(
                        Key={
                        'gatewayId': data['gatewayId']
                        }
                    )
                item = r['Item']
                print("Original Item: "+str(item))
            except botocore.exceptions.ClientError as error:
                print(error.response['Error']['Code'])
                print("Error getting the gateway record...")
                response["error"] = error.response['Error']['Code']
                response['message'] = "Error getting the gateway record"
                return response
        
            try:
                
                # dbData["sendEmailNotifications"] = True
                # dbData["sendSmsNotifications"] = False
                
                r = deviceTable.update_item(
                    Key={
                        'gatewayId': data['gatewayId']
                    },
                    UpdateExpression='SET gatewayName = :val1, sendEmailNotifications = :val2, sendSmsNotifications = :val3 ',
                    ExpressionAttributeValues={
                        ':val1': data['gatewayName'],
                        ':val2': data['sendEmailNotifications'],
                        ':val3': data['sendSmsNotifications']
                    }
                )
                response["message"] = "Successfully updated gatewayName"
                
                iotResponse = iot.publish(
                    topic='gateway/update',
                    qos=1,
                    payload=json.dumps(payload)
                )
                
                return response
            except botocore.exceptions.ClientError as error:
                print(error.response['Error']['Code'])
                print("Error updating gateway record in devices table...")
                response['message'] = "Error updating gateway record"
                response['error'] = error.response['Error']['Code']
                return response
                
        elif(data["deviceType"] == SENSOR_TYPE):
            try:
                r = deviceTable.get_item(
                        Key={
                        'gatewayId': data['gatewayId']
                        }
                    )
                item = r['Item']
                print("Original Item: "+str(item))
            except botocore.exceptions.ClientError as error:
                print(error.response['Error']['Code'])
                print("Error getting the gateway record...")
                response["error"] = error.response['Error']['Code']
                response['message'] = "Error getting the gateway record"
                return response
        
            for sensor in item['sensors']:
                if sensor['sensorId'] == data['sensorId']:
                    print("match found")
                    sensor['sensorName'] = data['sensorName']
                    if 'thresholdValues' in data:
                        print("thresholdValues found")
                        for key, value in data['thresholdValues'].items():
                            print(key)
                            sensor['thresholdValues'][key] = value
                
            try:
                r = deviceTable.update_item(
                    Key={
                        'gatewayId': data['gatewayId']
                    },
                    UpdateExpression='SET sensors = :val1',
                    ExpressionAttributeValues={
                        ':val1': item['sensors']
                    }
                )
                response["message"] = "Successfully updated sensorName"
                
                iotResponse = iot.publish(
                    topic='gateway/update',
                    qos=1,
                    payload=json.dumps(payload)
                )
                
                return response
            except botocore.exceptions.ClientError as error:
                print(error.response['Error']['Code'])
                print("Error updating gateway record in devices table...")
                response['message'] = "Error updating sensorName"
                response['error'] = error.response['Error']['Code']
                return response

def lambda_handler(event, context):
    # TODO implement
    print(event)
    print(type(event))
    #event = str(event)
    body = json.loads(event['body'])
    #body = event
    global response
    response = {}
    r = renameDevice(body)
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