import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize the Twilio client
const twilioClient = Twilio(accountSid, authToken);

export default twilioClient;
