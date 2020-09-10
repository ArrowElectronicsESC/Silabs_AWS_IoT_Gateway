import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
import json
import decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)
        
        
def lambda_handler(event, context):
    
    userId=event['pathParameters']['userId']
    print(userId)
    
    outputObj={}
   
    try:
        dynamodb_table=getClient()
        table = dynamodb_table.Table('devices')
        response = table.scan(
            FilterExpression=Key("userId").eq(userId)
         )
        #print(response);
        if response['ResponseMetadata']['HTTPStatusCode']==200:
            output=createResponseObject(response['Items'])
            outputObj['statusCode']=200
            outputObj['body']=json.dumps(output, cls=DecimalEncoder)
            return outputObj
    except ClientError as error:
        outputObj['statusCode']=500
        outputObj['body']=error
        return outputObj

def createResponseObject(result):
    obj={}
    gatewayList=[];
    sensorsList=[];

    for item in result:
        sensors=item['sensors']
        item.pop('sensors')
        gatewayList.append(item)
        if sensors:
            for sensor in sensors:
                sensorobj={}
                sensorobj['deviceUId']=sensor['eui64']
                sensorobj['device_type']='sentimate'
                sensorobj['device_name']=sensor['sensorName']   
                sensorobj['eui64']=sensor['eui64']
                sensorobj['sensorId']=sensor['sensorId']
                sensorobj['gatewayId']=item['gatewayId']
                sensorobj['thresholdValues'] = sensor['thresholdValues']
                sensorsList.append(sensorobj)
    obj['gateways']=gatewayList
    obj['sensors']=sensorsList
    return obj
        
def getClient():
    dynamodb = boto3.client('dynamodb' ,region_name='us-east-2')
    dynamodb_table = boto3.resource('dynamodb')
    return dynamodb_table