import json
import boto3
from botocore.exceptions import ClientError


# defaultThresholdValues =  {
#         "highCO2": 7000,
#         "highHumidity": 80,
#         "highTemp": 105,
#         "lowCO2": 1500,
#         "lowHumidity": 40,
#         "lowTemp": 55
#       }



def get_thresholdValues(gatewayDetails, sensorId):
    
    if 'sensors' in gatewayDetails:
        for sensor in gatewayDetails['sensors']:
            if sensorId == sensor['sensorId'] and 'thresholdValues' in sensor:
                return sensor['thresholdValues']
    return None


def get_gatewayDetails(gatewayId):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('devices')

    try:
        response = table.get_item(Key={'gatewayId': gatewayId})
        print(response['Item'])
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        return response['Item']


def get_userId(gatewayDetails):

    if 'userId' in gatewayDetails:
        return gatewayDetails['userId']
    else:
        return None


def lambda_handler(event, context):
    
    print(event)
    
    jsonDump = json.dumps(event)
    metric = "[metric]"
    messageString = ""
    value = -100
    threshold = 0
    PIRthreshold = 0
    snsArn='arn:aws:sns:us-east-1:454143665149:EFR32_RuleNotifications'
    gatewayId = event['gatewayId']
    
    gatewayDetails = get_gatewayDetails(gatewayId)
    
    isEmailNotificationEnabled = gatewayDetails['sendEmailNotifications']
    isSmsNotificationEnabled = gatewayDetails['sendSmsNotifications']
    
    
    if isEmailNotificationEnabled is True or isSmsNotificationEnabled is True:
    
        userId = get_userId(gatewayDetails)
        sensorName=event['sensorName']
        
        print('User is ' + userId);
        
        thresholdValues = get_thresholdValues(gatewayDetails, event['sensorId'])
        
        if "temperature" in jsonDump:
            metric = "temperature"
            value = event['temperature']
            # if value < 55 or value > 105:
            if value < thresholdValues['lowTemp'] or value > thresholdValues['highTemp']:
                print("Temperature Data : " + str(value))
                threshold = 1
        elif "humidity" in jsonDump:
            metric = "humidity(%)"
            value = event['humidity']
            # if value < 40 or value > 80:
            if value < thresholdValues['lowHumidity'] or value > thresholdValues['highHumidity']:
                print("Humidity Data : " + str(value))
                threshold = 1
        elif "CO2" in jsonDump:
            metric = "CO2"
            value = event['CO2']
            # if value < 1500 or value > 7000:
            #if value < thresholdValues['lowCO2'] or value > thresholdValues['highCO2']:
                #print("CO2 Data : " + str(value))
                #threshold = 1
        elif "PIR" in jsonDump:
            metric = "PIR"
            value = event['PIR']
            if value == 1:
                print("PIR Data : " + str(value))
                PIRthreshold = 1
        else:
            print("Invalid")
        
        user_pool_id='us-east-1_3sd9uENST'
        cognitoClient = boto3.client('cognito-idp')
        phoneNumber = ""
 
        response = cognitoClient.list_users(
            UserPoolId=user_pool_id,
            Filter='email = "' + userId + '"'
            )

        print(response)

        for user in response['Users']:
            for attr in user['Attributes']:
                if attr['Name'] == 'phone_number':
                    phoneNumber = attr['Value']
                    print(phoneNumber)

        if PIRthreshold == 1:
            snsClient = boto3.client('sns', region_name='us-east-1')
            
            if isEmailNotificationEnabled is True:
                print("Sending Email Notification")
                messageString = 'Dear User,\nMotion has been detected in your ' + sensorName
                responseEmail = snsClient.publish(
                    TopicArn=snsArn,
                    Message=messageString,
                    Subject='EFR32 RULE NOTIFICATION',
                    MessageStructure='String',
                    MessageAttributes={
                        'userId': {
                            'DataType': 'String',
                            'StringValue': userId
                        }
                    }
                )
            
            if isSmsNotificationEnabled is True:
                print("Sending SMS Notification")
                messageString = 'EFR32 RULE NOTIFICATION\nDear User,\nMotion has been detected in your ' + sensorName
                response = snsClient.set_sms_attributes(
                attributes={
                    'DefaultSMSType': 'Transactional'
                })
            
                responseSMS = snsClient.publish(
                    #TopicArn=snsArn,
                    Message=messageString,
                    PhoneNumber=phoneNumber,
                )
                
                print(responseSMS)
            
        if threshold == 1:
            snsClient = boto3.client('sns', region_name='us-east-1')
            
            if isEmailNotificationEnabled is True:
                print("Sending Email Notification")
                messageString = 'Dear User,\nThe ' + metric + ' of your '  + sensorName +' is ' + str(value) + ' which is outside threshold range'
                responseEmail = snsClient.publish(
                    TopicArn=snsArn,
                    Message=messageString,
                    Subject='EFR32 RULE NOTIFICATION',
                    MessageStructure='String',
                    MessageAttributes={
                        'userId': {
                            'DataType': 'String',
                            'StringValue': userId
                        }
                    }
                )
                
            if isSmsNotificationEnabled is True:
                print("Sending SMS Notification")
                messageString = 'EFR32 RULE NOTIFICATION\nDear User,\nThe ' + metric + ' of your '  + sensorName +' is ' + str(value) + ' which is outside threshold range'
                response = snsClient.set_sms_attributes(
                attributes={
                    'DefaultSMSType': 'Transactional'
                })
                
                responseSMS = snsClient.publish(
                    #TopicArn=snsArn,
                    Message=messageString,
                    PhoneNumber=phoneNumber,
                )
        
        return {
            'statusCode': 200,
            'body': messageString
        }