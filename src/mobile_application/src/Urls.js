// Change the Endpoint below to your AWS API endpoint
export const API_ID = '<AWS API Id>'
export const REGION= '<AWS API region>'
export const STAGE_NAME= '<AWS API deploying stage>'
export const AWS_BASE_URL=`https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}`

export const DELETE_GROWAREA = AWS_BASE_URL + '/deletething';
export const GET_USER= AWS_BASE_URL + '/getuser/';
export const RENAME_GATEWAY_SENSOR=AWS_BASE_URL + '/renamedevice';
export const CREATE_GROWAREA = AWS_BASE_URL + '/creatething';

// Change the Endpoint below to your AWS Embedded endpoint
export const EMBEDDED_BASE_URL = '<AWS Embedded endpoint base URL>';
export const USER_ARN = '<AWS Embedded endpoint User ARN>';
export const APIG_URL = '<AWS Embedded endpoint APIG URL>';
export const TEMPERATURE_DASHBOARD = '<Embedded Temperature dashboard>';
export const HUMIDITY_DASHBOARD = '<Embedded Humidity dashboard>';
export const CO2_DASHBOARD = '<Embedded CO2 dashboard>';
export const PIR_DASHBOARD = '<Embedded PIR dashboard>';
export const ALL_DASHBOARD = '<Embedded ALl properties dashboard>';
